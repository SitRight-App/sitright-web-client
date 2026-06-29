# Comparativa de postura y PDF clínico — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar al reporte de sesión un bloque "Postura correcta vs. Tu sesión" con figuras y checklist en lenguaje simple, y reemplazar el PDF-screenshot por un PDF clínico generado.

**Architecture:** Se reusa el componente SVG `SeatedFigure` (figura sentada de perfil con 3 zonas) agregándole una inclinación de torso. Un nuevo componente presentacional `PostureComparison` pinta dos figuras (ideal + sesión) + checklist. El PDF se arma con `jsPDF` (texto + las dos figuras rasterizadas desde el DOM), no con captura de pantalla.

**Tech Stack:** React 18 + TypeScript (strict) + Tailwind v3 + Vite, vitest + @testing-library/react (jsdom), jsPDF (import dinámico).

## Global Constraints

- TypeScript strict; `noUnusedLocals` y `noUnusedParameters` están en `true` → no dejar imports/variables sin uso (rompe `tsc -b`).
- Un componente por archivo. Tipos en `types/`. Un feature NO importa de otro feature; lo común va en `shared/` o en `lib/` del propio feature.
- Nada de `any` sin justificación en comentario.
- Texto secundario en `text-ink-soft` (no `text-ink-faint`) y ≥ 12px.
- `summary.adequate_percentage` ya viene en escala 0–100.
- Bandas de presentación por zona: `deviated_pct < 5 → ok`, `< 25 → leve`, `>= 25 → marcada`.
- Lean ilustrativo (no ángulo real): `forward_slouch → +12` (o `+16` si la zona peor es `marcada`), `excessive_recline → -12`/`-16`, resto `0`. Tope ±16.
- Autoría: los commits NO llevan a Claude como autor ni co-autor. Usar `git -c user.name="Christopher Lecca" -c user.email="analitica@contactototal.com.pe" commit`.
- Verificar antes de cada commit: `npm run test -- --run` y `npm run build`.

---

### Task 1: `SeatedFigure` — prop `lean` (inclinación del torso)

**Files:**
- Modify: `src/shared/ui/SeatedFigure.tsx`
- Test: `src/shared/ui/SeatedFigure.test.tsx`

**Interfaces:**
- Produces: `SeatedFigure` acepta `lean?: number` (grados; default 0). Rota el grupo del torso con `transform="rotate(<lean> 100 200)"` sobre un `<g data-figure-lean>`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/ui/SeatedFigure.test.tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeatedFigure } from './SeatedFigure'

const ok = { tone: 'ok' as const }

