# Recomendaciones coherentes + comparativa entre días — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar las recomendaciones del reporte (pantalla y PDF usan las de evidencia por `recommendationKey`) y agregar al PDF una comparativa entre días (mini barras + delta), reutilizando el cálculo de la pantalla.

**Architecture:** Se agrega `recommendationKey(dominant, zones?)` a `postureGuidance` (lo usan pantalla y PDF) y `buildTrend(sessions, current)` a un nuevo `sessionTrend.ts` (lo usan `SessionTrend` y el PDF). La pantalla deja de usar el feature backend de recomendaciones; el PDF gana una sección de comparativa dibujada en vector.

**Tech Stack:** React 18 + TypeScript strict + Vite, vitest, jsPDF.

## Global Constraints

- TS strict; `noUnusedLocals`/`noUnusedParameters` = true → sin imports/variables sin uso. No `any`.
- Recomendaciones SIEMPRE desde `postureGuidance`; PDF sin línea "Fuentes:".
- jsPDF WinAnsi: sin glifos fuera de WinAnsi (usar puntos de color / texto ASCII; `°`/`·` ok). Nada de ✓/⚠/flechas glifo.
- Un feature no importa de otro; lo común va en `lib/` del feature.
- Solo cambia el reporte de sesión (pantalla + PDF); NO se toca el feature de recomendaciones del dashboard ni `/recommendations`.
- `recommendationKey`: dominante explícito (`forward_slouch`/`excessive_recline`) → tal cual; si no y hay zonas, infiere de la zona peor (cervical/dorsal → `forward_slouch`; lumbar → `excessive_recline`); `null` si `zones` es undefined o ninguna zona desviada.
- Bandas: `toneFor(pct)`: `<5 ok`, `<25 leve`, `>=25 marcada`.
- Commits: `git commit` NORMAL (identidad Christopher `79271081+ChrisByBits@users.noreply.github.com`), sin override, sin atribución a Claude.
- Verificar antes de cada commit: `npm run test -- --run` y `npm run build`.

---

### Task 1: `recommendationKey`

**Files:**
- Modify: `src/features/session-history/lib/postureGuidance.ts`
- Modify: `src/features/session-history/lib/postureGuidance.test.ts`

**Interfaces:**
- Produces: `recommendationKey(dominant: string | null, zones?: Record<SpineZone, ZoneDeviation>): string | null`

- [ ] **Step 1: Write the failing test**

Añadir a `postureGuidance.test.ts` (añadir `recommendationKey` al import desde `'./postureGuidance'`, y un import de tipo):
```ts
import type { ZoneDeviation } from '../types/session'

const zd = (deviated_pct: number): ZoneDeviation => ({
  deviated_pct, minutes_in_deviation: 5, avg_angle_deg: 18,
  peak_angle_deg: 26, longest_streak_min: 2, episodes: 3,
})

describe('recommendationKey', () => {
  it('respeta el dominante explícito', () => {
    expect(recommendationKey('forward_slouch')).toBe('forward_slouch')
    expect(recommendationKey('excessive_recline', { cervical: zd(0), dorsal: zd(0), lumbar: zd(0) })).toBe('excessive_recline')
  })
  it('infiere de la zona peor cuando no hay dominante', () => {
    expect(recommendationKey(null, { cervical: zd(40), dorsal: zd(10), lumbar: zd(0) })).toBe('forward_slouch')
    expect(recommendationKey(null, { cervical: zd(0), dorsal: zd(0), lumbar: zd(30) })).toBe('excessive_recline')
  })
  it('null si todo en rango o sin zonas', () => {
    expect(recommendationKey(null, { cervical: zd(1), dorsal: zd(0), lumbar: zd(2) })).toBeNull()
    expect(recommendationKey(null)).toBeNull()
    expect(recommendationKey('adequate')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/postureGuidance.test.ts`
Expected: FAIL (`recommendationKey` no exportado).

- [ ] **Step 3: Implement**

