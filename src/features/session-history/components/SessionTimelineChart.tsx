import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  PostureClass,
  TimelineReading,
} from '@/features/posture-visualization/types/posture'
import { Skeleton } from '@/shared/ui/Skeleton'

interface Props {
  readings: TimelineReading[]
  isLoading: boolean
  isError: boolean
  /**
   * Duración total de la sesión en minutos. Si es < 30, se muestra el aviso
   * de "sesión corta" exigido por HU-10 AC2.
   */
  durationMinutes?: number | null
}

const POSTURE_COLOR: Record<PostureClass, string> = {
  adequate: 'rgb(45 74 54)',
  forward_slouch: 'rgb(232 166 133)',
  excessive_recline: 'rgb(200 98 60)',
  indeterminate: 'rgb(138 144 136)',
}

const POSTURE_SHORT: Record<PostureClass, string> = {
  adequate: 'Adecuada',
  forward_slouch: 'Inclinación frontal',
  excessive_recline: 'Reclinación',
  indeterminate: 'Indeterminada',
}

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

interface ChartPoint {
  time: number
  confidence: number
  posture: PostureClass
}

export function SessionTimelineChart({ readings, isLoading, isError, durationMinutes }: Props) {
  const data = useMemo<ChartPoint[]>(
    () =>
      readings.map((r) => ({
        time: new Date(r.timestamp).getTime(),
        confidence: Math.round(r.confidence * 100),
        posture: r.posture_class,
      })),
    [readings],
  )

  if (isError) {
    return (
      <div className="rounded border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
        No se pudo obtener la línea de tiempo de la sesión.
      </div>
    )
  }
  if (isLoading) {
    return (
      <div>
        <Skeleton width="100%" height={280} />
        <div className="ml-14 mt-4 flex gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width={90} height={10} />
          ))}
        </div>
      </div>
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

  const isShortSession = durationMinutes !== null && durationMinutes !== undefined && durationMinutes < 30

  return (
    <div>
      {/* HU-10 AC2 + HU-19 AC2 — sesión corta: aviso de continuar +
          advertencia explícita de que los resultados son referenciales. */}
      {isShortSession && (
        <div className="mb-4 border-l-2 border-sand bg-sand/15 px-4 py-2.5 text-xs text-ink-soft">
          <strong className="font-serif text-ink">Sesión corta:</strong> los
          resultados son referenciales. Continúa usando el chaleco para ver una
          línea de tiempo más completa.
        </div>
      )}

      <div style={{ height: 280, width: '100%' }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--color-moss))" stopOpacity={0.18} />
                <stop offset="100%" stopColor="rgb(var(--color-moss))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="rgb(var(--color-ink-soft) / 0.10)" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v) => timeFmt.format(new Date(v))}
              stroke="rgb(var(--color-ink-faint))"
              tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'rgb(var(--color-ink-faint))' }}
              minTickGap={48}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="rgb(var(--color-ink-faint))"
              tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'rgb(var(--color-ink-faint))' }}
              width={42}
            />
            <ReferenceLine
              y={70}
              stroke="rgb(var(--color-terracotta-soft))"
              strokeDasharray="3 4"
              strokeWidth={1}
              ifOverflow="visible"
            />
            <Tooltip content={<TimelineTooltip />} cursor={{ stroke: 'rgb(var(--color-ink-soft) / 0.4)' }} />
            <Area
              type="monotone"
              dataKey="confidence"
              stroke="rgb(var(--color-moss))"
              strokeWidth={1.6}
              fill="url(#confidenceFill)"
              isAnimationActive
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="ml-14 mt-4 flex flex-wrap gap-5 font-mono text-[10px] uppercase tracking-[0.10em] text-ink-soft">
        {(['adequate', 'forward_slouch', 'excessive_recline'] as PostureClass[]).map((cls) => (
          <span key={cls} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: POSTURE_COLOR[cls] }}
            />
            {POSTURE_SHORT[cls]}
          </span>
        ))}
        <span className="ml-auto">{readings.length} lecturas</span>
      </div>
    </div>
  )
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}

function TimelineTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded border border-sand bg-cream-bone p-3 font-mono text-[11px] shadow-sm">
      <p className="text-ink">{timeFmt.format(new Date(p.time))}</p>
      <p
        className="mt-1 font-serif text-[13px]"
        style={{ color: POSTURE_COLOR[p.posture] }}
      >
        {POSTURE_SHORT[p.posture]} · {p.confidence}%
      </p>
    </div>
  )
}
