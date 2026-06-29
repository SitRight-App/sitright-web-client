# Comparativa de postura y PDF clínico en el reporte de sesión

Fecha: 2026-06-29
Repo: `sitright-web-client`
Feature: `session-history` (+ `shared/ui`)

## 1. Contexto y problema

El reporte de sesión (`SessionDetailPage`) ya muestra score, desviación dominante,
mapa corporal con %, distribución y línea de tiempo. La asesora pide que el reporte
sea **más útil para el trabajador sedentario en el momento**, con un enfoque tipo
consulta médica: mostrar **la postura correcta vs. la suya** para que entienda de un
vistazo qué hace bien y qué corregir.

Restricciones de producto:
- El valor debe salir de **una sola sesión de un día** (el usuario puede usar el
  chaleco un solo día; no podemos depender del historial semanal).
- Lenguaje simple, sin información que confunda. Es un **prediagnóstico orientativo**,
  no reemplaza al profesional de salud.
- El **PDF** no debe ser un screenshot (hoy lo es): debe aportar valor como documento.

## 2. Objetivos

1. Un bloque de comparación **"Postura correcta vs. Tu sesión"** con dos figuras de
   perfil y un checklist por zona en lenguaje simple.
2. El reporte de un día es autosuficiente: comparación + checklist + lectura en una
   frase dan todo lo necesario.
3. **PDF clínico generado** (texto + figuras vectorizadas), no captura de pantalla.

## 3. Fuera de alcance (YAGNI)

- No se rediseña el hero, la distribución ni la línea de tiempo.
- No se toca la tendencia entre sesiones (sigue degradando bien con 1 sesión).
- No se crean nuevas recomendaciones; se usa un set compacto estático por desviación.
- La inclinación del torso es **ilustrativa/moderada**, no el ángulo exacto medido.

## 4. Datos disponibles (ya existentes)

`ZoneAnalysis` (por sesión): `calibrated`, `threshold_degrees`, y por zona
(`cervical`, `dorsal`, `lumbar`) un `ZoneDeviation`:
`deviated_pct`, `minutes_in_deviation`, `avg_angle_deg`, `peak_angle_deg`,
`longest_streak_min`, `episodes`.

`SessionSummary`: `adequate_percentage`, `dominant_deviation`
(`forward_slouch` | `excessive_recline` | `adequate` | `null`), `total_minutes`,
`counts_by_class`.

Banda de color por zona (presentación, ya existe en `SessionBodyMap.toneFor`):
`deviated_pct < 5 → ok`, `< 25 → leve`, `>= 25 → marcada`.

## 5. Diseño de componentes

### 5.1 `SeatedFigure` — nuevo prop `lean`

`src/shared/ui/SeatedFigure.tsx`

- Agregar prop opcional `lean?: number` (grados). Por defecto `0` → comportamiento
  idéntico al actual (no afecta dashboard ni `SessionBodyMap` con callouts).
- Cuando `lean !== 0`, el **tronco + cabeza + brazo + línea de columna + nodos** se
  rotan como grupo alrededor del pivote de la cadera (≈ `100,200`). La silla y las
  piernas no se mueven.
  - `lean > 0` → inclinación hacia adelante (encorvado).
  - `lean < 0` → inclinación hacia atrás (reclinado).
- Se logra envolviendo los elementos del torso hacia arriba en
  `<g transform="rotate(lean 100 200)">`. La cabeza mantiene además su `headTilt`
  propio (rotación anidada).
- Nota: rotar los nodos desplaza el ancla de los callouts; por eso la comparación
  usa figuras **sin callouts**. Los usos con callouts no pasan `lean` (queda 0).

### 5.2 `PostureComparison` — nuevo componente

`src/features/session-history/components/PostureComparison.tsx`

Props:
```ts
interface Props {
  zones: Record<SpineZone, ZoneDeviation>
  thresholdDeg: number
  calibrated: boolean
  adequatePct: number
  dominantDeviation: string | null
}
```