En `postureGuidance.ts`, añadir imports al inicio y la función (antes o después de `recommendationsFor`):
```ts
import { ZONE_ORDER, toneFor } from './zoneTone'
import type { SpineZone, ZoneDeviation } from '../types/session'
```
```ts
/** Clave de recomendación: dominante explícito, o inferida de la zona peor. */
export function recommendationKey(
  dominant: string | null,
  zones?: Record<SpineZone, ZoneDeviation>,
): string | null {
  if (dominant === 'forward_slouch' || dominant === 'excessive_recline') return dominant
  if (!zones) return null
  let worst: SpineZone | null = null
  let worstPct = -1
  for (const z of ZONE_ORDER) {
    const p = zones[z].deviated_pct
    if (toneFor(p) !== 'ok' && p > worstPct) { worstPct = p; worst = z }
  }
  if (!worst) return null
  return worst === 'lumbar' ? 'excessive_recline' : 'forward_slouch'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/lib/postureGuidance.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify build & commit**

```bash
npm run build
git add src/features/session-history/lib/postureGuidance.ts src/features/session-history/lib/postureGuidance.test.ts
git commit -m "feat(session-report): recommendationKey (dominante o zona peor)"
```

---

### Task 2: `buildTrend` + refactor de `SessionTrend`

**Files:**
- Create: `src/features/session-history/lib/sessionTrend.ts`
- Create: `src/features/session-history/lib/sessionTrend.test.ts`
- Modify: `src/features/session-history/components/SessionTrend.tsx`

**Interfaces:**
- Produces:
```ts
interface TrendPoint { id: string; at: string; pct: number; dominant: string | null }
interface TrendResult { points: TrendPoint[]; currentIndex: number; delta: number | null }
buildTrend(sessions: PostureSession[], current: { id: string; startedAt: string; adequatePct: number | null; dominant: string | null }, maxPoints?: number): TrendResult
```

- [ ] **Step 1: Write the failing test**

```ts
// src/features/session-history/lib/sessionTrend.test.ts
import { describe, expect, it } from 'vitest'
import { buildTrend } from './sessionTrend'
import type { PostureSession } from '../types/session'

const s = (id: string, at: string, pct: number): PostureSession =>
  ({
    id, user_id: 'u', vest_device_id: 'v', started_at: at, ended_at: at, status: 'closed',
    reading_count: 100, note: null, duration_minutes: 10,
    summary: { total_readings: 100, valid_readings: 100, adequate_percentage: pct, dominant_deviation: null, total_minutes: 10, counts_by_class: {} },
  }) as PostureSession

