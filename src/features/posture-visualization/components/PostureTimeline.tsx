import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PostureClass, TimelineReading } from '../types/posture'

interface Props {
  readings: TimelineReading[]
  isLoading: boolean
  isError: boolean
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
  height: number
  posture: PostureClass
  fill: string
  confidence: number
}

interface DistributionItem {
  posture: PostureClass
  count: number
  percentage: number
}

function computeDistribution(readings: TimelineReading[]): DistributionItem[] {
  if (readings.length === 0) return []
  const counts: Record<PostureClass, number> = {
    adequate: 0,
    forward_slouch: 0,
    excessive_recline: 0,
    indeterminate: 0,
  }
  for (const r of readings) counts[r.posture_class]++
  const total = readings.length
  return (Object.keys(counts) as PostureClass[])
    .filter((k) => counts[k] > 0)
    .map((posture) => ({
      posture,
      count: counts[posture],
      percentage: (counts[posture] / total) * 100,
    }))
    .sort((a, b) => b.count - a.count)
}

export function PostureTimeline({ readings, isLoading, isError }: Props) {
  const data = useMemo<ChartPoint[]>(
    () =>
      readings.map((r) => ({
        time: new Date(r.timestamp).getTime(),
        height: 1,
        posture: r.posture_class,
        fill: POSTURE_COLOR[r.posture_class],
        confidence: Math.round(r.confidence * 100),
      })),
    [readings],
  )

  const distribution = useMemo(() => computeDistribution(readings), [readings])

  const startTime = readings.length > 0 ? new Date(readings[0].timestamp) : null
  const endTime =
    readings.length > 0 ? new Date(readings[readings.length - 1].timestamp) : null

  return (
    <div className="editorial-card p-7">
      <p className="label-mono">Línea de tiempo · sesión</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Tu jornada postural <span className="text-moss">en vivo.</span>
      </h2>

      {isError && (
        <p className="mt-4 border-l-2 border-terracotta bg-terracotta/10 px-3 py-2 text-xs text-terracotta-deep">
          No se pudo obtener la línea de tiempo.
        </p>
      )}

      {isLoading && readings.length === 0 && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Esperando lecturas del chaleco…
        </p>
      )}

      {readings.length === 0 && !isLoading && !isError && (
        <div className="mt-6 border border-dashed border-sand p-6 text-center">
          <p className="font-serif text-lg text-ink">Sin lecturas recientes.</p>
          <p className="mt-1 text-xs text-ink-soft">
            Cuando el chaleco empiece a publicar, esta línea de tiempo se actualizará cada 5 segundos.
          </p>
        </div>
      )}

      {readings.length > 0 && (
        <>
          <div className="mt-6" style={{ height: 56, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={0}>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 1]} />
                <Tooltip content={<TimelineTooltip />} cursor={{ fill: 'rgb(var(--color-ink-soft) / 0.08)' }} />
                <Bar dataKey="height" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {startTime && endTime && (
            <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <span>{timeFmt.format(startTime)}</span>
              <span>{readings.length} lecturas · cada 5 s</span>
              <span>{timeFmt.format(endTime)}</span>
            </div>
          )}

          <div className="mt-7 border-t border-dashed border-sand pt-5">
            <p className="label-mono mb-3">Distribución del intervalo</p>
            <ul className="space-y-2.5">
              {distribution.map((d) => (
                <li key={d.posture}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: POSTURE_COLOR[d.posture] }}
                      />
                      <span className="font-serif text-sm text-ink">
                        {POSTURE_SHORT[d.posture]}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {d.count} · {Math.round(d.percentage)}%
                    </span>
                  </div>
                  <div className="mt-1 h-[3px] overflow-hidden bg-sand/40">
                    <div
                      className="h-full"
                      style={{
                        width: `${d.percentage}%`,
                        backgroundColor: POSTURE_COLOR[d.posture],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
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
    <div className="rounded border border-sand bg-cream-bone p-2.5 font-mono text-[10px] shadow-sm">
      <p className="text-ink">{timeFmt.format(new Date(p.time))}</p>
      <p
        className="mt-0.5 font-serif text-[12px]"
        style={{ color: p.fill }}
      >
        {POSTURE_SHORT[p.posture]} · {p.confidence}%
      </p>
    </div>
  )
}