Renderiza:

**(a) Dos figuras lado a lado** (grid de 2 columnas, responsive a 2 col en móvil
también porque son compactas), ambas con `tight` y sin callouts:
- **Postura correcta** (referencia): las 3 zonas en `tone='ok'`, `headTilt=0`,
  `lean=0`. Sub-rótulo: "Referencia".
- **Tu sesión**: cada zona con su `tone` vía `toneFor(deviated_pct)`; `headTilt`
  desde la cervical (igual que `SessionBodyMap`: 0 si la cervical está en rango,
  si no `min(avg_angle_deg, 32)`); `lean` ilustrativo desde la desviación dominante:
  - `forward_slouch` → `+12`
  - `excessive_recline` → `-12`
  - `adequate` / `null` → `0`
  - (si la zona dominante tiene tono `marcada`, usar `±16` para acentuar; tope ±16.)
  - Sub-rótulo en lenguaje simple: `Encorvado hacia adelante` / `Reclinado hacia atrás`
    / `Alineada`.

Cada figura lleva un rótulo grande arriba ("Postura correcta" / "Tu sesión").

**(b) Checklist por zona** (debajo, ancho completo), ordenado **peor primero** por
`deviated_pct` desc:
- Ícono/estado: `tone==='ok'` → ✓ "En rango"; si no → ⚠ "Atención".
- Etiqueta de zona: `ZONE_LABELS` = `{cervical:'Cuello', dorsal:'Espalda media',
  lumbar:'Espalda baja'}`.
- Detalle:
  - en rango → "Se mantuvo dentro de lo recomendado".
  - desviada → "Se inclinó {round(avg_angle_deg)}° el {round(deviated_pct)}% del tiempo".

**(c) Lectura en una frase** (justo debajo de las dos figuras, encima del checklist):
- Con desviaciones: "Mantuviste una postura correcta el {adequatePct}% del tiempo.
  Tu mayor desafío fue {ZONE_LABELS[peor]}, que se {desc} el {pct}% del tiempo."
  donde `peor` = zona con mayor `deviated_pct`, `desc` según la desviación
  (encorvarse hacia adelante / reclinarse hacia atrás / desviarse).
- Sin desviaciones (todas ok): "Tu postura se mantuvo adecuada la mayor parte de la
  sesión. Buen trabajo."

**(d) Mini-definiciones + disclaimer** (texto pequeño legible, `ink-soft`):
- "Encorvado: espalda/cuello inclinados hacia adelante. Reclinado: tronco echado
  hacia atrás."
- "Este resumen es un prediagnóstico orientativo y no reemplaza la evaluación de un
  profesional de salud."

**Caso sin calibración** (`calibrated === false`): no hay ángulos por zona. Se muestra
la figura "Postura correcta", la figura "Tu sesión" con zonas neutras y un aviso:
"Calibra el chaleco para ver el detalle por zona de esta sesión." Se omite el
checklist por zona. La frase usa solo `adequatePct`.

### 5.3 Helper de tono compartido

Extraer `toneFor(pct)` (hoy en `SessionBodyMap`) a
`src/features/session-history/lib/zoneTone.ts` y reusarlo en `SessionBodyMap` y
`PostureComparison` (evita duplicar el cutoff de presentación).

### 5.4 Integración en `SessionDetailPage`

- **Reemplazar** la sección actual `ZoneReport` (figura + anotaciones) por
  `<PostureComparison .../>`. Se eliminan `ZoneReport`/`ZoneAnnotation` si quedan sin
  uso, o se reusa su lógica de orden/etiquetas dentro de `PostureComparison`.
- El resto del reporte (hero, distribución, línea de tiempo, tendencia) no cambia.

## 6. PDF clínico generado

`src/features/session-history/lib/sessionPdf.ts` (NUEVO) — extrae y reescribe
`exportSessionToPdf`. Deja de usar `html2canvas` sobre toda la página.

