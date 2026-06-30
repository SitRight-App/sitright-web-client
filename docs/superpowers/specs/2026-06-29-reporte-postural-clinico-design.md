# Reporte postural clínico: ángulos por zona, más información y recomendaciones con evidencia

Fecha: 2026-06-29
Repo: `sitright-web-client`
Feature: `session-history` (+ `shared/ui`)

## 1. Contexto y problema

La sección "Postura" del detalle de sesión y el PDF actuales quedaron cortos:
- **Poca información:** el PDF omite el resumen de la sesión, la distribución de
  posturas y el detalle por zona que sí tiene la pantalla.
- **Términos difíciles:** "Áng. prom.", "Pico", "Episodios", "tramo máximo" no le
  dicen nada al trabajador.
- **Mala distribución** del contenido en el PDF.
- **Recomendaciones sin respaldo:** las acciones correctivas eran genéricas e
  inventadas, no basadas en guías médicas/ergonómicas (pedido explícito del usuario).
- **Falta descriptividad clínica:** en las fichas posturales se **dibuja el ángulo**
  (intersección de dos líneas) en cada zona para mostrar lo correcto vs. lo real.

## 2. Objetivos

1. Figuras con el **ángulo dibujado por zona** (estilo ficha postural): correcto
   (neutro) vs. real, descriptivo.
2. **Más información, mejor distribuida:** resumen de sesión, distribución de
   posturas y detalle por zona ampliado — en pantalla y en el PDF.
3. **Lenguaje entendible:** cada dato se muestra en palabras llanas; el término
   clínico (grados) solo en una leyenda, para el médico.
4. **Recomendaciones basadas en evidencia**, específicas por desviación, citando las
   fuentes.

## 3. Fuera de alcance (YAGNI)

- No se cambia el feature `recommendations` (en pantalla, backend-driven). Las
  recomendaciones con evidencia se aplican al **PDF** (y quedan disponibles para la
  sección si luego se quiere).
- Los ángulos de las figuras son **ilustrativos/representativos** (magnitud), no un
  trazado biomecánico a escala (acordado con el usuario).
- No se toca el dashboard en vivo (clase, no ángulos).

## 4. Glosario (REQUISITO — cada número va con su versión entendible)

Mapa canónico dato interno → texto al usuario. Se usa idéntico en la sección y el PDF.

| Dato interno (`ZoneDeviation` / summary) | Texto al usuario |
|---|---|
| `deviated_pct` | "% del tiempo inclinada" |
| `minutes_in_deviation` | "Tiempo inclinada en total" |
| `longest_streak_min` | "Lo más que estuvo inclinada de corrido" (compacto: "hasta N min seguidos") |
| `avg_angle_deg` | "Cuánto se inclinó (promedio)" |
| `peak_angle_deg` | "Lo más que se inclinó" |
| `episodes` | "Veces que se desvió" |
| `adequate_percentage` | "% de postura correcta" |
| `total_minutes` | "Tiempo de uso" |
| `dominant_deviation` | "Desviación más frecuente" (en palabras: Encorvado / Reclinado) |
| pausas (derivado) | "Pausas" (tramos de >2 min sin datos del chaleco) |

Leyenda al pie (para el médico): *"Inclinación = ángulo respecto a la posición
neutra de calibración. ‘De corrido’ = tiempo continuo sin corregir."*

Prohibido en la UI/PDF de cara al usuario: "ángulo promedio", "pico", "episodios",
"tramo máximo", "% desviado", `forward_slouch`/`excessive_recline` crudos.

## 5. Datos disponibles

Por zona (`ZoneDeviation`): `deviated_pct`, `minutes_in_deviation`, `avg_angle_deg`,
`peak_angle_deg`, `longest_streak_min`, `episodes`.
`SessionSummary`: `adequate_percentage`, `dominant_deviation`, `total_minutes`,
`counts_by_class` (para la distribución).
La página ya deriva pausas (`deriveStats().pauseEstimate`).

Bandas de presentación por zona (ya en `lib/zoneTone`): `<5 ok`, `<25 leve`,
`>=25 marcada`.

## 6. Diseño

### 6.1 `SeatedFigure` — marcadores de ángulo (opt-in)

`src/shared/ui/SeatedFigure.tsx`

- Nuevo prop opcional `angleMarkers?: Partial<Record<'cervical'|'dorsal'|'lumbar',
  { deg: number; tone: FigureTone }>>`. Por defecto ausente → comportamiento actual
  intacto (dashboard y demás usos no se afectan).
- Para cada zona presente, en la posición del nodo `NODE[zone]` se dibuja un
  marcador goniométrico:
  - **Línea neutra**: desde el nodo hacia "arriba" (dirección neutra), longitud ~22.
  - **Línea real**: mismo origen, rotada `deg` grados hacia el frente (lado que mira
    la figura).
  - **Arco** entre ambas líneas (radio ~12) + etiqueta `"{deg}°"`, con el color del
    `tone` (reusa `CALLOUT_TEXT`/`TONE`).
  - Si `deg === 0` (figura de referencia): neutra y real coinciden → solo la línea
    neutra y etiqueta "0°", en tono tenue.
