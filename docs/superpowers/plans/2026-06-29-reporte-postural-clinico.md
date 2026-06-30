# Reporte postural clínico — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enriquecer el reporte de sesión con figuras que dibujan el ángulo por zona, lenguaje entendible (glosario), y un PDF con más información (resumen, distribución, detalle por zona) y recomendaciones basadas en evidencia.

**Architecture:** Se agregan utilidades puras (`sessionCopy` para textos del glosario, `postureGuidance` para recomendaciones citadas), se extiende `SeatedFigure` con marcadores de ángulo opt-in, se rediseña la sección `PostureComparison` (figuras con ángulo + `ZoneDetailList`), y se reconstruye el PDF (`sessionPdf.ts`) con layout en 2 columnas y la tabla por zona con encabezados del glosario.

**Tech Stack:** React 18 + TypeScript (strict) + Tailwind v3 + Vite, vitest + @testing-library/react (jsdom), jsPDF (import dinámico).

## Global Constraints

- TypeScript strict; `noUnusedLocals` y `noUnusedParameters` = `true` → sin imports/variables sin uso.
- Un componente por archivo. Tipos en `types/`. Un feature NO importa de otro feature; lo común va en el `lib/` del propio feature o en `shared/`.
- No `any` sin justificación.
- Texto secundario `text-ink-soft` (no `text-ink-faint`), ≥ 12px.
- **Glosario obligatorio (cara al usuario):** usar SIEMPRE estos textos; PROHIBIDO mostrar "tramo máximo", "pico", "episodios", "% desviado", "ángulo promedio", o `forward_slouch`/`excessive_recline` crudos.
  - `deviated_pct` → "% del tiempo inclinada"
  - `minutes_in_deviation` → "Tiempo inclinada en total"
  - `longest_streak_min` → "Lo más que estuvo inclinada de corrido"
  - `avg_angle_deg` → "Cuánto se inclinó (promedio)"
  - `peak_angle_deg` → "Lo más que se inclinó"
  - `episodes` → "Veces que se desvió"
  - `adequate_percentage` → "% de postura correcta" · `total_minutes` → "Tiempo de uso" · `dominant_deviation` → "Desviación más frecuente" (Encorvado/Reclinado) · pausas → "Pausas"
- Leyenda al pie: "Inclinación = ángulo respecto a la posición neutra de calibración. ‘De corrido’ = tiempo continuo sin corregir."
- Ángulos de figura: ilustrativos (magnitud), no a escala.
- Recomendaciones basadas en evidencia (OSHA, ángulo craneovertebral, guías de pausas); el PDF incluye una línea "Fuentes: …".
- Commits: `git commit` NORMAL (la identidad del repo ya es Christopher `79271081+ChrisByBits@users.noreply.github.com`). NO usar `-c user.email=...`. Sin atribución a Claude.
- Verificar antes de cada commit: `npm run test -- --run` y `npm run build`.

---

### Task 1: `sessionCopy` — textos del glosario

**Files:**
- Create: `src/features/session-history/lib/sessionCopy.ts`
- Test: `src/features/session-history/lib/sessionCopy.test.ts`

**Interfaces:**
- Produces:
  - `METRIC_LABELS` (objeto con los textos del glosario)
  - `POSTURE_LEGEND: string`
  - `dominantPlain(dominant: string | null): string` → 'Encorvado' | 'Reclinado' | 'Ninguna'

- [ ] **Step 1: Write the failing test**

```ts
// src/features/session-history/lib/sessionCopy.test.ts
import { describe, expect, it } from 'vitest'
import { METRIC_LABELS, POSTURE_LEGEND, dominantPlain } from './sessionCopy'

describe('sessionCopy', () => {
  it('no usa términos prohibidos en las etiquetas', () => {
    const all = Object.values(METRIC_LABELS).join(' | ') + ' ' + POSTURE_LEGEND
    expect(all).not.toMatch(/tramo máximo|pico|episodios|% desviado|ángulo promedio/i)
  })
  it('etiquetas clave en lenguaje llano', () => {
    expect(METRIC_LABELS.longestStreak).toBe('Lo más que estuvo inclinada de corrido')
    expect(METRIC_LABELS.episodes).toBe('Veces que se desvió')
    expect(METRIC_LABELS.peakAngle).toBe('Lo más que se inclinó')
  })
  it('dominantPlain traduce a palabras', () => {
    expect(dominantPlain('forward_slouch')).toBe('Encorvado')
    expect(dominantPlain('excessive_recline')).toBe('Reclinado')
    expect(dominantPlain(null)).toBe('Ninguna')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/sessionCopy.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement**

```ts
// src/features/session-history/lib/sessionCopy.ts
export const METRIC_LABELS = {
  deviatedPct: '% del tiempo inclinada',
  minutesInDeviation: 'Tiempo inclinada en total',
  longestStreak: 'Lo más que estuvo inclinada de corrido',
  avgAngle: 'Cuánto se inclinó (promedio)',
  peakAngle: 'Lo más que se inclinó',
  episodes: 'Veces que se desvió',
  adequatePct: '% de postura correcta',
  totalMinutes: 'Tiempo de uso',
  dominant: 'Desviación más frecuente',
  pauses: 'Pausas',
} as const