Construcción con `jsPDF` (A4 vertical, unidades mm):
1. **Encabezado**: "SitRight — Reporte de sesión postural", fecha y hora de la sesión,
   duración, y "% de postura correcta: {adequatePct}%".
2. **Comparación**: las dos figuras. Se obtienen serializando los dos `<svg>` ya
   renderizados en el DOM (refs/ids en `PostureComparison`) → `XMLSerializer` →
   data URL → `Image` → `<canvas>` → PNG → `pdf.addImage`. Rótulos "Postura correcta"
   y "Tu sesión" debajo de cada figura.
3. **Hallazgos** (lenguaje simple, bullets): qué se hizo bien (zonas en rango) y qué
   conviene corregir (zonas desviadas, peor primero), generados desde los datos.
4. **Tabla por zona**: Zona | % tiempo desviado | Áng. promedio | Pico | Episodios.
   Dibujada con texto y líneas de jsPDF (sin librería de tablas).
5. **Recomendaciones** (2–3) según `dominant_deviation`, desde un map estático
   definido en `sessionPdf.ts` (no se importa el feature `recommendations`; respeta
   la regla de aislamiento entre features).
6. **Pie**: "Prediagnóstico orientativo; no reemplaza la evaluación de un profesional
   de salud." + "Generado el {fecha}".

Fallback: si la serialización del SVG falla, se omiten las figuras pero el resto del
documento (texto/tabla/recomendaciones) se genera igual. Se conserva `window.print()`
solo como último recurso si jsPDF no carga.

Funciones puras testeables (extraídas en `sessionPdf.ts`):
- `buildFindings(zones, thresholdDeg)` → `{ good: string[], improve: string[] }`.
- `buildZoneTableRows(zones)` → filas formateadas.
- `recommendationsFor(dominant)` → `string[]`.

## 7. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/shared/ui/SeatedFigure.tsx` | + prop `lean`, grupo de rotación del torso |
| `src/features/session-history/lib/zoneTone.ts` | NUEVO: `toneFor` compartido |
| `src/features/session-history/components/SessionBodyMap.tsx` | usa `zoneTone` |
| `src/features/session-history/components/PostureComparison.tsx` | NUEVO |
| `src/features/session-history/lib/sessionPdf.ts` | NUEVO: PDF generado |
| `src/features/session-history/pages/SessionDetailPage.tsx` | usa `PostureComparison`; PDF vía `sessionPdf` |

## 8. Pruebas

- `SeatedFigure`: con `lean=0` no agrega transform de tronco; con `lean!=0` aplica
  `rotate(... 100 200)`.
- `PostureComparison`:
  - figura "Tu sesión" con `forward_slouch` → sub-rótulo "Encorvado hacia adelante".
  - checklist ordenado peor-primero; zona ok muestra "En rango".
  - sin calibración → muestra aviso y omite checklist.
  - todas ok → frase positiva.
- `sessionPdf` (puras): `buildFindings`, `buildZoneTableRows`, `recommendationsFor`
  con casos forward_slouch / excessive_recline / adequate.

## 9. Accesibilidad y legibilidad

- Las figuras conservan `role="img"` + `aria-label`.
- El estado de cada zona se comunica con **texto** ("En rango"/"Atención"), no solo
  color. Íconos ✓/⚠ acompañan, no sustituyen.
- Texto secundario en `ink-soft` (no `ink-faint`) y ≥ 12px, según el ajuste de
  legibilidad ya aplicado al reporte.

## 10. Casos borde

- Sesión corta (<30 min): se mantiene la nota referencial existente; la comparación
  igual se muestra.
- `dominant_deviation = null` o `adequate`: figura "Tu sesión" alineada, lean 0.
- Sin calibración: ver 5.2.
- Zona con `deviated_pct` alto pero `avg_angle_deg` bajo: el detalle muestra ambos;
  el orden del checklist es por `deviated_pct`.
