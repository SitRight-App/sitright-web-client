import { useMemo } from 'react'
import type {
  PostureClass,
  TimelineReading,
} from '@/features/posture-visualization/types/posture'

interface Props {
  readings: TimelineReading[]
  isLoading: boolean
  isError: boolean
}

const SEGMENT_BG: Record<PostureClass, string> = {
  adequate: 'rgb(var(--color-moss))',
  forward_slouch: 'rgb(var(--color-terracotta-soft))',
  excessive_recline: 'rgb(var(--color-terracotta))',
  indeterminate: 'rgb(var(--color-ink-faint) / 0.4)',
}

const POSTURE_SHORT: Record<PostureClass, string> = {
  adequate: 'Adecuada',
  forward_slouch: 'Cervical',
  excessive_recline: 'Lumbar',
  indeterminate: 'Indeterminada',
}

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const CHART_W = 800
const CHART_H = 240

interface LayoutPoint {
  x: number
  y: number
  reading: TimelineReading
}

function computeLayout(readings: TimelineReading[]): LayoutPoint[] {
  if (readings.length < 2) return []
  const t0 = new Date(readings[0].timestamp).getTime()
  const t1 = new Date(readings[readings.length - 1].timestamp).getTime()
  const dt = Math.max(1, t1 - t0)
  return readings.map((r) => {
    const elapsed = new Date(r.timestamp).getTime() - t0
    const x = (elapsed / dt) * CHART_W
    // y: confidence 100% → top, 0% → bottom (within 12..220 pad)
    const y = 12 + (1 - r.confidence) * 208
    return { x, y, reading: r }
  })
}

export function SessionTimelineChart({ readings, isLoading, isError }: Props) {
  const points = useMemo(() => computeLayout(readings), [readings])

  const startTime = readings.length > 0 ? new Date(readings[0].timestamp) : null
  const endTime = readings.length > 0 ? new Date(readings[readings.length - 1].timestamp) : null

  const xTicks = useMemo(() => {
    if (!startTime || !endTime) return [] as string[]
    const ticks: string[] = []
    const total = endTime.getTime() - startTime.getTime()
    for (let i = 0; i <= 6; i++) {
      const t = new Date(startTime.getTime() + (total * i) / 6)
      ticks.push(timeFmt.format(t))
    }
    return ticks
  }, [startTime, endTime])

  if (isError) {
    return (
      <div className="rounded border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
        No se pudo obtener la línea de tiempo de la sesión.
      </div>
    )
  }
  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">
        Cargando línea de tiempo…
      </p>
    )
  }
  if (readings.length < 2) {
    return (
      <div className="border border-dashed border-sand p-6 text-center">
        <p className="font-serif text-lg text-ink">Sin lecturas suficientes para graficar.</p>
        <p className="mt-1 text-xs text-ink-soft">
          La sesión necesita al menos dos lecturas para mostrar tendencias.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Y axis + chart area */}
      <div className="relative" style={{ height: CHART_H + 8 }}>
        {/* Y axis */}
        <div
          className="absolute left-0 top-0 flex w-14 flex-col justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint"
          style={{ top: 12, bottom: 24 }}
        >
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        {/* Chart area */}
        <div
          className="absolute border-l border-b border-sand"
          style={{ left: 56, right: 0, top: 12, bottom: 24 }}
        >
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            {/* Grid lines at 25/50/75 */}
            {[0.25, 0.5, 0.75].map((p) => (
              <line
                key={p}
                x1={0}
                x2={CHART_W}
                y1={12 + p * 208}
                y2={12 + p * 208}
                stroke="rgb(var(--color-ink-soft))"
                strokeOpacity="0.10"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            ))}

            {/* Color-band ribbon at bottom showing posture class */}
            {points.length > 1 &&
              points.slice(0, -1).map((p, i) => {
                const next = points[i + 1]
                const w = Math.max(1, next.x - p.x)
                return (
                  <rect
                    key={p.reading.id}
                    x={p.x}
                    y={CHART_H - 8}
                    width={w}
                    height={8}
                    fill={SEGMENT_BG[p.reading.posture_class]}
                  />
                )
              })}

            {/* Confidence line */}
            <polyline
              fill="none"
              stroke="rgb(var(--color-moss))"
              strokeWidth="1.6"
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            />

            {/* Confidence area */}
            <polygon
              fill="rgb(var(--color-moss) / 0.08)"
              points={[
                ...points.map((p) => `${p.x},${p.y}`),
                `${points[points.length - 1].x},${CHART_H - 8}`,
                `${points[0].x},${CHART_H - 8}`,
              ].join(' ')}
            />
          </svg>
        </div>
      </div>

      {/* X axis ticks */}
      <div className="ml-14 mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
        {xTicks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>

      {/* Legend */}
      <div className="ml-14 mt-4 flex flex-wrap gap-5 font-mono text-[10px] uppercase tracking-[0.10em] text-ink-soft">
        {(['adequate', 'forward_slouch', 'excessive_recline'] as PostureClass[]).map((cls) => (
          <span key={cls} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: SEGMENT_BG[cls] }}
            />
            {POSTURE_SHORT[cls]}
          </span>
        ))}
        <span className="ml-auto">
          {readings.length} lecturas
          {startTime && endTime && (
            <>
              {' · '}
              {timeFmt.format(startTime)}–{timeFmt.format(endTime)}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