export const POSTURE_LEGEND =
  'Inclinación = ángulo respecto a la posición neutra de calibración. ‘De corrido’ = tiempo continuo sin corregir.'

export function dominantPlain(dominant: string | null): string {
  if (dominant === 'forward_slouch') return 'Encorvado'
  if (dominant === 'excessive_recline') return 'Reclinado'
  return 'Ninguna'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/lib/sessionCopy.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/session-history/lib/sessionCopy.ts src/features/session-history/lib/sessionCopy.test.ts
git commit -m "feat(session-history): glosario de textos entendibles (sessionCopy)"
```

---

### Task 2: `postureGuidance` — recomendaciones con evidencia

**Files:**
- Create: `src/features/session-history/lib/postureGuidance.ts`
- Test: `src/features/session-history/lib/postureGuidance.test.ts`

**Interfaces:**
- Produces: `recommendationsFor(dominant: string | null): { tips: string[]; sources: string[] }`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/session-history/lib/postureGuidance.test.ts
import { describe, expect, it } from 'vitest'
import { recommendationsFor } from './postureGuidance'

describe('recommendationsFor', () => {
  it('encorvado: monitor a la altura de los ojos y mentón; con pausas', () => {
    const r = recommendationsFor('forward_slouch')
    expect(r.tips.join(' ')).toMatch(/altura de tus ojos/i)
    expect(r.tips.join(' ')).toMatch(/mentón/i)
    expect(r.tips.join(' ')).toMatch(/30 min/)
    expect(r.sources.length).toBeGreaterThan(0)
  })
  it('reclinado: 100-110° y cadera al fondo', () => {
    const r = recommendationsFor('excessive_recline')
    expect(r.tips.join(' ')).toMatch(/100/)
    expect(r.tips.join(' ')).toMatch(/cadera al fondo/i)
    expect(r.sources.length).toBeGreaterThan(0)
  })
  it('sin desviación: guía general', () => {
    const r = recommendationsFor(null)
    expect(r.tips.length).toBeGreaterThanOrEqual(2)
    expect(r.sources.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/postureGuidance.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement**

```ts
// src/features/session-history/lib/postureGuidance.ts
// Recomendaciones de corrección postural basadas en guías ergonómicas/clínicas.
// Fuentes: OSHA Computer Workstations; ángulo craneovertebral (postura de cabeza);
// guías de pausas activas en sedentarismo.
export interface Guidance {
  tips: string[]
  sources: string[]
}

const PAUSA = 'Cada ~30 min, levántate y camina 1–2 min.'
const SOURCES = [
  'OSHA Computer Workstations',
  'Ángulo craneovertebral (postura de cabeza)',
  'Guías de pausas activas en sedentarismo',
]

const GUIDANCE: Record<string, string[]> = {
  forward_slouch: [
    'Sube la pantalla: el borde superior a la altura de tus ojos (o un poco más abajo), a un brazo de distancia, para no inclinar el cuello.',
    "Lleva el mentón ligeramente hacia atrás (como hacer 'papada') para alinear la cabeza con el tronco.",
    'Apoya bien la espalda en el respaldo con soporte lumbar; no te acerques al escritorio encorvándote.',
    PAUSA,
  ],
  excessive_recline: [
    'Endereza el respaldo a una ligera inclinación (100–110°); echarte más es para descansar, no para trabajar.',
    'Lleva la cadera al fondo del asiento y apoya los pies en el piso o un reposapiés; no te deslices hacia adelante.',
    'Usa el soporte lumbar para acompañar la curva de tu espalda baja.',
    PAUSA,
  ],
}

const GENERAL = [
  'Mantén la cabeza alineada con el tronco y la pantalla a la altura de los ojos.',
  'Espalda apoyada con soporte lumbar y pies planos en el piso.',
  'Cambia de postura seguido y camina unos minutos cada ~30 min.',
]

export function recommendationsFor(dominant: string | null): Guidance {
  return { tips: GUIDANCE[dominant ?? ''] ?? GENERAL, sources: SOURCES }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/lib/postureGuidance.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/session-history/lib/postureGuidance.ts src/features/session-history/lib/postureGuidance.test.ts
git commit -m "feat(session-history): recomendaciones posturales con evidencia (postureGuidance)"
```

---

### Task 3: `SeatedFigure` — marcadores de ángulo (opt-in)

**Files:**
- Modify: `src/shared/ui/SeatedFigure.tsx`
- Test: `src/shared/ui/SeatedFigure.angle.test.tsx`

**Interfaces:**
- Produces: `SeatedFigure` acepta `angleMarkers?: Partial<Record<'cervical' | 'dorsal' | 'lumbar', { deg: number; tone: FigureTone }>>`. Por cada zona renderiza un grupo `<g data-angle-marker>` con líneas neutra/real, arco y etiqueta `"{deg}°"`. Default ausente → sin cambios.

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/ui/SeatedFigure.angle.test.tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeatedFigure } from './SeatedFigure'

const ok = { tone: 'ok' as const }

describe('SeatedFigure angleMarkers', () => {
  it('dibuja un marcador con la etiqueta de grados', () => {
    const { container, getByText } = render(
      <SeatedFigure
        cervical={ok}
        dorsal={ok}
        lumbar={ok}
        angleMarkers={{ cervical: { deg: 22, tone: 'marcada' } }}
      />,
    )
    expect(container.querySelectorAll('[data-angle-marker]')).toHaveLength(1)
    expect(getByText('22°')).toBeTruthy()
  })
  it('sin angleMarkers no agrega marcadores', () => {
    const { container } = render(<SeatedFigure cervical={ok} dorsal={ok} lumbar={ok} />)
    expect(container.querySelectorAll('[data-angle-marker]')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/shared/ui/SeatedFigure.angle.test.tsx`
Expected: FAIL (no existe `[data-angle-marker]`).

- [ ] **Step 3: Implement**

3a. Añadir a `Props` (después de `lean?: number`):
```tsx
  /** Marcador goniométrico por zona (líneas + arco + grados). Ilustrativo. */
  angleMarkers?: Partial<Record<'cervical' | 'dorsal' | 'lumbar', { deg: number; tone: FigureTone }>>
```

3b. Añadir `angleMarkers` a la desestructuración de la firma:
```tsx
export function SeatedFigure({ cervical, dorsal, lumbar, headTilt = 0, className, tight = false, lean = 0, angleMarkers }: Props) {
```

3c. Antes del `return`, agregar el helper de marcador (dentro del componente, para acceder a `CALLOUT_TEXT`):
```tsx
  const rad = (d: number) => (d * Math.PI) / 180
  const markerEls = Object.entries(angleMarkers ?? {}).map(([zone, m]) => {
    const node = NODE[zone as keyof typeof NODE]
    const { deg, tone } = m
    const color = CALLOUT_TEXT[tone]
    const L = 20
    const r = 11
    const nx = node.x
    const ny = node.y - L
    const dx = node.x + L * Math.sin(rad(deg))
    const dy = node.y - L * Math.cos(rad(deg))
    const ax0 = node.x
    const ay0 = node.y - r
    const ax1 = node.x + r * Math.sin(rad(deg))
    const ay1 = node.y - r * Math.cos(rad(deg))
    const half = deg / 2
    const lx = node.x + (r + 7) * Math.sin(rad(half))
    const ly = node.y - (r + 7) * Math.cos(rad(half))
    return (
      <g key={zone} data-angle-marker>
        <line x1={node.x} y1={node.y} x2={nx} y2={ny} stroke={color} strokeWidth={0.8} strokeDasharray="2 2" opacity={0.6} />
        {deg > 0 && <line x1={node.x} y1={node.y} x2={dx} y2={dy} stroke={color} strokeWidth={1.4} />}
        {deg > 0 && <path d={`M ${ax0} ${ay0} A ${r} ${r} 0 0 1 ${ax1} ${ay1}`} fill="none" stroke={color} strokeWidth={1} />}
        <text x={lx} y={ly} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={9} fill={color}>
          {deg}°
        </text>
      </g>
    )
  })
```

3d. Renderizar `markerEls` DENTRO del grupo `<g data-figure-lean ...>`, justo después del `map` de nodos y antes del cierre `</g>`:
```tsx
        {markerEls}
      </g>
```
(Es decir: añadir `{markerEls}` como último hijo del grupo `data-figure-lean`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/shared/ui/SeatedFigure.angle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify build & commit**

```bash
npm run build
git add src/shared/ui/SeatedFigure.tsx src/shared/ui/SeatedFigure.angle.test.tsx
git commit -m "feat(ui): SeatedFigure dibuja el angulo por zona (angleMarkers)"
```

---

### Task 4: `ZoneDetailList` — detalle por zona con glosario

**Files:**
- Create: `src/features/session-history/components/ZoneDetailList.tsx`
- Test: `src/features/session-history/components/ZoneDetailList.test.tsx`

**Interfaces:**
- Consumes: `ZONE_LABELS`, `ZONE_ORDER`, `toneFor` (de `../lib/zoneTone`); `METRIC_LABELS` (de `../lib/sessionCopy`).
- Produces: `ZoneDetailList({ zones }: { zones: Record<SpineZone, ZoneDeviation> })` — lista por zona (peor primero) con los textos del glosario.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/session-history/components/ZoneDetailList.test.tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ZoneDetailList } from './ZoneDetailList'
import type { ZoneDeviation } from '../types/session'

const z = (deviated_pct: number, avg = 18, streak = 2): ZoneDeviation => ({
  deviated_pct,
  minutes_in_deviation: 5,
  avg_angle_deg: avg,
  peak_angle_deg: avg + 8,
  longest_streak_min: streak,
  episodes: 3,
})

describe('ZoneDetailList', () => {
  it('usa el glosario (sin "tramo máximo") y ordena peor primero', () => {
    render(<ZoneDetailList zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }} />)
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Cuello')).toBeTruthy()
    expect(screen.getByText(/Lo más que estuvo inclinada de corrido/)).toBeTruthy()
    expect(screen.queryByText(/tramo máximo/i)).toBeNull()
  })
  it('marca zonas en rango', () => {
    render(<ZoneDetailList zones={{ cervical: z(2, 0), dorsal: z(1, 0), lumbar: z(0, 0) }} />)
    expect(screen.getAllByText(/En rango/).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/components/ZoneDetailList.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement**

```tsx
// src/features/session-history/components/ZoneDetailList.tsx
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from '../lib/zoneTone'
import { METRIC_LABELS } from '../lib/sessionCopy'

export function ZoneDetailList({ zones }: { zones: Record<SpineZone, ZoneDeviation> }) {
  const ordered = ZONE_ORDER.map((z) => ({ z, d: zones[z] })).sort(
    (a, b) => b.d.deviated_pct - a.d.deviated_pct,
  )
  return (
    <ul className="mt-5 space-y-2.5">
      {ordered.map(({ z, d }) => {
        const ok = toneFor(d.deviated_pct) === 'ok'
        return (
          <li
            key={z}
            className={`rounded-lg border px-4 py-3 ${ok ? 'border-sand bg-cream-bone' : 'border-terracotta/30 bg-terracotta/[0.06]'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[16px] font-semibold text-ink">{ZONE_LABELS[z]}</span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${ok ? 'bg-moss/12 text-moss' : 'bg-terracotta/15 text-terracotta-deep'}`}
              >
                {ok ? 'En rango' : 'Atención'}
              </span>
            </div>
            {ok ? (
              <p className="mt-1 text-[13px] text-ink-soft">Se mantuvo dentro de lo recomendado.</p>
            ) : (
              <dl className="mt-2 grid grid-cols-1 gap-1 text-[13px] text-ink-soft sm:grid-cols-2">
                <div className="flex justify-between gap-3 sm:block">
                  <dt>{METRIC_LABELS.deviatedPct}</dt>
                  <dd className="font-medium text-ink">{Math.round(d.deviated_pct)}%</dd>
                </div>
                <div className="flex justify-between gap-3 sm:block">
                  <dt>{METRIC_LABELS.avgAngle}</dt>
                  <dd className="font-medium text-ink">{Math.round(d.avg_angle_deg)}°</dd>
                </div>
                <div className="flex justify-between gap-3 sm:col-span-2 sm:block">
                  <dt>{METRIC_LABELS.longestStreak}</dt>
                  <dd className="font-medium text-ink">
                    hasta {Math.max(1, Math.round(d.longest_streak_min))} min seguidos
                  </dd>
                </div>
              </dl>
            )}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/components/ZoneDetailList.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify build & commit**

```bash
npm run build
git add src/features/session-history/components/ZoneDetailList.tsx src/features/session-history/components/ZoneDetailList.test.tsx
git commit -m "feat(session-history): detalle por zona con glosario (ZoneDetailList)"
```

---

### Task 5: `PostureComparison` — figuras con ángulo + detalle + leyenda

**Files:**
- Modify: `src/features/session-history/components/PostureComparison.tsx`
- Modify: `src/features/session-history/components/PostureComparison.test.tsx`

**Interfaces:**
- Consumes: `SeatedFigure` (con `angleMarkers`), `ZoneDetailList` (Task 4), `POSTURE_LEGEND` (Task 1), `toneFor`/`ZONE_ORDER`/`ZONE_LABELS`.
- Props SIN cambios: `{ zones, calibrated, adequatePct, dominantDeviation }`.

- [ ] **Step 1: Update the test**

Reemplazar el contenido de `src/features/session-history/components/PostureComparison.test.tsx` por:
```tsx
import { render, screen } from '@testing-library/react'
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
  it('rotula la sesión y muestra el verdicto', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    expect(screen.getByText('Encorvado hacia adelante')).toBeTruthy()
    expect(screen.getByText('Postura correcta')).toBeTruthy()
    expect(screen.getByText(/Mantuviste una postura correcta el 70%/)).toBeTruthy()
  })
  it('dibuja el ángulo en la figura de la sesión y el detalle por zona', () => {
    const { container } = render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    // hay marcadores de ángulo (en ambas figuras: 0° en referencia, real en sesión)
    expect(container.querySelectorAll('[data-angle-marker]').length).toBeGreaterThan(0)
    expect(screen.getByText('22°')).toBeTruthy()
    expect(screen.getByText(/Lo más que estuvo inclinada de corrido/)).toBeTruthy()
  })
  it('sin calibración omite figuras-con-ángulo y detalle', () => {
    const { container } = render(
      <PostureComparison
        zones={{ cervical: z(0, 0), dorsal: z(0, 0), lumbar: z(0, 0) }}
        calibrated={false}
        adequatePct={80}
        dominantDeviation={null}
      />,
    )
    expect(screen.getByText(/Calibra el chaleco/)).toBeTruthy()
    expect(container.querySelectorAll('[data-angle-marker]')).toHaveLength(0)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/components/PostureComparison.test.tsx`
Expected: FAIL (no hay `[data-angle-marker]` ni el detalle con glosario aún).

- [ ] **Step 3: Implement**

Editar `src/features/session-history/components/PostureComparison.tsx`:

3a. Imports — añadir:
```tsx
import { ZoneDetailList } from './ZoneDetailList'
import { POSTURE_LEGEND } from '../lib/sessionCopy'
```
y agregar `FigureTone`:
```tsx
import { SeatedFigure, type FigureTone } from '@/shared/ui/SeatedFigure'
```

3b. Dentro del componente, calcular los marcadores de ángulo (después de `const lean = ...`):
```tsx
  // Marcadores de ángulo por zona: en la sesión, el ángulo real de las zonas
  // desviadas; en la referencia, las mismas zonas a 0°.
  const sessionMarkers: Partial<Record<'cervical' | 'dorsal' | 'lumbar', { deg: number; tone: FigureTone }>> = {}
  const idealMarkers: Partial<Record<'cervical' | 'dorsal' | 'lumbar', { deg: number; tone: FigureTone }>> = {}
  if (calibrated) {
    for (const { z, d } of ordered) {
      const t = toneFor(d.deviated_pct)
      if (t !== 'ok') {
        sessionMarkers[z] = { deg: Math.round(d.avg_angle_deg), tone: t }
        idealMarkers[z] = { deg: 0, tone: 'ok' }
      }
    }
  }
```

3c. Pasar los marcadores a las dos figuras. En la figura de referencia (`data-pdf-figure="ideal"`), añadir `angleMarkers={idealMarkers}`; en la de la sesión (`data-pdf-figure="session"`), añadir `angleMarkers={sessionMarkers}`.

3d. Reemplazar el `<ul>` del checklist actual (el bloque `{calibrated && (<ul ...>...</ul>)}`) por:
```tsx
        {calibrated && <ZoneDetailList zones={zones} />}
```

3e. Añadir la leyenda al párrafo final de definiciones (antes del disclaimer). Cambiar el párrafo final por:
```tsx
        <p className="mt-5 text-[12px] leading-relaxed text-ink-soft">
          Encorvado: espalda o cuello inclinados hacia adelante. Reclinado: tronco echado hacia
          atrás. {POSTURE_LEGEND} Este resumen es un prediagnóstico orientativo y no reemplaza la
          evaluación de un profesional de salud.
        </p>
```

(El bloque `{!calibrated && (<p>Calibra el chaleco…</p>)}` se mantiene.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/features/session-history/components/PostureComparison.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify build & commit**

```bash
npm run build
git add src/features/session-history/components/PostureComparison.tsx src/features/session-history/components/PostureComparison.test.tsx
git commit -m "feat(session-report): figuras con angulo por zona + detalle con glosario"
```

---

### Task 6: `sessionPdf` — helpers (tabla con glosario, distribución, limpieza)

**Files:**
- Modify: `src/features/session-history/lib/sessionPdf.ts`
- Modify: `src/features/session-history/lib/sessionPdf.test.ts`

**Interfaces:**
- Produces:
  - `ZONE_TABLE_HEADERS: string[]` = `['Zona', '% del tiempo inclinada', 'Cuánto se inclinó', 'Lo más que se inclinó', 'De corrido', 'Veces']`
  - `buildZoneTableRows(zones)` → filas de 6 columnas con esos datos.
  - `buildDistribution(countsByClass: Record<string, number>)` → `{ label: string; pct: number }[]` (Correcta/Encorvado/Reclinado, excluye `indeterminate`).
- Removes: `buildFindings` y el `recommendationsFor`/`RECS` locales (las recomendaciones ahora vienen de `postureGuidance`).

- [ ] **Step 1: Update the test**

En `src/features/session-history/lib/sessionPdf.test.ts`, reemplazar el import y los tests por:
```ts
import { describe, expect, it } from 'vitest'
import { ZONE_TABLE_HEADERS, buildDistribution, buildZoneTableRows } from './sessionPdf'
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
  it('encabezados de tabla en lenguaje del glosario', () => {
    expect(ZONE_TABLE_HEADERS.join(' ')).not.toMatch(/% desviado|pico|episodios|tramo máximo/i)
    expect(ZONE_TABLE_HEADERS).toContain('% del tiempo inclinada')
  })
  it('arma filas de 6 columnas en orden de zonas', () => {
    const rows = buildZoneTableRows({ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) })
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveLength(6)
    expect(rows[0][0]).toBe('Cuello')
    expect(rows[0][1]).toBe('41%')
  })
  it('distribución excluye indeterminate y suma ~100', () => {
    const dist = buildDistribution({ adequate: 80, forward_slouch: 15, excessive_recline: 5, indeterminate: 50 })
    const labels = dist.map((d) => d.label)
    expect(labels).toContain('Correcta')
    expect(labels).not.toContain('Indeterminada')
    expect(Math.round(dist.reduce((a, d) => a + d.pct, 0))).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/features/session-history/lib/sessionPdf.test.ts`
Expected: FAIL (`ZONE_TABLE_HEADERS`/`buildDistribution` no existen; `buildZoneTableRows` aún 5 col).

- [ ] **Step 3: Implement helpers**

En `sessionPdf.ts`:

3a. Imports al inicio: reemplazar el import de `./zoneTone` por uno que NO traiga lo que ya no se use, y añadir:
```ts
import { ZONE_LABELS, ZONE_ORDER } from './zoneTone'
```
(Quitar `toneFor` del import si `buildFindings` —que lo usaba— se elimina. Verificar con build.)

3b. Eliminar `buildFindings` y el bloque `const RECS` + `recommendationsFor` locales (se reemplazan por `postureGuidance`).

3c. Reemplazar `buildZoneTableRows` y añadir headers + distribución:
```ts
export const ZONE_TABLE_HEADERS = [
  'Zona',
  '% del tiempo inclinada',
  'Cuánto se inclinó',
  'Lo más que se inclinó',
  'De corrido',
  'Veces',
]

export function buildZoneTableRows(zones: Record<SpineZone, ZoneDeviation>): string[][] {
  return ZONE_ORDER.map((z) => {
    const d = zones[z]
    return [
      ZONE_LABELS[z],
      `${Math.round(d.deviated_pct)}%`,
      `${Math.round(d.avg_angle_deg)}°`,
      `${Math.round(d.peak_angle_deg)}°`,
      `${Math.max(1, Math.round(d.longest_streak_min))} min`,
      String(d.episodes),
    ]
  })
}

const DIST_LABELS: Record<string, string> = {
  adequate: 'Correcta',
  forward_slouch: 'Encorvado',
  excessive_recline: 'Reclinado',
}

export function buildDistribution(countsByClass: Record<string, number>): { label: string; pct: number }[] {
  const order = ['adequate', 'forward_slouch', 'excessive_recline']
  const total = order.reduce((a, k) => a + (countsByClass[k] ?? 0), 0)
  if (total === 0) return []
  return order
    .filter((k) => (countsByClass[k] ?? 0) > 0)
    .map((k) => ({ label: DIST_LABELS[k], pct: ((countsByClass[k] ?? 0) / total) * 100 }))
}
```

- [ ] **Step 4: Run test to verify it passes (helpers)**

Run: `npm run test -- --run src/features/session-history/lib/sessionPdf.test.ts`
Expected: PASS (3 tests).

> NO commitees todavía: al quitar `buildFindings`/`recommendationsFor` la `buildSessionPdf` actual deja de compilar. Continúa con los Steps 5–8 y haz UN solo commit (Step 9) con el build y la suite en verde.

- [ ] **Step 5: Ampliar `SessionPdfData` y reescribir `buildSessionPdf`**

`SessionPdfData` ampliado:
```ts
export interface SessionPdfData {
  sessionId: string
  dateLabel: string
  totalMinutes: number
  adequatePct: number
  dominantDeviation: string | null
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
  countsByClass: Record<string, number>
  pauses: number
}
```

Y reescribir el cuerpo de `buildSessionPdf` en `sessionPdf.ts`. Mantener `svgToPng`/`figurePng` y el guard de paginación `ensure`. Añadir imports:
```ts
import { recommendationsFor } from './postureGuidance'
import { METRIC_LABELS, POSTURE_LEGEND, dominantPlain } from './sessionCopy'
```
Cuerpo (A4, mm; conserva el `try/catch → window.print()`):
```ts
export async function buildSessionPdf(data: SessionPdfData): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf')
    const [idealPng, sessionPng] = await Promise.all([figurePng('ideal'), figurePng('session')])

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const M = 16
    const BOTTOM = pageH - 18
    let y = M
    const ensure = (h: number) => {
      if (y + h > BOTTOM) { pdf.addPage(); y = M }
    }
    const ink = () => pdf.setTextColor(44, 49, 43)
    const soft = () => pdf.setTextColor(74, 82, 73)

    // Encabezado
    pdf.setTextColor(45, 74, 54); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18)
    pdf.text('SitRight', M, y + 2)
    soft(); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11)
    pdf.text('Reporte de sesión postural', M, y + 9)
    ink(); pdf.setFontSize(12)
    pdf.text(`${data.dateLabel}  ·  ${METRIC_LABELS.totalMinutes}: ${data.totalMinutes} min`, M, y + 16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${METRIC_LABELS.adequatePct}: ${data.adequatePct}%`, M, y + 23)
    pdf.setFont('helvetica', 'normal')
    y += 31
    pdf.setDrawColor(214, 211, 203); pdf.line(M, y, pageW - M, y); y += 8

    // Resumen (izq) + Distribución (der)
    const colR = M + 92
    ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Resumen', M, y)
    pdf.text('Distribución', colR, y)
    y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); soft()
    const resumen = [
      `${METRIC_LABELS.totalMinutes}: ${data.totalMinutes} min`,
      `${METRIC_LABELS.adequatePct}: ${data.adequatePct}%`,
      `${METRIC_LABELS.dominant}: ${dominantPlain(data.dominantDeviation)}`,
      `${METRIC_LABELS.pauses}: ${data.pauses}`,
    ]
    const dist = buildDistribution(data.countsByClass)
    const rowsN = Math.max(resumen.length, dist.length || 1)
    for (let i = 0; i < rowsN; i++) {
      ensure(6)
      if (resumen[i]) pdf.text(`• ${resumen[i]}`, M, y)
      if (dist[i]) pdf.text(`• ${dist[i].label}: ${Math.round(dist[i].pct)}%`, colR, y)
      y += 6
    }
    if (dist.length === 0) { pdf.text('Sin datos suficientes de distribución.', colR, y - rowsN * 6) }
    y += 4

    // Cómo te sentaste hoy (figuras)
    const figW = 50, figH = 64
    ensure(4 + figH + 14)
    ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
    pdf.text('Cómo te sentaste hoy', M, y); y += 4
    const x1 = M, x2 = M + figW + 24
    if (idealPng) pdf.addImage(idealPng, 'PNG', x1, y, figW, figH)
    if (sessionPng) pdf.addImage(sessionPng, 'PNG', x2, y, figW, figH)
    pdf.setFontSize(11)
    pdf.text('Postura correcta', x1, y + figH + 6)
    pdf.text('Tu sesión', x2, y + figH + 6)
    y += figH + 14

    // Detalle por zona (tabla con glosario) — solo con calibración
    if (data.calibrated) {
      ensure(13)
      ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
      pdf.text('Detalle por zona', M, y); y += 6
      const colX = [M, M + 26, M + 78, M + 116, M + 150, M + 176]
      pdf.setFontSize(8)
      ZONE_TABLE_HEADERS.forEach((h, i) => pdf.text(h, colX[i], y))
      y += 2; pdf.setDrawColor(214, 211, 203); pdf.line(M, y, pageW - M, y); y += 5
      pdf.setFont('helvetica', 'normal'); soft(); pdf.setFontSize(8)
      for (const row of buildZoneTableRows(data.zones)) {
        ensure(6)
        row.forEach((cell, i) => pdf.text(cell, colX[i], y))
        y += 6
      }
      ensure(6)
      pdf.setFontSize(7)
      pdf.text(pdf.splitTextToSize(POSTURE_LEGEND, pageW - M * 2), M, y)
      y += 8
    }

    // Recomendaciones (evidencia) + Fuentes
    const guide = recommendationsFor(data.dominantDeviation)
    ensure(12)
    ink(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('Recomendaciones', M, y); y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); soft()
    for (const tip of guide.tips) {
      const wrapped = pdf.splitTextToSize(`• ${tip}`, pageW - M * 2)
      ensure(wrapped.length * 5 + 1)
      pdf.text(wrapped, M, y); y += wrapped.length * 5 + 1
    }
    ensure(6)
    pdf.setFontSize(8)
    pdf.text(pdf.splitTextToSize(`Fuentes: ${guide.sources.join('; ')}.`, pageW - M * 2), M, y + 1)

    // Pie en todas las páginas
    const pageCount = pdf.getNumberOfPages()
    pdf.setFontSize(8); pdf.setTextColor(120, 126, 118)
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p)
      pdf.text('Prediagnóstico orientativo; no reemplaza la evaluación de un profesional de salud.', M, pageH - 14)
    }

    pdf.save(`sitright-sesion-${data.sessionId.slice(0, 8)}.pdf`)
  } catch {
    window.print()
  }
}
```

- [ ] **Step 6: Cablear la página**

En `SessionDetailPage.tsx`, en la llamada a `buildSessionPdf({...})` (dentro de `Hero`), reemplazar el objeto por:
```tsx
              void buildSessionPdf({
                sessionId: session.id,
                dateLabel: dateLongFmt.format(new Date(session.started_at)),
                totalMinutes: summary?.total_minutes ?? session.duration_minutes ?? 0,
                adequatePct:
                  summary?.adequate_percentage != null ? Math.round(summary.adequate_percentage) : 0,
                dominantDeviation: dominant,
                zones:
                  zoneData?.zones ?? {
                    cervical: EMPTY_ZONE,
                    dorsal: EMPTY_ZONE,
                    lumbar: EMPTY_ZONE,
                  },
                calibrated: !!zoneData?.calibrated && (zoneData?.total_readings ?? 0) > 0,
                countsByClass: summary?.counts_by_class ?? {},
                pauses: stats.pauseEstimate,
              })
```
Confirmar que `Hero` recibe `stats` (sí: `Hero({ session, effective, stats })`) y que `summary`/`dominant` están en alcance dentro de `Hero` (vienen de `effective`). `dateLongFmt`, `EMPTY_ZONE`, `zoneData`, `buildSessionPdf` ya existen/están importados.

- [ ] **Step 7: Verificar build + suite**

Run: `npm run build && npm run test -- --run`
Expected: `tsc -b` sin errores; toda la suite verde. (`buildSessionPdf` no tiene test unitario por depender de canvas/DOM; sus partes puras se cubrieron en los Steps 1–4.)

- [ ] **Step 8: Verificación manual (humo)**

```bash
npm run dev
```
Abrir una sesión: confirmar (a) la sección "Postura" muestra los arcos de ángulo por zona y el detalle con "Lo más que estuvo inclinada de corrido"; (b) "Descargar PDF" genera un PDF con Resumen + Distribución, las figuras con ángulo, la tabla por zona con leyenda y las recomendaciones con "Fuentes:".

- [ ] **Step 9: Commit (helpers + buildSessionPdf + cableado, juntos)**

```bash
npm run build && npm run test -- --run
git add src/features/session-history/lib/sessionPdf.ts src/features/session-history/lib/sessionPdf.test.ts src/features/session-history/pages/SessionDetailPage.tsx
git commit -m "feat(session-report): PDF clinico con resumen, distribucion, angulos y recomendaciones citadas"
```

---

## Notas de verificación final (tras todas las tareas)

- `npm run test -- --run` y `npm run build` en verde.
- Ningún término prohibido del glosario aparece de cara al usuario (sección ni PDF).
- Las figuras dibujan el ángulo por zona (correcta 0° vs. sesión real).
- El PDF incluye resumen, distribución, detalle por zona con leyenda, y recomendaciones con "Fuentes:".
- El dashboard en vivo NO cambió (no se pasó `angleMarkers` ahí).
