import { useMemo } from 'react'
import type { PostureClass, TimelineReading } from '../types/posture'

interface Props {
  readings: TimelineReading[]
  isLoading: boolean
  isError: boolean
}

const SEGMENT_BG: Record<PostureClass, string> = {
  adequate: 'bg-moss',
  forward_slouch: 'bg-terracotta',
  excessive_recline: 'bg-terracotta-deep',
  indeterminate: 'bg-ink-faint/30',
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
  for (const r of readings) {
    counts[r.posture_class]++
  }
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
  const distribution = useMemo(() => computeDistribution(readings), [readings])
  const totalReadings = readings.length

  const startTime = readings.length > 0 ? new Date(readings[0].timestamp) : null
  const endTime =
    readings.length > 0 ? new Date(readings[readings.length - 1].timestamp) : null

  return (
    <div className="relative editorial-card p-7">
      <span className="num-tag absolute right-5 top-5">№ 04</span>
      <p className="label-mono">Línea de tiempo · sesión</p>
      <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">
        Tu jornada postural{' '}
        <em className="italic text-moss">en vivo.</em>
      </h2>

      {isError && (
        <p className="mt-4 border-l-2 border-terracotta bg-terracotta/10 px-3 py-2 text-xs text-terracotta-deep">
          No se pudo obtener la línea de tiempo.
        </p>
      )}

      {isLoading && totalReadings === 0 && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Esperando lecturas del chaleco…
        </p>
      )}

      {totalReadings === 0 && !isLoading && !isError && (
        <div className="mt-6 border border-dashed border-sand p-6 text-center">
          <p className="font-serif text-lg text-ink">Sin lecturas recientes.</p>
          <p className="mt-1 text-xs text-ink-soft">
            Cuando el chaleco empiece a publicar, esta línea de tiempo se actualizará cada 5 segundos.
          </p>
        </div>
      )}

      {totalReadings > 0 && (
        <>
          {/* Strip de segmentos */}
          <div className="mt-6">
            <div
              className="flex h-12 w-full overflow-hidden rounded border border-sand bg-cream"
              role="img"
              aria-label={`Línea de tiempo con ${totalReadings} lecturas posturales`}
            >
              {readings.map((r) => (
                <div
                  key={r.id}
                  className={`${SEGMENT_BG[r.posture_class]} h-full flex-1 transition-opacity hover:opacity-70`}
                  title={`${timeFmt.format(new Date(r.timestamp))} · ${POSTURE_SHORT[r.posture_class]} (${Math.round(r.confidence * 100)}%)`}
                />
              ))}
            </div>

            {startTime && endTime && (
              <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                <span>{timeFmt.format(startTime)}</span>
                <span>{totalReadings} lecturas · cada 5 s</span>
                <span>{timeFmt.format(endTime)}</span>
              </div>
            )}
          </div>

          {/* Distribución por clase */}
          <div className="mt-7 border-t border-dashed border-sand pt-5">
            <p className="label-mono mb-3">Distribución del intervalo</p>
            <ul className="space-y-2.5">
              {distribution.map((d) => (
                <li key={d.posture}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${SEGMENT_BG[d.posture]}`} />
                      <span className="font-serif text-sm text-ink">{POSTURE_SHORT[d.posture]}</span>
                    </span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {d.count} · {Math.round(d.percentage)}%
                    </span>
                  </div>
                  <div className="mt-1 h-[3px] overflow-hidden bg-sand/40">
                    <div
                      className={`${SEGMENT_BG[d.posture]} h-full`}
                      style={{ width: `${d.percentage}%` }}
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
