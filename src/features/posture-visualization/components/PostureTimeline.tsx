import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ScoreRing } from '@/shared/ui/ScoreRing'
import { parseServerDate } from '@/shared/lib/parseServerDate'
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
  adequate: 'Correcta',
  forward_slouch: 'Encorvado',
  excessive_recline: 'Reclinado',
  indeterminate: 'Sin dato',
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
  // Excluye las lecturas indeterminadas (ruido del modelo) para que la
  // distribución cuadre con el anillo en vivo y sea más clara.
  const valid = readings.filter((r) => r.posture_class !== 'indeterminate')
  if (valid.length === 0) return []
  const counts: Record<PostureClass, number> = {
    adequate: 0,
    forward_slouch: 0,
    excessive_recline: 0,
    indeterminate: 0,
  }
  for (const r of valid) counts[r.posture_class]++
  const total = valid.length
  return (['adequate', 'forward_slouch', 'excessive_recline'] as PostureClass[])
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
        time: parseServerDate(r.timestamp).getTime(),
        height: 1,
        posture: r.posture_class,
        fill: POSTURE_COLOR[r.posture_class],
        confidence: Math.round(r.confidence * 100),
      })),
    [readings],
  )

  const distribution = useMemo(() => computeDistribution(readings), [readings])

  // % de postura correcta en los últimos minutos (anillo en vivo). Excluye las
  // lecturas indeterminadas para no castigar el score con ruido del modelo.
  const liveScore = useMemo<number | null>(() => {
    const valid = readings.filter((r) => r.posture_class !== 'indeterminate')
    if (valid.length === 0) return null
    const adeq = valid.filter((r) => r.posture_class === 'adequate').length
    return Math.round((adeq / valid.length) * 100)
  }, [readings])

  const startTime = readings.length > 0 ? parseServerDate(readings[0].timestamp) : null
  const endTime =
    readings.length > 0 ? parseServerDate(readings[readings.length - 1].timestamp) : null

  return (
    <div className="editorial-card p-7">
      <div className="flex items-center gap-5">
        {readings.length > 0 && liveScore !== null && (
          <ScoreRing value={liveScore} size={92} thickness={9} caption={null} />
        )}
        <div>
          <p className="label-mono">En vivo</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Cómo vas <span className="text-moss">ahora mismo.</span>
          </h2>
          {readings.length > 0 && (
            <p className="mt-1 text-[13px] text-ink-soft">
              Postura correcta en los últimos minutos.
            </p>
          )}
        </div>
      </div>

      {isError && (
        <p className="mt-4 border-l-2 border-terracotta bg-terracotta/10 px-3 py-2 text-xs text-terracotta-deep">
          No se pudo obtener la línea de tiempo.
        </p>
      )}

      {isLoading && readings.length === 0 && (
        <p className="mt-4 text-[14px] text-ink-soft">Esperando datos del chaleco…</p>
      )}

      {readings.length === 0 && !isLoading && !isError && (
        <div className="mt-6 border border-dashed border-sand p-6 text-center">
          <p className="text-lg font-semibold text-ink">Todavía no hay datos.</p>
          <p className="mt-1 text-[14px] text-ink-soft">
            Apenas el chaleco empiece, verás aquí cómo cambia tu postura minuto a minuto.
          </p>
        </div>
      )}

      {readings.length > 0 && (
        <>
          <div className="mt-4" style={{ height: 56, width: '100%' }}>
            <ResponsiveContainer width="100%" height={56}>
              <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={0}>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 1]} />
                <Tooltip content={<TimelineTooltip />} cursor={{ fill: 'rgb(var(--color-ink-soft) / 0.08)' }} />
                <Bar dataKey="height" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {startTime && endTime && (
            <div className="mt-2 flex justify-between text-[12px] text-ink-soft">
              <span>{timeFmt.format(startTime)}</span>
              <span>se actualiza cada 5 s</span>
              <span>{timeFmt.format(endTime)}</span>
            </div>
          )}

          <div className="mt-4 border-t border-dashed border-sand pt-3">
            <p className="label-mono mb-3">En qué has estado</p>
            <ul className="space-y-1.5">
              {distribution.map((d) => (
                <li key={d.posture}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: POSTURE_COLOR[d.posture] }}
                      />
                      <span className="text-[14px] text-ink">{POSTURE_SHORT[d.posture]}</span>
                    </span>
                    <span className="text-[14px] font-medium tabular-nums text-ink-soft">
                      {Math.round(d.percentage)}%
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