describe('buildTrend', () => {
  it('ordena, calcula delta y currentIndex', () => {
    const sessions = [s('a', '2026-06-20', 60), s('b', '2026-06-21', 75)]
    const r = buildTrend(sessions, { id: 'b', startedAt: '2026-06-21', adequatePct: 75, dominant: null })
    expect(r.points.map((p) => p.id)).toEqual(['a', 'b'])
    expect(r.currentIndex).toBe(1)
    expect(r.delta).toBe(15)
  })
  it('inyecta la sesión actual si falta', () => {
    const sessions = [s('a', '2026-06-20', 60)]
    const r = buildTrend(sessions, { id: 'x', startedAt: '2026-06-22', adequatePct: 80, dominant: null })
    expect(r.points.map((p) => p.id)).toEqual(['a', 'x'])
    expect(r.delta).toBe(20)
  })
  it('delta null con una sola sesión', () => {
    const r = buildTrend([], { id: 'x', startedAt: '2026-06-22', adequatePct: 80, dominant: null })
    expect(r.points).toHaveLength(1)
    expect(r.delta).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/sessionTrend.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement `buildTrend`**

```ts
// src/features/session-history/lib/sessionTrend.ts
import type { PostureSession } from '../types/session'

export interface TrendPoint {
  id: string
  at: string
  pct: number
  dominant: string | null
}

export interface TrendResult {
  points: TrendPoint[]
  currentIndex: number
  delta: number | null
}

export function buildTrend(
  sessions: PostureSession[],
  current: { id: string; startedAt: string; adequatePct: number | null; dominant: string | null },
  maxPoints = 8,
): TrendResult {
  const points: TrendPoint[] = sessions
    .filter((s) => s.summary && s.summary.valid_readings > 0)
    .map((s) => ({
      id: s.id,
      at: s.started_at,
      pct: s.summary!.adequate_percentage,
      dominant: s.summary!.dominant_deviation,
    }))
  if (current.adequatePct != null && !points.some((p) => p.id === current.id)) {
    points.push({ id: current.id, at: current.startedAt, pct: current.adequatePct, dominant: current.dominant })
  }
  points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const capped = points.slice(-maxPoints)
  const idxRaw = capped.findIndex((p) => p.id === current.id)
  const currentIndex = idxRaw === -1 ? Math.max(0, capped.length - 1) : idxRaw
  const cur = capped[currentIndex]
  const prev = currentIndex > 0 ? capped[currentIndex - 1] : null
  const delta = cur && prev ? Math.round(cur.pct - prev.pct) : null
  return { points: capped, currentIndex, delta }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/lib/sessionTrend.test.ts`
Expected: PASS.

- [ ] **Step 5: Refactor `SessionTrend.tsx` para usar `buildTrend`**

En `SessionTrend.tsx`:
- Añadir import: `import { buildTrend, type TrendPoint } from '../lib/sessionTrend'`.
- Reemplazar el `interface Point {...}` local por el uso de `TrendPoint` (o borrar `Point` y usar `TrendPoint`).
- Reemplazar el `const series = useMemo<Point[]>(() => { ... }, [...])` por:
```tsx
  const series = useMemo<TrendPoint[]>(
    () =>
      buildTrend(
        data ?? [],
        { id: currentSessionId, startedAt: currentStartedAt, adequatePct: currentAdequatePct, dominant: currentDominant },
        MAX_POINTS,
      ).points,
    [data, currentSessionId, currentStartedAt, currentAdequatePct, currentDominant],
  )
```
(El resto de `SessionTrend` —`curIdx`, `delta`, `avg`, racha, gráfico— sigue operando sobre `series` sin cambios.)

- [ ] **Step 6: Run tests + build**

Run: `npm run test -- --run src/features/session-history && npm run build`
Expected: PASS; build limpio (sin `Point` sin uso).

- [ ] **Step 7: Commit**

```bash
git add src/features/session-history/lib/sessionTrend.ts src/features/session-history/lib/sessionTrend.test.ts src/features/session-history/components/SessionTrend.tsx
git commit -m "refactor(session-history): extrae buildTrend y lo usa SessionTrend"
```

---

### Task 3: Pantalla — el reporte usa las recomendaciones de evidencia

**Files:**
- Modify: `src/features/session-history/pages/SessionDetailPage.tsx`

**Interfaces:**
- Consumes: `recommendationKey`, `recommendationsFor` (Task 1 / postureGuidance).

- [ ] **Step 1: Cambiar el cableado de recomendaciones (componente principal)**

En `SessionDetailPage.tsx`, en el componente principal:
- Quitar el import `import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'`.
- Añadir `import { recommendationKey, recommendationsFor } from '../lib/postureGuidance'`.
- Reemplazar la línea `const recs = useRecommendations(dominant ?? undefined)` por (junto a los
  demás hooks, antes del early-return; `useZoneAnalysis` ya está importado y acepta `undefined`,
  quedando deshabilitado; TanStack comparte la query, sin doble fetch):
```tsx
  const { data: reportZones } = useZoneAnalysis(session?.id)
```
- En el `return` (donde `session` ya está garantizado tras el early-return), reemplazar
  `<SecondRow recommendations={recs.data ?? []} effective={effective} />` por:
```tsx
      <SecondRow tips={recommendationsFor(recommendationKey(dominant, reportZones?.zones)).tips} />
```

- [ ] **Step 2: Reescribir el componente `SecondRow`**

Reemplazar el `interface SecondRowProps` y la función `SecondRow` por:
```tsx
function SecondRow({ tips }: { tips: string[] }) {
  return (
    <div className="mt-4">
      <section className={`rounded-xl border p-6 ${CARD_TONE.amber}`}>
        <div className="mb-4">
          <SectionEyebrow tone="amber">Recomendaciones</SectionEyebrow>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
            Qué puedes mejorar
          </h2>
        </div>
        <ul className="space-y-3">
          {tips.map((tip, i) => (
            <li
              key={i}
              className="grid grid-cols-[32px_1fr] items-start gap-4 rounded-xl border border-sand bg-cream/60 p-4"
            >
              <span className="text-center font-mono text-base font-semibold tabular-nums text-terracotta-deep">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[15px] leading-snug text-ink">{tip}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```
(Se elimina el estado "No hay recomendaciones específicas" y el chip de dominante. `POSTURE_TAG`/`POSTURE_LABELS` siguen usándose en otras partes de la página, no se borran.)

- [ ] **Step 3: Build + suite**

Run: `npm run build && npm run test -- --run`
Expected: build limpio (sin `useRecommendations`/`recs`/`SecondRowProps` sin uso); suite verde.

- [ ] **Step 4: Commit**

```bash
git add src/features/session-history/pages/SessionDetailPage.tsx
git commit -m "feat(session-report): la pantalla usa las recomendaciones de evidencia (coherencia con el PDF)"
```

---

### Task 4: PDF — recomendaciones por clave + comparativa entre días (un commit)

**Files:**
- Modify: `src/features/session-history/lib/sessionPdf.ts`
- Modify: `src/features/session-history/pages/SessionDetailPage.tsx`

**Interfaces:**
- Consumes: `recommendationKey` (Task 1), `buildTrend` (Task 2), `scoreLevel` (sessionPdf).
- Produces: `SessionPdfData.trend: { bars: { label: string; pct: number; current: boolean }[]; delta: number | null }`.

- [ ] **Step 1: `sessionPdf.ts` — import, tipo, recs por clave, sección comparativa**

1a. Import: añadir `recommendationKey` al import de `postureGuidance`:
```ts
import { recommendationKey, recommendationsFor } from './postureGuidance'
```

1b. `SessionPdfData`: añadir el campo:
```ts
  trend: { bars: { label: string; pct: number; current: boolean }[]; delta: number | null }
```

1c. En `buildSessionPdf`, la sección "Qué hacer" — cambiar la línea:
```ts
    const guide = recommendationsFor(data.dominantDeviation)
```
por:
```ts
    const guide = recommendationsFor(recommendationKey(data.dominantDeviation, data.zones))
```

1d. Insertar la sección "Comparación con otros días" JUSTO ANTES del bloque "// Recomendaciones (sin fuentes)" (es decir, después del bloque `if (data.calibrated) { ... }` de "Qué pasó en cada zona"):
```ts
    // Comparación con otros días
    ensure(12)
    col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Comparación con otros días', M, y); y += 6
    if (data.trend.bars.length < 2) {
      col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
      pdf.text('Primera sesión registrada — aún no hay con qué comparar.', M, y); y += 8
    } else {
      const bars = data.trend.bars
      const chartH = 20
      const gap = 3
      const barW = Math.min(16, (pageW - 2 * M - gap * (bars.length - 1)) / bars.length)
      ensure(chartH + 16)
      const baseY = y + chartH
      bars.forEach((b, i) => {
        const bx = M + i * (barW + gap)
        const h = Math.max(1.5, (b.pct / 100) * chartH)
        const lvl = scoreLevel(b.pct)
        const c = lvl === 'good' ? C.moss : lvl === 'mid' ? C.amber : C.terra
        fill(c); pdf.rect(bx, baseY - h, barW, h, 'F')
        if (b.current) {
          draw(C.ink); pdf.setLineWidth(0.5); pdf.rect(bx, baseY - h, barW, h, 'S')
          col(C.ink); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8)
          pdf.text(`${b.pct}%`, bx, baseY - h - 1.5)
        }
        col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
        pdf.text(b.label, bx, baseY + 4)
      })
      y = baseY + 9
      const d = data.trend.delta
      if (d === null) {
        col(C.soft); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
        pdf.text('Sin sesión previa.', M, y)
      } else {
        const dc = d > 0 ? C.moss : d < 0 ? C.terra : C.soft
        col(dc); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
        pdf.text(`Frente a la sesión anterior: ${d > 0 ? '+' : ''}${d} pts`, M, y)
      }
      y += 9
    }
```

- [ ] **Step 2: `SessionDetailPage.tsx` (Hero) — usar `buildTrend` y pasar `trend` al PDF**

2a. Añadir import: `import { buildTrend } from '../lib/sessionTrend'`.

2b. En `Hero`, reemplazar el bloque del `delta` (el `const delta = useMemo<number | null>(() => { ... }, [...])`) por:
```tsx
  const trendResult = useMemo(
    () =>
      buildTrend(allSessions ?? [], {
        id: session.id,
        startedAt: session.started_at,
        adequatePct: adequatePct,
        dominant,
      }),
    [allSessions, session.id, session.started_at, adequatePct, dominant],
  )
  const delta = trendResult.delta
  const shortDateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' })
  const trend = {
    bars: trendResult.points.map((p, i) => ({
      label: shortDateFmt.format(new Date(p.at)),
      pct: Math.round(p.pct),
      current: i === trendResult.currentIndex,
    })),
    delta: trendResult.delta,
  }
```
(`useMemo`, `useSessions`/`allSessions` ya están; `delta` se sigue usando igual en el JSX del Hero.)

2c. En la llamada a `buildSessionPdf({...})`, añadir el campo `trend`:
```tsx
                pauses: stats.pauseEstimate,
                trend,
```

- [ ] **Step 3: Build + suite**

Run: `npm run build && npm run test -- --run`
Expected: `tsc -b` sin errores (incl. que `SessionPdfData.trend` lo provee la página); suite verde.

- [ ] **Step 4: Verificación manual (humo) — no automatizable**

`npm run dev`; abrir una sesión con historial y descargar el PDF: confirmar (a) recomendaciones IDÉNTICAS en pantalla y PDF; (b) sección "Comparación con otros días" con mini barras + "Frente a la sesión anterior: +N pts"; con una sola sesión, "Primera sesión registrada". (Basta con build+suite verdes para commitear; el humo lo valida el humano.)

- [ ] **Step 5: Commit**

```bash
npm run build && npm run test -- --run
git add src/features/session-history/lib/sessionPdf.ts src/features/session-history/pages/SessionDetailPage.tsx
git commit -m "feat(session-report): PDF con recomendaciones por clave y comparativa entre dias"
```

---

## Notas de verificación final

- `npm run build` y `npm run test -- --run` en verde.
- Pantalla y PDF muestran las MISMAS recomendaciones (de evidencia); no aparece "No hay recomendaciones específicas" en sesiones con desviación.
- El PDF trae la comparativa entre días (barras + delta), o "Primera sesión registrada".
- `recommendationKey` y `buildTrend` son compartidos (sin lógica duplicada).
