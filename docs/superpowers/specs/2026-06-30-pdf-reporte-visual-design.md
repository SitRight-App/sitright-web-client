# PDF de reporte: rediseño visual (vector, sin fuentes)

Fecha: 2026-06-30
Repo: `sitright-web-client`
Feature: `session-history` (`lib/sessionPdf.ts`)

## 1. Contexto y problema

El PDF actual (`buildSessionPdf`) se ve tosco y los ángulos no se aprecian:
- **Figuras rasterizadas:** se generan con `svgToPng` (SVG → canvas → PNG). A 50 mm,
  los marcadores de ángulo (líneas finas + texto de 9 px) se pierden → "no se ven".
  La imagen rasterizada además se ve áspera.
- **Layout plano:** resumen y distribución como viñetas de texto; tabla por zona en
  texto monoespaciado. Poco visual.
- **Cita fuentes:** la línea "Fuentes: …" no debe ir.

## 2. Objetivos

1. **Todo en vector con jsPDF** (líneas, círculos, rectángulos, texto a color): nítido
   a cualquier tamaño, sin rasterizar SVG.
2. **Ángulos claros**: dos **perfiles de columna en vector** lado a lado, "Correcta"
   (recta) vs "Tu sesión" (inclinada en cada zona por su ángulo), con los **grados en
   grande** por zona.
3. **Más visual**: score a color, **barra de distribución apilada a color**, **tarjetas
   por zona** tintadas según estado.
4. **Sin fuentes**: quitar la línea "Fuentes:".

## 3. Fuera de alcance (YAGNI)

- La sección "Postura" en pantalla NO cambia (sigue con las figuras SVG, que ahí sí se
  ven). Solo cambia el PDF.
- Los wrappers `data-pdf-figure` en `PostureComparison` quedan sin uso por el PDF pero
  se dejan (inertes); no se tocan en este alcance.
- No cambia `SessionPdfData` ni el cableado de la página (ya pasa todos los datos).

## 4. Glosario y constraints heredados

- Lenguaje del glosario (`sessionCopy.METRIC_LABELS`) en todo lo de cara al usuario;
  prohibido "tramo máximo", "pico", "episodios", "% desviado", "ángulo promedio".
- `POSTURE_LEGEND` (leyenda al pie del detalle por zona) se conserva.
- Recomendaciones desde `postureGuidance.recommendationsFor(dominant)` — se usan los
  `tips`; los `sources` **ya no se muestran**.
- Ángulos ilustrativos (magnitud, no a escala). Texto secundario legible.

## 5. Datos (sin cambios)

`SessionPdfData`: `sessionId`, `dateLabel`, `totalMinutes`, `adequatePct` (0–100),
`dominantDeviation`, `zones` (cada `ZoneDeviation` con `deviated_pct`, `avg_angle_deg`,
`peak_angle_deg`, `longest_streak_min`, `minutes_in_deviation`, `episodes`),
`calibrated`, `countsByClass`, `pauses`.

Bandas de presentación por zona (ya en `zoneTone.toneFor`): `<5 ok`, `<25 leve`,
`>=25 marcada`.

## 6. Diseño

### 6.1 Paleta (RGB para jsPDF)

| Uso | RGB |
|---|---|
| moss (ok / Correcta / score ≥70) | `45, 74, 54` |
| terracotta-soft (leve / Encorvado) | `232, 166, 133` |
| terracotta (marcada / Reclinado / score <50) | `200, 98, 60` |
| amber (score 50–69) | `196, 128, 20` |
| ink (texto principal) | `44, 49, 43` |
| ink-soft (secundario) | `74, 82, 73` |
| sand / línea | `214, 211, 203` |
| tinte verde (fondo zona ok) | `235, 240, 236` |
| tinte terracota (fondo zona desviada) | `250, 240, 235` |

Helpers puros (testeables):
- `scoreLevel(pct: number): 'good' | 'mid' | 'low'` → `>=70 good`, `>=50 mid`, else `low`.
- `toneColor(tone: 'ok'|'leve'|'marcada'): [number, number, number]` (moss / terracotta-soft / terracotta).
- `buildDistribution(countsByClass)` se conserva tal cual (ya testeado).

### 6.2 Layout del PDF (A4, mm) — todo vector

Se mantiene el guard de paginación `ensure(h)` y el pie en todas las páginas.

1. **Encabezado**: "SitRight" (moss, bold) + "Reporte de sesión postural" + `dateLabel`.
   Regla horizontal a color sand.

2. **Franja de resumen**:
   - **Score**: número grande (p. ej. 22 pt) en el color de `scoreLevel(adequatePct)` +
     etiqueta "% de postura correcta" (texto del glosario `METRIC_LABELS.adequatePct`).
   - **Cifras** (a la derecha del score): `METRIC_LABELS.totalMinutes`, 
     `METRIC_LABELS.dominant` (en palabras con `dominantPlain`), `METRIC_LABELS.pauses`.
   - **Barra de distribución**: un rectángulo apilado de ancho fijo, segmentos
     coloreados por clase (`buildDistribution`): Correcta=moss, Encorvado=terracotta-soft,
     Reclinado=terracotta; ancho de cada segmento proporcional al %. Debajo, leyenda:
     punto de color + "Correcta 82%", etc. Si `buildDistribution` está vacío, mostrar
     "Sin datos suficientes de distribución".