- Se anota solo en las zonas pasadas (las desviadas en "Tu sesión"; las mismas a 0°
  en "Correcta"). Si todo está en rango (adecuada), no se pasan marcadores.
- Legibilidad: el marcador convive con el nodo de color existente; mantener trazos
  finos para no saturar las figuras chicas (180 px en pantalla, 50 mm en PDF).

### 6.2 `PostureComparison` (sección) — rediseño

`src/features/session-history/components/PostureComparison.tsx`

Props (ampliadas):
```ts
interface PostureComparisonProps {
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
  adequatePct: number
  dominantDeviation: string | null
  totalMinutes: number
  countsByClass: Record<string, number>
  pauses: number
}
```

Estructura (de arriba a abajo):
1. Eyebrow "Postura" + título "Cómo te sentaste hoy".
2. **Dos figuras** (`SeatedFigure` con `angleMarkers`): "Postura correcta" (referencia,
   marcadores a 0° en las zonas que el usuario desvió) y "Tu sesión" (marcadores con
   el `avg_angle_deg` y tono por zona). Mantienen `lean`/`headTilt` actuales.
3. **Frase de lectura** (plano), igual que hoy pero con la desviación en palabras.
4. **Resumen** (fila/grid de cifras): "Tiempo de uso", "% de postura correcta",
   "Desviación más frecuente" (palabras), "Pausas".
5. **Distribución de posturas**: barra segmentada con leyenda (mismo patrón que la
   sección "Distribución" del reporte) con % por clase (Correcta / Encorvado /
   Reclinado), calculada desde `countsByClass` excluyendo `indeterminate`.
6. **Detalle por zona ampliado** (solo si `calibrated`): por zona (peor primero),
   estado (En rango / Atención) + las cifras con los textos del **glosario §4**:
   "% del tiempo inclinada", "Cuánto se inclinó (promedio)", "Lo más que estuvo
   inclinada de corrido". (Se omiten `peak`/`episodes` en pantalla para no saturar;
   van en el PDF.)
7. **Definiciones + leyenda + disclaimer**: Encorvado/Reclinado, la leyenda del §4,
   y "prediagnóstico orientativo; no reemplaza la evaluación de un profesional".

Para mantener archivos enfocados, se extraen piezas presentacionales:
- `ZoneDetailList` (el detalle por zona con textos del glosario).
- La barra de distribución puede reusar el patrón ya existente en el reporte (sección
  Distribución) o un pequeño componente local `PostureDistributionBar`.

Caso **sin calibración**: figuras sin marcadores, sin detalle por zona; se muestran
Resumen + Distribución (que no dependen del ángulo) + aviso "Calibra el chaleco para
ver el detalle por zona".

### 6.3 Recomendaciones con evidencia

`src/features/session-history/lib/postureGuidance.ts` (NUEVO) — reemplaza el `RECS`
genérico de `sessionPdf.ts`. Devuelve, por desviación dominante, acciones concretas
basadas en guías, más una lista de fuentes.

Contenido (citado en §8):

**Encorvado / cabeza adelantada (`forward_slouch`):**
- "Sube la pantalla: el borde superior a la altura de tus ojos (o un poco más abajo),
  a un brazo de distancia, para no inclinar el cuello." [OSHA]
- "Lleva el mentón ligeramente hacia atrás (como hacer 'papada') para alinear la
  cabeza con el tronco." [ángulo craneovertebral]
- "Apoya bien la espalda en el respaldo con soporte lumbar; no te acerques al
  escritorio encorvándote." [OSHA]
- "Cada ~30 min, levántate y camina 1–2 min." [evidencia sedentarismo]

**Reclinado (`excessive_recline`):**
- "Endereza el respaldo a una ligera inclinación (100–110°); echarte más es para
  descansar, no para trabajar." [ergonomía]
- "Lleva la cadera al fondo del asiento y apoya los pies en el piso o un reposapiés;
  no te deslices hacia adelante." [OSHA]
- "Usa el soporte lumbar para acompañar la curva de tu espalda baja." [OSHA]
- "Cada ~30 min, levántate y camina 1–2 min." [evidencia]

**Adecuada / sin desviación dominante:**
- "Mantén la cabeza alineada con el tronco y la pantalla a la altura de los ojos." [OSHA]
- "Espalda apoyada con soporte lumbar y pies planos en el piso." [OSHA]
- "Cambia de postura seguido y camina unos minutos cada ~30 min." [OSHA/evidencia]

`recommendationsFor(dominant)` devuelve `{ tips: string[]; sources: string[] }`.
Fuentes (texto): "OSHA Computer Workstations", "Ángulo craneovertebral (postura de
cabeza)", "Guías de pausas activas en sedentarismo".

### 6.4 PDF rediseñado

`src/features/session-history/lib/sessionPdf.ts`