describe('SeatedFigure lean', () => {
  it('rota el torso cuando lean != 0', () => {
    const { container } = render(
      <SeatedFigure cervical={ok} dorsal={ok} lumbar={ok} lean={12} />,
    )
    const g = container.querySelector('[data-figure-lean]')
    expect(g?.getAttribute('transform')).toBe('rotate(12 100 200)')
  })

  it('por defecto no inclina (rotate 0)', () => {
    const { container } = render(
      <SeatedFigure cervical={ok} dorsal={ok} lumbar={ok} />,
    )
    const g = container.querySelector('[data-figure-lean]')
    expect(g?.getAttribute('transform')).toBe('rotate(0 100 200)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/shared/ui/SeatedFigure.test.tsx`
Expected: FAIL (no existe `[data-figure-lean]`).

- [ ] **Step 3: Implement — agregar el prop y envolver el torso**

En `src/shared/ui/SeatedFigure.tsx`:

3a. Añadir el prop a `Props` (después de `tight?: boolean`):

```tsx
  /** Inclina el tronco hacia adelante (+) o atrás (-) en grados. Ilustrativo. */
  lean?: number
```

3b. Añadir `lean = 0` a la desestructuración de la firma:

```tsx
export function SeatedFigure({ cervical, dorsal, lumbar, headTilt = 0, className, tight = false, lean = 0 }: Props) {
```

3c. Envolver el bloque del cuerpo superior en un grupo rotado. Insertar la apertura del grupo **justo antes** del comentario `{/* Brazo apoyado en el muslo */}` y el cierre **justo después** del `})}` que termina el `map` de nodos (antes de `</svg>`):

Apertura (nueva línea antes del comentario del brazo):
```tsx
      {/* Cuerpo superior: rota como bloque para mostrar encorvado/reclinado */}
      <g data-figure-lean transform={`rotate(${lean} 100 200)`}>
```

Cierre (nueva línea después de cerrar el `map` de nodos, antes de `</svg>`):
```tsx
      </g>
```

(La silla, el muslo y la pierna quedan FUERA del grupo; el brazo, el torso, la cabeza, la línea de columna y los nodos quedan DENTRO.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/shared/ui/SeatedFigure.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify build & commit**

```bash
npm run build
git add src/shared/ui/SeatedFigure.tsx src/shared/ui/SeatedFigure.test.tsx
git -c user.name="Christopher Lecca" -c user.email="analitica@contactototal.com.pe" commit -m "feat(ui): SeatedFigure admite inclinacion del torso (lean)"
```

---

### Task 2: Helper compartido `zoneTone`

**Files:**
- Create: `src/features/session-history/lib/zoneTone.ts`
- Modify: `src/features/session-history/components/SessionBodyMap.tsx`
- Test: `src/features/session-history/lib/zoneTone.test.ts`

**Interfaces:**
- Produces:
  - `toneFor(pct: number): 'ok' | 'leve' | 'marcada'`
  - `ZONE_LABELS: Record<SpineZone, string>` = `{ cervical:'Cuello', dorsal:'Espalda media', lumbar:'Espalda baja' }`
  - `ZONE_ORDER: SpineZone[]` = `['cervical','dorsal','lumbar']`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/session-history/lib/zoneTone.test.ts
import { describe, expect, it } from 'vitest'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'

describe('toneFor', () => {
  it('mapea las bandas de presentación', () => {
    expect(toneFor(0)).toBe('ok')
    expect(toneFor(4.9)).toBe('ok')
    expect(toneFor(5)).toBe('leve')
    expect(toneFor(24)).toBe('leve')
    expect(toneFor(25)).toBe('marcada')
  })
  it('expone etiquetas y orden de zonas', () => {
    expect(ZONE_LABELS.cervical).toBe('Cuello')
    expect(ZONE_ORDER).toEqual(['cervical', 'dorsal', 'lumbar'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/zoneTone.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement the helper**

```ts
// src/features/session-history/lib/zoneTone.ts
import type { SpineZone } from '../types/session'

/** Banda de color por % de tiempo desviado (presentación, no cutoff clínico). */
export function toneFor(pct: number): 'ok' | 'leve' | 'marcada' {
  if (pct < 5) return 'ok'
  if (pct < 25) return 'leve'
  return 'marcada'
}

/** Nombres en lenguaje cotidiano de cada zona de la columna. */
export const ZONE_LABELS: Record<SpineZone, string> = {
  cervical: 'Cuello',
  dorsal: 'Espalda media',
  lumbar: 'Espalda baja',
}

export const ZONE_ORDER: SpineZone[] = ['cervical', 'dorsal', 'lumbar']
```

- [ ] **Step 4: Refactor `SessionBodyMap` para usar el helper**

En `src/features/session-history/components/SessionBodyMap.tsx`:
- Borrar la función local `toneFor` (líneas con el comentario "Bandas de color por % de tiempo desviado..." y su cuerpo).
- Añadir el import al inicio: `import { toneFor } from '../lib/zoneTone'`.
- Quitar de la línea de import de `SeatedFigure` el tipo `FigureTone` si queda sin uso (ahora `toneFor` ya no se define aquí). Verificar: si `FigureTone` ya no se usa, dejar `import { SeatedFigure, type SeatedFigureZone } from '@/shared/ui/SeatedFigure'`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- --run src/features/session-history`
Expected: PASS.

- [ ] **Step 6: Verify build & commit**

```bash
npm run build
git add src/features/session-history/lib/zoneTone.ts src/features/session-history/lib/zoneTone.test.ts src/features/session-history/components/SessionBodyMap.tsx
git -c user.name="Christopher Lecca" -c user.email="analitica@contactototal.com.pe" commit -m "refactor(session-history): extrae toneFor y etiquetas de zona a lib/zoneTone"
```

---

### Task 3: Componente `PostureComparison`

**Files:**
- Create: `src/features/session-history/components/PostureComparison.tsx`
- Test: `src/features/session-history/components/PostureComparison.test.tsx`

**Interfaces:**
- Consumes: `SeatedFigure` (con `lean`), `toneFor`, `ZONE_LABELS`, `ZONE_ORDER`, `CARD_TONE`, `SectionEyebrow`.
- Produces:
```ts
interface PostureComparisonProps {
  zones: Record<SpineZone, ZoneDeviation>
  thresholdDeg: number
  calibrated: boolean
  adequatePct: number          // 0–100
  dominantDeviation: string | null
}
export function PostureComparison(props: PostureComparisonProps): JSX.Element
```
Cada figura se envuelve en un `<div data-pdf-figure="ideal">` y `<div data-pdf-figure="session">` (los usa el PDF para rasterizar).

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/session-history/components/PostureComparison.test.tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostureComparison } from './PostureComparison'
import type { ZoneDeviation } from '../types/session'

const z = (deviated_pct: number, avg = 18): ZoneDeviation => ({
  deviated_pct,
  minutes_in_deviation: 5,
  avg_angle_deg: avg,
  peak_angle_deg: avg + 8,
  longest_streak_min: 2,
  episodes: 3,
})

describe('PostureComparison', () => {
  it('rotula la sesión según la desviación dominante', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        thresholdDeg={20}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    expect(screen.getByText('Encorvado hacia adelante')).toBeTruthy()
    expect(screen.getByText('Postura correcta')).toBeTruthy()
  })

  it('ordena el checklist peor primero y marca zonas en rango', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        thresholdDeg={20}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Cuello')).toBeTruthy()
    expect(within(items[2]).getByText('Espalda baja')).toBeTruthy()
    expect(within(items[2]).getByText(/En rango/)).toBeTruthy()
  })

  it('sin calibración muestra aviso y omite el checklist', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(0, 0), dorsal: z(0, 0), lumbar: z(0, 0) }}
        thresholdDeg={20}
        calibrated={false}
        adequatePct={80}
        dominantDeviation={null}
      />,
    )
    expect(screen.getByText(/Calibra el chaleco/)).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
```

(Requiere matchers de jest-dom, ya configurados en `src/test-setup.ts`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/components/PostureComparison.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement the component**

```tsx
// src/features/session-history/components/PostureComparison.tsx
import { SeatedFigure } from '@/shared/ui/SeatedFigure'
import { CARD_TONE, SectionEyebrow } from '@/shared/ui/SectionEyebrow'
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from '../lib/zoneTone'

interface PostureComparisonProps {
  zones: Record<SpineZone, ZoneDeviation>
  thresholdDeg: number
  calibrated: boolean
  adequatePct: number
  dominantDeviation: string | null
}

const DOMINANT_SUB: Record<string, string> = {
  forward_slouch: 'Encorvado hacia adelante',
  excessive_recline: 'Reclinado hacia atrás',
}

function leanFor(dominant: string | null, worstTone: 'ok' | 'leve' | 'marcada'): number {
  const mag = worstTone === 'marcada' ? 16 : 12
  if (dominant === 'forward_slouch') return mag
  if (dominant === 'excessive_recline') return -mag
  return 0
}

const OK_ZONE = { tone: 'ok' as const }

export function PostureComparison({
  zones,
  calibrated,
  adequatePct,
  dominantDeviation,
}: PostureComparisonProps) {
  const ordered = ZONE_ORDER.map((z) => ({ z, d: zones[z] })).sort(
    (a, b) => b.d.deviated_pct - a.d.deviated_pct,
  )
  const worst = ordered[0]
  const anyDeviated = ordered.some(({ d }) => toneFor(d.deviated_pct) !== 'ok')
  const sectionTone = !calibrated ? 'neutral' : anyDeviated ? 'terracotta' : 'moss'

  // Figura "Tu sesión"
  const headTilt =
    toneFor(zones.cervical.deviated_pct) === 'ok'
      ? 0
      : Math.min(zones.cervical.avg_angle_deg, 32)
  const lean = calibrated ? leanFor(dominantDeviation, toneFor(worst.d.deviated_pct)) : 0
  const sessionSub = !calibrated
    ? 'Sin detalle por zona'
    : (DOMINANT_SUB[dominantDeviation ?? ''] ?? 'Alineada')

  const sessionZones = calibrated
    ? {
        cervical: { tone: toneFor(zones.cervical.deviated_pct) },
        dorsal: { tone: toneFor(zones.dorsal.deviated_pct) },
        lumbar: { tone: toneFor(zones.lumbar.deviated_pct) },
      }
    : { cervical: { tone: 'neutral' as const }, dorsal: { tone: 'neutral' as const }, lumbar: { tone: 'neutral' as const } }

  const verdict = !calibrated
    ? `Mantuviste una postura correcta el ${adequatePct}% del tiempo.`
    : anyDeviated
      ? `Mantuviste una postura correcta el ${adequatePct}% del tiempo. Tu mayor desafío fue ${ZONE_LABELS[worst.z].toLowerCase()}, desviado el ${Math.round(worst.d.deviated_pct)}% del tiempo.`
      : `Tu postura se mantuvo adecuada la mayor parte de la sesión. Buen trabajo.`

  return (
    <section className="mb-7">
      <div className={`rounded-xl border p-6 sm:p-7 ${CARD_TONE[sectionTone]}`}>
        <SectionEyebrow tone={sectionTone}>Postura</SectionEyebrow>
        <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
          Cómo te sentaste hoy
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-8">
          <figure className="text-center">
            <div data-pdf-figure="ideal" className="grid place-items-center">
              <SeatedFigure
                className="w-full max-w-[180px]"
                tight
                cervical={OK_ZONE}
                dorsal={OK_ZONE}
                lumbar={OK_ZONE}
              />
            </div>
            <figcaption className="mt-2">
              <span className="block text-[16px] font-semibold text-ink">Postura correcta</span>
              <span className="block text-[13px] text-ink-soft">Referencia</span>
            </figcaption>
          </figure>

          <figure className="text-center">
            <div data-pdf-figure="session" className="grid place-items-center">
              <SeatedFigure
                className="w-full max-w-[180px]"
                tight
                headTilt={headTilt}
                lean={lean}
                cervical={sessionZones.cervical}
                dorsal={sessionZones.dorsal}
                lumbar={sessionZones.lumbar}
              />
            </div>
            <figcaption className="mt-2">
              <span className="block text-[16px] font-semibold text-ink">Tu sesión</span>
              <span className="block text-[13px] text-ink-soft">{sessionSub}</span>
            </figcaption>
          </figure>
        </div>

        <p className="mt-6 max-w-[760px] text-[16px] leading-relaxed text-ink-soft">{verdict}</p>

        {calibrated && (
          <ul className="mt-5 space-y-2.5">
            {ordered.map(({ z, d }) => {
              const tone = toneFor(d.deviated_pct)
              const ok = tone === 'ok'
              return (
                <li
                  key={z}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${ok ? 'border-sand bg-cream-bone' : 'border-terracotta/30 bg-terracotta/[0.06]'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${ok ? 'bg-moss/12 text-moss' : 'bg-terracotta/15 text-terracotta-deep'}`}
                      aria-hidden
                    >
                      {ok ? '✓' : '!'}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[16px] font-semibold text-ink">{ZONE_LABELS[z]}</span>
                      <p className="mt-0.5 text-[13px] text-ink-soft">
                        {ok
                          ? 'Se mantuvo dentro de lo recomendado'
                          : `Se inclinó ${Math.round(d.avg_angle_deg)}° el ${Math.round(d.deviated_pct)}% del tiempo`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${ok ? 'bg-moss/12 text-moss' : 'bg-terracotta/15 text-terracotta-deep'}`}
                  >
                    {ok ? 'En rango' : 'Atención'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {!calibrated && (
          <p className="mt-4 rounded-lg border border-sand bg-cream-bone px-4 py-3 text-[14px] text-ink-soft">
            Calibra el chaleco para ver el detalle por zona de esta sesión.
          </p>
        )}

        <p className="mt-5 text-[12px] leading-relaxed text-ink-soft">
          Encorvado: espalda o cuello inclinados hacia adelante. Reclinado: tronco echado hacia
          atrás. Este resumen es un prediagnóstico orientativo y no reemplaza la evaluación de un
          profesional de salud.
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/components/PostureComparison.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify build & commit**

```bash
npm run build
git add src/features/session-history/components/PostureComparison.tsx src/features/session-history/components/PostureComparison.test.tsx
git -c user.name="Christopher Lecca" -c user.email="analitica@contactototal.com.pe" commit -m "feat(session-history): bloque comparativo postura correcta vs sesion"
```

---

### Task 4: Integrar `PostureComparison` en `SessionDetailPage` (reemplaza `ZoneReport`)

**Files:**
- Modify: `src/features/session-history/pages/SessionDetailPage.tsx`

**Interfaces:**
- Consumes: `PostureComparison` (Task 3), `useZoneAnalysis` (ya existe).
- Produces: función local `PostureComparisonSection({ sessionId, summary })` que reemplaza a `ZoneReport`.

- [ ] **Step 1: Reemplazar el uso en el JSX**

En `src/features/session-history/pages/SessionDetailPage.tsx`, línea ~254, cambiar:
```tsx
      <ZoneReport sessionId={session.id} />
```
por:
```tsx
      <PostureComparisonSection sessionId={session.id} summary={session.summary} />
```

- [ ] **Step 2: Borrar código muerto y helpers ahora sin uso**

Eliminar por completo (todas dentro del rango ~556–722): los helpers `ZONE_LABELS`, `ZONE_ORDER`, `type Severity`, `severityOf`, `SEV_LABEL`, `fmtMin`, `zoneSummary`, y las funciones `ZoneReport` y `ZoneAnnotation`. (Quedan sin uso al quitar `ZoneReport`; `noUnusedLocals` rompería el build si se dejan.)

Eliminar también el import sin uso de la línea 9:
```tsx
import { SessionBodyMap } from '../components/SessionBodyMap'
```

- [ ] **Step 3: Agregar imports y la nueva sección contenedora**

Añadir al bloque de imports:
```tsx
import { PostureComparison } from '../components/PostureComparison'
```
(`useZoneAnalysis` ya se importa; `SkeletonCard`, `Skeleton`, `SkeletonTextLine` ya están importados.)

Agregar la función contenedora (por ejemplo, donde estaba `ZoneReport`):
```tsx
function PostureComparisonSection({
  sessionId,
  summary,
}: {
  sessionId: string
  summary: SessionSummary | null
}) {
  const { data, isLoading, isError } = useZoneAnalysis(sessionId)

  if (isLoading) {
    return (
      <section className="mb-7">
        <SkeletonCard>
          <SkeletonTextLine width="40%" />
          <Skeleton width="100%" height={240} className="mt-4" />
        </SkeletonCard>
      </section>
    )
  }

  // Endpoint nuevo: sesiones viejas o backend sin desplegar → no romper la página.
  if (isError || !data) return null

  return (
    <PostureComparison
      zones={data.zones}
      thresholdDeg={data.threshold_degrees}
      calibrated={data.calibrated && data.total_readings > 0}
      adequatePct={summary?.adequate_percentage != null ? Math.round(summary.adequate_percentage) : 0}
      dominantDeviation={summary?.dominant_deviation ?? null}
    />
  )
}
```

- [ ] **Step 4: Verificar tipos, tests y build**

Run: `npm run test -- --run && npm run build`
Expected: PASS y `tsc -b` sin errores de "unused" ni de tipos. Si `tsc` reporta algún helper aún referenciado, revisar el paso 2 (no debería: todos se usaban solo dentro de `ZoneReport`/`ZoneAnnotation`/`zoneSummary`).

- [ ] **Step 5: Commit**

```bash
git add src/features/session-history/pages/SessionDetailPage.tsx
git -c user.name="Christopher Lecca" -c user.email="analitica@contactototal.com.pe" commit -m "feat(session-report): usa comparativa de postura en lugar de carga por zona"
```

---

### Task 5: Helpers puros del PDF (`sessionPdf`)

**Files:**
- Create: `src/features/session-history/lib/sessionPdf.ts`
- Test: `src/features/session-history/lib/sessionPdf.test.ts`

**Interfaces:**
- Produces (todas puras, sin DOM):
  - `buildFindings(zones: Record<SpineZone, ZoneDeviation>): { good: string[]; improve: string[] }`
  - `buildZoneTableRows(zones: Record<SpineZone, ZoneDeviation>): string[][]` (filas `[zona, % desviado, áng. prom, pico, episodios]`)
  - `recommendationsFor(dominant: string | null): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/session-history/lib/sessionPdf.test.ts
import { describe, expect, it } from 'vitest'
import { buildFindings, buildZoneTableRows, recommendationsFor } from './sessionPdf'
import type { ZoneDeviation } from '../types/session'

const z = (deviated_pct: number, avg = 18): ZoneDeviation => ({
  deviated_pct,
  minutes_in_deviation: 5,
  avg_angle_deg: avg,
  peak_angle_deg: avg + 8,
  longest_streak_min: 2,
  episodes: 3,
})

describe('sessionPdf helpers', () => {
  it('separa hallazgos buenos y a mejorar', () => {
    const f = buildFindings({ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) })
    expect(f.improve.some((s) => s.includes('Cuello'))).toBe(true)
    expect(f.good.some((s) => s.includes('Espalda baja'))).toBe(true)
  })

  it('arma filas de tabla en orden de zonas', () => {
    const rows = buildZoneTableRows({ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) })
    expect(rows).toHaveLength(3)
    expect(rows[0][0]).toBe('Cuello')
    expect(rows[0][1]).toBe('41%')
  })

  it('da recomendaciones según la desviación dominante', () => {
    expect(recommendationsFor('forward_slouch').length).toBeGreaterThanOrEqual(2)
    expect(recommendationsFor('excessive_recline').length).toBeGreaterThanOrEqual(2)
    expect(recommendationsFor(null).length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/sessionPdf.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement the pure helpers**

```ts
// src/features/session-history/lib/sessionPdf.ts
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'

export function buildFindings(zones: Record<SpineZone, ZoneDeviation>): {
  good: string[]
  improve: string[]
} {
  const good: string[] = []
  const improve: string[] = []
  for (const z of ZONE_ORDER) {
    const d = zones[z]
    if (toneFor(d.deviated_pct) === 'ok') {
      good.push(`${ZONE_LABELS[z]}: se mantuvo en rango durante la sesión.`)
    } else {
      improve.push(
        `${ZONE_LABELS[z]}: desviada el ${Math.round(d.deviated_pct)}% del tiempo (≈${Math.round(d.avg_angle_deg)}°).`,
      )
    }
  }
  return { good, improve }
}

export function buildZoneTableRows(zones: Record<SpineZone, ZoneDeviation>): string[][] {
  return ZONE_ORDER.map((z) => {
    const d = zones[z]
    return [
      ZONE_LABELS[z],
      `${Math.round(d.deviated_pct)}%`,
      `${Math.round(d.avg_angle_deg)}°`,
      `${Math.round(d.peak_angle_deg)}°`,
      String(d.episodes),
    ]
  })
}

const RECS: Record<string, string[]> = {
  forward_slouch: [
    'Coloca la pantalla a la altura de los ojos para no inclinar el cuello.',
    'Apoya la zona lumbar en el respaldo y evita encorvarte hacia el escritorio.',
    'Haz pausas activas con estiramientos de cuello cada 45 minutos.',
  ],
  excessive_recline: [
    'Ajusta el respaldo para que el tronco quede casi vertical.',
    'Mantén los pies apoyados en el suelo y la cadera al fondo del asiento.',
    'Evita deslizarte hacia adelante en la silla.',
  ],
}

export function recommendationsFor(dominant: string | null): string[] {
  return (
    RECS[dominant ?? ''] ?? [
      'Mantén la pantalla a la altura de los ojos y la espalda apoyada en el respaldo.',
      'Haz pausas activas cada 45–60 minutos.',
    ]
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/lib/sessionPdf.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/session-history/lib/sessionPdf.ts src/features/session-history/lib/sessionPdf.test.ts
git -c user.name="Christopher Lecca" -c user.email="analitica@contactototal.com.pe" commit -m "feat(session-history): helpers puros para el PDF clinico"
```

---

### Task 6: PDF clínico generado + cableado en la página

**Files:**
- Modify: `src/features/session-history/lib/sessionPdf.ts` (agrega `buildSessionPdf`)
- Modify: `src/features/session-history/pages/SessionDetailPage.tsx` (usa `buildSessionPdf`, quita el screenshot)

**Interfaces:**
- Consumes: `buildFindings`, `buildZoneTableRows`, `recommendationsFor` (Task 5); los `<div data-pdf-figure>` que renderiza `PostureComparison` (Task 3).
- Produces:
```ts
export interface SessionPdfData {
  sessionId: string
  dateLabel: string          // p. ej. "lunes 29 de junio"
  durationLabel: string      // p. ej. "14 min"
  adequatePct: number        // 0–100
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
  dominantDeviation: string | null
}
export async function buildSessionPdf(data: SessionPdfData): Promise<void>
```

- [ ] **Step 1: Implementar `buildSessionPdf` (agregar a `sessionPdf.ts`)**

Agregar estos imports de tipos al inicio del archivo (junto a los existentes):
```ts
// (los imports de SpineZone/ZoneDeviation y zoneTone ya existen del Task 5)
```

Y agregar al final del archivo:

```ts
/** Rasteriza un <svg> del DOM a PNG dataURL. Devuelve null si falla. */
async function svgToPng(svg: SVGSVGElement, scale = 3): Promise<string | null> {
  try {
    const rect = svg.getBoundingClientRect()
    const w = Math.max(rect.width, 120)
    const h = Math.max(rect.height, 150)
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(w))
    clone.setAttribute('height', String(h))
    const xml = new XMLSerializer().serializeToString(clone)
    const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = w * scale
    canvas.height = h * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function figurePng(which: 'ideal' | 'session'): Promise<string | null> {
  const svg = document.querySelector<SVGSVGElement>(`[data-pdf-figure="${which}"] svg`)
  return svg ? svgToPng(svg) : Promise.resolve(null)
}

export async function buildSessionPdf(data: SessionPdfData): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf')
    const [idealPng, sessionPng] = await Promise.all([figurePng('ideal'), figurePng('session')])

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const M = 16
    let y = M

    const inkColor = () => pdf.setTextColor(44, 49, 43)
    const softColor = () => pdf.setTextColor(74, 82, 73)

    // Encabezado
    pdf.setTextColor(45, 74, 54)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text('SitRight', M, y + 2)
    softColor()
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.text('Reporte de sesión postural', M, y + 9)
    inkColor()
    pdf.setFontSize(12)
    pdf.text(`${data.dateLabel}  ·  ${data.durationLabel}`, M, y + 16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Postura correcta: ${data.adequatePct}% del tiempo`, M, y + 23)
    pdf.setFont('helvetica', 'normal')
    y += 32
    pdf.setDrawColor(214, 211, 203)
    pdf.line(M, y, pageW - M, y)
    y += 8

    // Comparación (figuras)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    inkColor()
    pdf.text('Cómo te sentaste hoy', M, y)
    y += 4
    const figW = 50
    const figH = 64
    const colGap = 24
    const x1 = M
    const x2 = M + figW + colGap
    if (idealPng) pdf.addImage(idealPng, 'PNG', x1, y, figW, figH)
    if (sessionPng) pdf.addImage(sessionPng, 'PNG', x2, y, figW, figH)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('Postura correcta', x1, y + figH + 6)
    pdf.text('Tu sesión', x2, y + figH + 6)
    y += figH + 14

    // Hallazgos
    const { good, improve } = buildFindings(data.zones)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Hallazgos', M, y)
    y += 6
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    softColor()
    if (data.calibrated) {
      for (const line of [...improve.map((s) => `• A corregir — ${s}`), ...good.map((s) => `• Bien — ${s}`)]) {
        const wrapped = pdf.splitTextToSize(line, pageW - M * 2)
        pdf.text(wrapped, M, y)
        y += wrapped.length * 5 + 1
      }
    } else {
      pdf.text('El chaleco no estaba calibrado: no hay detalle por zona en esta sesión.', M, y)
      y += 6
    }
    y += 4

    // Tabla por zona (solo con calibración)
    if (data.calibrated) {
      const headers = ['Zona', '% desviado', 'Áng. prom.', 'Pico', 'Episodios']
      const rows = buildZoneTableRows(data.zones)
      const colX = [M, M + 46, M + 80, M + 110, M + 135]
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      inkColor()
      headers.forEach((h, i) => pdf.text(h, colX[i], y))
      y += 2
      pdf.setDrawColor(214, 211, 203)
      pdf.line(M, y, pageW - M, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      softColor()
      for (const row of rows) {
        row.forEach((cell, i) => pdf.text(cell, colX[i], y))
        y += 6
      }
      y += 4
    }

    // Recomendaciones
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    inkColor()
    pdf.text('Recomendaciones', M, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    softColor()
    for (const rec of recommendationsFor(data.dominantDeviation)) {
      const wrapped = pdf.splitTextToSize(`• ${rec}`, pageW - M * 2)
      pdf.text(wrapped, M, y)
      y += wrapped.length * 5 + 1
    }

    // Pie
    const footY = pdf.internal.pageSize.getHeight() - 14
    pdf.setFontSize(8)
    pdf.setTextColor(120, 126, 118)
    pdf.text(
      'Prediagnóstico orientativo; no reemplaza la evaluación de un profesional de salud.',
      M,
      footY,
    )

    pdf.save(`sitright-sesion-${data.sessionId.slice(0, 8)}.pdf`)
  } catch {
    // Último recurso: diálogo de impresión del navegador.
    window.print()
  }
}
```

- [ ] **Step 2: Cablear la página para usar `buildSessionPdf`**

En `src/features/session-history/pages/SessionDetailPage.tsx`:

2a. Borrar por completo la función `exportSessionToPdf` (la que usa `html2canvas`).

2b. Agregar el import:
```tsx
import { buildSessionPdf } from '../lib/sessionPdf'
```

2c. En el componente de página (donde se tiene `session` y se renderiza el botón "Descargar PDF"), obtener el análisis de zonas a nivel de página para el PDF (TanStack Query lo cachea, no genera doble request):
```tsx
  const { data: zoneData } = useZoneAnalysis(session.id)
```
(colócalo junto a los demás hooks del componente, después de tener `session`).

2d. Reemplazar el `onClick` del botón:
```tsx
            onClick={() =>
              void buildSessionPdf({
                sessionId: session.id,
                dateLabel: dateLongFmt.format(new Date(session.started_at)),
                durationLabel: `${session.summary?.total_minutes ?? session.duration_minutes ?? 0} min`,
                adequatePct:
                  session.summary?.adequate_percentage != null
                    ? Math.round(session.summary.adequate_percentage)
                    : 0,
                zones:
                  zoneData?.zones ?? {
                    cervical: EMPTY_ZONE,
                    dorsal: EMPTY_ZONE,
                    lumbar: EMPTY_ZONE,
                  },
                calibrated: !!zoneData?.calibrated && (zoneData?.total_readings ?? 0) > 0,
                dominantDeviation: session.summary?.dominant_deviation ?? null,
              })
            }
```

2e. Agregar la constante `EMPTY_ZONE` cerca de los helpers de la página (para el fallback si aún no cargó el análisis):
```tsx
const EMPTY_ZONE: ZoneDeviation = {
  deviated_pct: 0,
  minutes_in_deviation: 0,
  avg_angle_deg: 0,
  peak_angle_deg: 0,
  longest_streak_min: 0,
  episodes: 0,
}
```
(`ZoneDeviation` ya está importado.)

2f. Si `html2canvas` queda sin uso en el repo, no hace falta desinstalarlo (YAGNI); solo asegúrate de que `SessionDetailPage` ya no lo importa.

- [ ] **Step 3: Verificar tests y build**

Run: `npm run test -- --run && npm run build`
Expected: PASS y build OK. (No hay test unitario de `buildSessionPdf` porque depende de canvas/DOM real; sus partes puras ya se cubrieron en Task 5.)

- [ ] **Step 4: Verificación manual (humo)**

```bash
npm run dev
```
Abrir una sesión del historial; confirmar: (a) el bloque "Cómo te sentaste hoy" muestra las dos figuras + checklist; (b) "Descargar PDF" genera un PDF con texto seleccionable, las dos figuras, hallazgos, tabla y recomendaciones (no un screenshot).

- [ ] **Step 5: Commit**

```bash
git add src/features/session-history/lib/sessionPdf.ts src/features/session-history/pages/SessionDetailPage.tsx
git -c user.name="Christopher Lecca" -c user.email="analitica@contactototal.com.pe" commit -m "feat(session-report): PDF clinico generado en lugar de screenshot"
```

---

## Notas de verificación final (tras todas las tareas)

- `npm run test -- --run` y `npm run build` en verde.
- El reporte de un solo día comunica valor sin depender del historial: comparación + checklist + frase + PDF.
- Revisar en pantalla compartida que los grises sean `ink-soft` y legibles.