3. **Cómo te sentaste hoy** (perfiles de columna en vector): un helper
   `drawSpineProfile(pdf, { x, y, w, h, zones, mode })` dibuja:
   - Un círculo (cabeza) arriba + una **polilínea** por 4 puntos (cervical, dorsal,
     lumbar, cadera) de arriba a abajo.
   - **mode `ideal`**: recta vertical; 3 nodos en moss; rótulo "Postura correcta".
   - **mode `session`**: cada nodo superior desplazado hacia adelante de forma
     ilustrativa según `avg_angle_deg` de su zona — offset horizontal en mm =
     `min(avg_angle_deg, 30) * 0.6` (tope ~18 mm para que no se deforme); nodos
     coloreados con `toneColor(toneFor(deviated_pct))`; la cabeza sigue a la cervical.
     Rótulo "Tu sesión".
   - Junto a cada zona desviada (en "Tu sesión"), el **grado en grande** (p. ej. 12 pt,
     color del tono): "Cuello 22°", "Espalda media 12°", "Espalda baja 0°" usando
     `ZONE_LABELS`. Las zonas en rango muestran "0°"/"en rango" tenue.
   - Las dos figuras lado a lado (ideal a la izquierda, session a la derecha) con sus
     rótulos debajo.
   - Sin calibración: omitir esta sección (no hay ángulos) y mostrar el aviso "El
     chaleco no estaba calibrado: no hay detalle por zona".

4. **Detalle por zona** (solo si `calibrated`): por zona (peor primero), una **tarjeta**
   `pdf.roundedRect` con relleno tintado según estado (verde tenue si en rango, terracota
   tenue si desviada) y borde sand. Contenido:
   - Nombre de zona (`ZONE_LABELS`) + badge de estado ("En rango" moss / "Atención"
     terracotta).
   - Métricas en glosario: `METRIC_LABELS.deviatedPct` = `N%`,
     `METRIC_LABELS.avgAngle` = `N°`, `METRIC_LABELS.longestStreak` = `hasta N min seguidos`.
   - Debajo de las tarjetas, la **leyenda** `POSTURE_LEGEND` (8 pt, ink-soft).

5. **Recomendaciones**: título + los `tips` de `recommendationsFor(dominant)` como
   viñetas (punto de color). **Sin** la línea "Fuentes:".

6. **Pie** en todas las páginas: "Prediagnóstico orientativo; no reemplaza la evaluación
   de un profesional de salud."

### 6.3 Eliminaciones en `sessionPdf.ts`

- Borrar `svgToPng` y `figurePng` (ya no se rasteriza).
- Borrar `ZONE_TABLE_HEADERS` y `buildZoneTableRows` (la tabla de texto se reemplaza por
  tarjetas; el detalle se lee de `zones` con `METRIC_LABELS`).
- Quitar el uso de `guide.sources` y la línea "Fuentes:".
- `recommendationsFor` se sigue importando (para `tips`).

## 7. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/features/session-history/lib/sessionPdf.ts` | reescribe `buildSessionPdf` en vector; agrega `scoreLevel`/`toneColor`/`drawSpineProfile`/dibujo de barra y tarjetas; elimina rasterización, tabla de texto y "Fuentes" |
| `src/features/session-history/lib/sessionPdf.test.ts` | quita tests de `ZONE_TABLE_HEADERS`/`buildZoneTableRows`; conserva `buildDistribution`; agrega test de `scoreLevel` y `toneColor` |

## 8. Pruebas

Puras (las únicas testeables sin canvas/jsPDF real):
- `buildDistribution`: excluye `indeterminate`, suma ~100 (se conserva).
- `scoreLevel`: `70→good`, `69→mid`, `50→mid`, `49→low`, `0→low`.
- `toneColor`: `ok→[45,74,54]`, `leve→[232,166,133]`, `marcada→[200,98,60]`.
- `buildSessionPdf` no se testea unitariamente (depende de jsPDF/DOM); se valida con el
  humo manual.

Humo manual (no automatizable): generar el PDF de una sesión y confirmar: score a color,
barra de distribución a color, dos perfiles de columna con los grados visibles, tarjetas
por zona tintadas, recomendaciones sin "Fuentes".

## 9. Casos borde

- Sin calibración: omite perfiles y detalle por zona; mantiene encabezado, score
  (con `adequatePct`), distribución y recomendaciones; muestra el aviso de no calibrado.
- `dominant = null`/adecuada: perfiles rectos/alineados; recomendaciones generales.
- `countsByClass` vacío o solo `indeterminate`: la barra muestra el aviso "sin datos".
- Contenido largo: el guard `ensure` evita recortes (las figuras/tarjetas también se
  miden antes de dibujar).
