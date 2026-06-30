# PDF de reporte: narrativa clara + cuerpo humano en vector

Fecha: 2026-06-30
Repo: `sitright-web-client`
Feature: `session-history`

## 1. Contexto y problema (análisis del PDF actual)

El PDF vectorial actual organiza mal la información para un usuario real (trabajador) y
para la asesora (prediagnóstico):

1. **Triple repetición**: el ángulo/% por zona aparece junto a las "líneas", otra vez en
   las tarjetas "Detalle por zona", y la barra de distribución es una tercera vista de
   "cuánto te desviaste". Satura, no narra.
2. **Las "líneas" son abstractas**: nadie reconoce su postura en dos líneas inclinadas.
   No comunica "así te sentaste mal". Falta el **cuerpo humano** (lo que la asesora quiere
   para el prediagnóstico).
3. **Sin veredicto**: no hay una frase clara de "qué hiciste bien / mal" (la pantalla sí
   la tiene; el PDF no).
4. **Métricas como planilla**: las tarjetas vuelcan datos crudos, no hallazgos.
5. **Jerarquía plana**: todo pesa igual; falta el flujo titular → evidencia → acción.

## 2. Objetivos

1. **Flujo narrativo**: (a) veredicto + score, (b) figura humana correcta vs. tuya,
   (c) qué pasó en cada zona en lenguaje claro, (d) qué hacer.
2. **Cuerpo humano sentado en vector** (jsPDF), con el **arco de ángulo sobre la zona**
   afectada — reconocible, nítido, prediagnóstico.
3. **Veredicto en lenguaje claro**, reutilizando la lógica de la pantalla (helper
   compartido, sin duplicar).
4. **Eliminar la redundancia**: la distribución pasa a ser el *desglose del score*; el
   ángulo vive en la figura + una sola línea por zona.

## 3. Fuera de alcance (YAGNI)

- La sección "Postura" en pantalla no se rediseña; solo se refactoriza su veredicto para
  usar el helper compartido (mismo texto).
- Sin cambios en `SessionPdfData` ni en el cableado de la página.
- Ángulos ilustrativos (magnitud, no a escala).

## 4. Glosario y constraints

- Lenguaje del glosario (`sessionCopy.METRIC_LABELS`/`streakLabel`); PROHIBIDO mostrar
  "tramo máximo", "pico", "episodios", "% desviado", "ángulo promedio".
- `streakLabel(min)` (ya existe): "menos de 1 min" / "hasta 1 min seguido" /
  "hasta N min seguidos".
- **jsPDF usa fuentes WinAnsi**: NO usar glifos fuera de WinAnsi (✓, ⚠, ≈, →). Para el
  estado por zona usar un **punto de color** dibujado (círculo), no un checkmark. `°` y
  `·` sí están en WinAnsi.
- Recomendaciones desde `recommendationsFor(dominant).tips`; sin "Fuentes:".
- Paleta RGB (ya en `sessionPdf`): moss `45,74,54`; terracotta-soft `232,166,133`;
  terracotta `200,98,60`; amber `196,128,20`; ink `44,49,43`; ink-soft `74,82,73`;
  sand `214,211,203`; tinte ok `235,240,236`; tinte desviado `250,240,235`.

## 5. Diseño

### 5.1 Helper compartido `verdictSentence`

`src/features/session-history/lib/sessionCopy.ts` (NUEVO export). Centraliza la frase que
hoy calcula `PostureComparison` inline, para que pantalla y PDF la compartan.

```ts
verdictSentence(opts: {
  adequatePct: number
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
}): string
```
Reglas (texto IDÉNTICO al actual de pantalla, para no romper su test):
- `!calibrated` → `Mantuviste una postura correcta el ${adequatePct}% del tiempo.`
- calibrado y alguna zona desviada (peor = mayor `deviated_pct`) →
  `Mantuviste una postura correcta el ${adequatePct}% del tiempo. Tu mayor desafío fue
  ${ZONE_LABELS[peor].toLowerCase()}, con desviación el ${Math.round(peor.deviated_pct)}%
  del tiempo.`
- calibrado y todo en rango →
  `Tu postura se mantuvo adecuada la mayor parte de la sesión. Buen trabajo.`

`PostureComparison.tsx` se refactoriza para usar `verdictSentence(...)` en lugar de su
cómputo inline del `verdict` (mantiene `ordered`/`worst`/`anyDeviated` para los marcadores
y el tono de sección).

### 5.2 Figura humana sentada en vector — `drawSeatedBody`

Reemplaza a `drawSpine`. Dibuja una persona sentada de perfil con primitivas jsPDF dentro
de un recuadro `(fx, fy, fw, fh)`, modo `'ideal' | 'session'`:
- **Silla**: asiento (rect) + respaldo (línea vertical) + patas (líneas), en sand tenue.
- **Pierna**: muslo (rect redondeado horizontal sobre el asiento) + pierna baja (rect
  vertical al frente).
- **Tronco**: del eje de cadera hacia arriba hasta el hombro (línea de espalda gruesa +
  una línea de pecho/frente para dar volumen). En `session`, el tronco se inclina hacia
  adelante/atrás según la desviación dominante (offset ilustrativo `min(avg,30)*0.6`,
  tope ~18 mm); la cabeza sigue al cuello.
