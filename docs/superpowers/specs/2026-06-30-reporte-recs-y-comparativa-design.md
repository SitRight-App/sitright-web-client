# Reporte: recomendaciones coherentes (pantalla + PDF) y comparativa entre días en el PDF

Fecha: 2026-06-30
Repo: `sitright-web-client`
Feature: `session-history`

## 1. Contexto y problema

1. **Recomendaciones incoherentes:** la pantalla del reporte usa el feature backend
   `useRecommendations(dominant)` (query deshabilitada si `dominant` es nulo → muestra
   "No hay recomendaciones específicas para esta sesión"), mientras el PDF usa las
   locales con evidencia `recommendationsFor(dominant)` (siempre devuelve algo). Para una
   misma sesión, una dice "ninguna" y el otro muestra consejos.
2. **El PDF no trae la comparativa entre días** que sí está en pantalla (`SessionTrend`).

## 2. Objetivos

1. **Una sola fuente de recomendaciones** (las de evidencia, `postureGuidance`) para
   pantalla y PDF, derivada de la desviación dominante o —si no hay— de la zona peor.
   Una sesión con desviación SIEMPRE recibe consejos; solo hay "todo bien / mantenimiento"
   cuando ninguna zona se desvió.
2. **El PDF gana una comparativa entre días**: mini gráfico de barras (últimos días) +
   la diferencia vs. la sesión anterior. Reutiliza el cálculo de la pantalla (sin duplicar).

## 3. Fuera de alcance (YAGNI)

- No se toca el feature de recomendaciones del dashboard ni la página `/recommendations`.
  Solo cambia lo que muestra el **reporte de sesión** (pantalla + PDF).
- La figura, el veredicto, el detalle por zona y la distribución del PDF no cambian.

## 4. Constraints heredados

- Glosario (`sessionCopy`); recomendaciones desde `postureGuidance`; sin "Fuentes:" en el PDF.
- jsPDF WinAnsi: sin glifos fuera de WinAnsi (usar puntos de color / texto ASCII; `°`/`·` ok).
- Un feature no importa de otro; lo común va en el `lib/` del feature o en `shared/`.
- TS strict, sin `any`, sin imports/variables sin uso.

## 5. Diseño

### 5.1 Clave de recomendación compartida — `recommendationKey`

`src/features/session-history/lib/postureGuidance.ts` (NUEVO export).

```ts
recommendationKey(dominant: string | null, zones?: Record<SpineZone, ZoneDeviation>): string | null
```
Reglas:
- Si `dominant` es `'forward_slouch'` o `'excessive_recline'` → se devuelve tal cual.
- Si `zones` es `undefined` → `null` (sin señal de zona; solo mandaba el dominante).
- Si no, se busca la **zona peor** (mayor `deviated_pct` con `toneFor(...) !== 'ok'`):
  - ninguna desviada → `null` (todo bien);
  - `cervical` o `dorsal` → `'forward_slouch'`;
  - `lumbar` → `'excessive_recline'`.

`recommendationsFor(key)` (ya existe) sigue igual: tips por clave; `key === null` → consejos
**generales de mantenimiento** (positivos). Es decir, ya no hay estado "sin recomendaciones";
lo peor es "mantén tus buenos hábitos".

### 5.2 Pantalla — el reporte usa `postureGuidance`

`src/features/session-history/pages/SessionDetailPage.tsx`:
- Quitar el uso de `useRecommendations` para el reporte.
- Calcular `const recKey = recommendationKey(effective.dominant, zoneData?.zones)` — cuando
  `zoneData?.zones` es `undefined` (no calibrado o sin cargar), `recommendationKey` usa solo
  `dominant` (trata las zonas como no desviadas). Luego `const tips = recommendationsFor(recKey).tips`.
  (Ajustar la firma de `recommendationKey` para aceptar `zones?: Record<SpineZone, ZoneDeviation>`.)
- `SecondRow` pasa a recibir `tips: string[]` y renderiza una lista simple de esos consejos
  (mismo estilo de tarjeta). Se elimina el mensaje "No hay recomendaciones específicas para
  esta sesión" (con `postureGuidance` siempre hay consejos: específicos o de mantenimiento).
- (Si `zoneData` aún no cargó, la clave se calcula solo con `dominant`; al cargar, se
  recalcula. Sin calibración: `dominant` manda.)

### 5.3 PDF — recomendaciones por la misma clave

`sessionPdf.ts`: la sección "Qué hacer" usa
`recommendationsFor(recommendationKey(data.dominantDeviation, data.zones)).tips`
(en vez de `recommendationsFor(data.dominantDeviation)`). Mismo texto que la pantalla.