`SessionPdfData` se amplía con `totalMinutes`, `countsByClass`, `pauses`.

Orden y distribución (A4, con el guard de paginación ya existente):
1. **Encabezado**: SitRight · Reporte de sesión · fecha · tiempo de uso · "% de
   postura correcta".
2. **Resumen + Distribución** en dos columnas: izquierda las cifras del resumen
   (glosario), derecha la barra de distribución por clase.
3. **Cómo te sentaste hoy**: las dos figuras (rasterizadas desde los `<svg>` con los
   marcadores de ángulo) con rótulos.
4. **Detalle por zona**: tabla con encabezados del **glosario** ("Zona", "% del tiempo
   inclinada", "Cuánto se inclinó", "Lo más que se inclinó", "De corrido",
   "Veces"). Debajo, la **leyenda** del §4.
5. **Recomendaciones** (de `postureGuidance`) + línea **"Fuentes: …"**.
6. **Pie** en todas las páginas: prediagnóstico orientativo.

### 6.5 Cableado en la página

`SessionDetailPage.tsx`: pasa a `PostureComparisonSection` y a `buildSessionPdf` los
nuevos datos: `totalMinutes` (`effective.summary?.total_minutes`), `countsByClass`
(`effective.summary?.counts_by_class`), `pauses` (de `deriveStats`). Mantener el uso
de `effective` (no `session.summary` crudo).

## 7. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/shared/ui/SeatedFigure.tsx` | + prop `angleMarkers`, render goniométrico |
| `src/features/session-history/lib/sessionCopy.ts` | NUEVO: textos del glosario (labels + leyenda) reutilizables |
| `src/features/session-history/lib/postureGuidance.ts` | NUEVO: recomendaciones con evidencia + fuentes |
| `src/features/session-history/components/PostureComparison.tsx` | rediseño (figuras c/ángulo, resumen, distribución, detalle) |
| `src/features/session-history/components/ZoneDetailList.tsx` | NUEVO: detalle por zona con glosario |
| `src/features/session-history/lib/sessionPdf.ts` | usa `postureGuidance` + `sessionCopy`; `SessionPdfData` ampliado; layout 2-columnas; tabla con glosario + leyenda |
| `src/features/session-history/pages/SessionDetailPage.tsx` | pasa `totalMinutes`/`countsByClass`/`pauses` a sección y PDF |

## 8. Fuentes (evidencia de las recomendaciones)

- OSHA — Computer Workstations: Positions y Components/Chairs (postura neutra, monitor
  a la altura de los ojos, soporte lumbar, cambiar de postura).
  https://www.osha.gov/etools/computer-workstations/positions
  https://www.osha.gov/etools/computer-workstations/components/chairs
- Ángulo craneovertebral y postura de cabeza adelantada (RCT, PMC):
  CVA ≤53° = cabeza adelantada; educación postural + ejercicios (mentón atrás) mejoran
  en ~4 semanas. https://pmc.ncbi.nlm.nih.gov/articles/PMC10464763/
- Reclinación 100–110° y soporte lumbar (guías ergonómicas).
- Interrumpir el sedentarismo: moverse 1–2 min cada ~30 min; caminar mejor que solo
  pararse. https://link.springer.com/article/10.1007/s40279-022-01649-4

## 9. Pruebas

- `sessionCopy`: el mapa de labels devuelve los textos del glosario (p. ej. para
  `longest_streak_min` → "Lo más que estuvo inclinada de corrido"); ningún label
  prohibido ("tramo máximo", "pico", "episodios", "% desviado").
- `postureGuidance.recommendationsFor`: para `forward_slouch` incluye monitor a la
  altura de los ojos y mentón atrás; para `excessive_recline` incluye 100–110° y
  cadera al fondo; ambos incluyen pausas; `sources` no vacío; caso `null` da guía
  general.
- distribución: cálculo de % por clase excluye `indeterminate` y suma ~100%.
- `SeatedFigure`: con `angleMarkers` para una zona renderiza el arco + etiqueta
  "{deg}°"; sin `angleMarkers` no agrega marcadores (dashboard intacto).
- `PostureComparison`: muestra Resumen (tiempo de uso, % correcto, desviación en
  palabras, pausas), Distribución y el detalle por zona con textos del glosario;
  sin calibración omite figuras-con-ángulo y detalle pero muestra resumen+distribución.
- `sessionPdf` (puro): `buildZoneTableRows`/labels usan los encabezados del glosario.

## 10. Casos borde

- Sin calibración: ver 6.2 (sin ángulos ni detalle por zona).
- Adecuada / `dominant = null`: figuras alineadas sin marcadores; recomendaciones
  generales; frase positiva.
- `counts_by_class` ausente o solo `indeterminate`: la distribución muestra aviso
  "sin datos suficientes" y no rompe.
- Sesión corta (<30 min): se mantiene la nota referencial existente.
- PDF con muchos datos: el guard de paginación (ya implementado) evita recortes.