- **Cabeza**: círculo sobre el cuello.
- **Zonas**: 3 nodos sobre la espalda (cervical arriba, dorsal medio, lumbar abajo)
  coloreados con `toneColor(toneFor(deviated_pct))`; en `ideal` todos moss.
- **Arco de ángulo** (solo `session`, zonas desviadas): sobre la zona, una línea neutra +
  la línea real rotada por el ángulo + un arco + el número de grados (≥10 pt), en el color
  del tono. Tamaño legible (no como los marcadores chicos anteriores).

Dos figuras lado a lado: `ideal` (izquierda, "Postura correcta") y `session` (derecha,
"Tu sesión"), con sus rótulos debajo. Sin la "columna de ángulos" separada (se elimina).

### 5.3 Layout del PDF (A4, mm) — orden narrativo

Mantiene `ensure(h)` (paginación) y el pie en todas las páginas.

1. **Encabezado**: "SitRight" + "Reporte de sesión postural" + `dateLabel`. Regla sand.

2. **Cómo te fue** (titular):
   - **Veredicto** (`verdictSentence`), envuelto con `splitTextToSize`, en ink, ~11 pt.
   - **Score grande** (`${adequatePct}%`, color por `scoreLevel`) + etiqueta
     `METRIC_LABELS.adequatePct`.
   - **Barra fina de distribución** (desglose del score): `buildDistribution`, segmentos
     moss/terracotta-soft/terracotta, con leyenda de puntos. Si vacía: aviso.
   - **Chips**: `METRIC_LABELS.totalMinutes`=`N min` y `METRIC_LABELS.pauses`=`N`.

3. **Cómo te sentaste hoy** (solo `calibrated`): las dos figuras `drawSeatedBody`
   (ideal vs session) con rótulos. Sin calibración: aviso "El chaleco no estaba calibrado…".

4. **Qué pasó en cada zona** (solo `calibrated`): por zona (peor primero) una **línea**
   con un **punto de color** (moss si en rango, terracota si desviada) + texto:
   - en rango → `${ZONE_LABELS[z]} — en rango`
   - desviada → `${ZONE_LABELS[z]} — se inclinó ${Math.round(avg)}° el
     ${Math.round(deviated_pct)}% del tiempo, ${streakLabel(longest_streak_min)}`
   Debajo, la **leyenda** `POSTURE_LEGEND` (envuelta). (Sin tarjetas tintadas densas ni la
   tabla; una línea clara por zona.)

5. **Qué hacer**: título + `recommendationsFor(dominant).tips` como viñetas (punto de
   color), envueltas. Sin "Fuentes:".

6. **Pie** en todas las páginas: "Prediagnóstico orientativo; no reemplaza la evaluación
   de un profesional de salud."

### 5.4 Eliminaciones en `sessionPdf.ts`

- Borrar `drawSpine` (lo reemplaza `drawSeatedBody`).
- Quitar la "columna de ángulos" junto a las figuras y las **tarjetas** de detalle por
  zona (se reemplazan por las líneas del §5.3.4).
- `buildDistribution`, `scoreLevel`, `toneColor`, `dominantPlain`, `DIST_LABELS` se
  conservan.

## 6. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/features/session-history/lib/sessionCopy.ts` | + `verdictSentence` (importa `ZONE_LABELS`/`ZONE_ORDER`/`toneFor` de `./zoneTone` y los tipos) |
| `src/features/session-history/lib/sessionCopy.test.ts` | + test de `verdictSentence` (3 ramas) |
| `src/features/session-history/components/PostureComparison.tsx` | usa `verdictSentence` (quita el cómputo inline del verdict) |
| `src/features/session-history/lib/sessionPdf.ts` | reescribe `buildSessionPdf` (narrativa + `drawSeatedBody`); usa `verdictSentence`/`streakLabel`; elimina `drawSpine`, la columna de ángulos y las tarjetas |

## 7. Pruebas

Puras (testeables):
- `verdictSentence`: `!calibrated` → frase corta; calibrado con desviación → menciona la
  peor zona y su %; calibrado todo en rango → frase positiva. (En `sessionCopy.test.ts`.)
- Se conservan: `buildDistribution`, `scoreLevel`, `toneColor`, `streakLabel` (ya
  cubiertos), y el test de `PostureComparison` sigue verde (verdict idéntico).
- `buildSessionPdf`/`drawSeatedBody` no se testean unitariamente (jsPDF/DOM); humo manual.

Humo manual: generar un PDF de sesión calibrada y confirmar: veredicto arriba; score +
barra de distribución; **dos cuerpos sentados** (recto vs inclinado) con el ángulo sobre la
zona; una línea clara por zona; recomendaciones sin "Fuentes"; sin glifos rotos (✓/⚠).

## 8. Casos borde

- Sin calibración: omite figuras + líneas por zona; mantiene encabezado, veredicto corto,
  score, distribución, recomendaciones; muestra el aviso de no calibrado.
- `dominant`/adecuada: cuerpos rectos/alineados; veredicto positivo; recomendaciones
  generales.
- `countsByClass` vacío: la barra muestra el aviso "sin datos".
- Contenido largo: `ensure` evita recortes (figuras, líneas y viñetas se miden antes).