### 5.4 Comparativa entre días — helper `buildTrend`

`src/features/session-history/lib/sessionTrend.ts` (NUEVO). Extrae el cálculo que hoy vive
inline en `SessionTrend.tsx`:

```ts
interface TrendPoint { id: string; at: string; pct: number }
interface TrendCurrent { id: string; startedAt: string; adequatePct: number | null }
interface TrendResult { points: TrendPoint[]; currentIndex: number; delta: number | null }

buildTrend(sessions: PostureSession[], current: TrendCurrent, maxPoints = 8): TrendResult
```
- Mapea las sesiones con `summary.valid_readings > 0` a `{id, at, pct}`; inyecta la actual si
  falta (con `adequatePct`); ordena por fecha; recorta a `maxPoints`.
- `currentIndex` = índice de la actual (o el último). `delta` = `round(actual.pct - previa.pct)`
  o `null` si no hay previa (menos de 2 puntos).

`SessionTrend.tsx` se refactoriza para usar `buildTrend` (mantiene su gráfico, promedio y racha
a partir de `points`). Sin cambios de comportamiento en pantalla.

### 5.5 PDF — sección "Comparación con otros días" (mini barras + delta)

`SessionPdfData` gana:
```ts
trend: { bars: { label: string; pct: number; current: boolean }[]; delta: number | null }
```
La página lo arma desde `buildTrend(allSessions, {id, startedAt, adequatePct})`, formateando
`at` a etiqueta corta (p. ej. "22/06").

En `buildSessionPdf`, sección "Comparación con otros días" (después de "Qué pasó en cada zona",
antes de "Qué hacer"):
- Si `trend.bars.length < 2` → "Primera sesión registrada — aún no hay con qué comparar."
- Si no: **mini gráfico de barras** en vector — por cada barra, un rect vertical de alto
  proporcional al `pct` (alto máx ~20 mm), coloreado por `scoreLevel(pct)` (la `current`
  resaltada/opaca, las demás más tenues), con la etiqueta de fecha debajo y el `pct` de la
  actual encima. Debajo, una línea: `Frente a la sesión anterior: +N pts` (delta>0 moss,
  <0 terracota, texto ASCII; sin flechas glifo) o "Sin sesión previa".
- `ensure(...)` antes de la sección para no recortar.

## 6. Archivos afectados

| Archivo | Cambio |
|---|---|
| `lib/postureGuidance.ts` | + `recommendationKey` |
| `lib/postureGuidance.test.ts` | + tests de `recommendationKey` |
| `lib/sessionTrend.ts` | NUEVO: `buildTrend` + tipos |
| `lib/sessionTrend.test.ts` | NUEVO: tests de `buildTrend` |
| `components/SessionTrend.tsx` | usa `buildTrend` (sin cambio visible) |
| `pages/SessionDetailPage.tsx` | reporte usa `postureGuidance`; pasa `trend` al PDF; quita `useRecommendations` del reporte |
| `lib/sessionPdf.ts` | recs por `recommendationKey`; + sección "Comparación con otros días"; `SessionPdfData.trend` |

## 7. Pruebas

Puras (testeables):
- `recommendationKey`: dominante explícito → tal cual; sin dominante con cuello desviado →
  `'forward_slouch'`; con lumbar desviada → `'excessive_recline'`; todo en rango → `null`.
- `buildTrend`: mapea/ordena/recorta; inyecta la actual si falta; `delta` correcto; `null`
  con menos de 2 puntos; `currentIndex` correcto.
- Se conservan: `buildDistribution`, `scoreLevel`, `toneColor`, `recommendationsFor`.
- `buildSessionPdf`/`drawSeatedBody`/el chart no se testean unitariamente (jsPDF); humo manual.

Humo manual: (a) una sesión con desviación muestra las MISMAS recomendaciones en pantalla y
PDF; una sesión "todo bien" muestra las de mantenimiento en ambos; (b) el PDF trae la
comparativa (barras + delta), y con una sola sesión dice "Primera sesión registrada".

## 8. Casos borde

- `dominant` nulo + zonas desviadas → recs por zona peor (ya no "ninguna").
- Sin calibración → clave por `dominant` (zonas todas ok).
- Una sola sesión → PDF: "Primera sesión registrada"; pantalla: mensaje existente de Evolución.
- `allSessions` sin cargar al generar el PDF → `trend.bars` vacío → mismo mensaje de "primera".
