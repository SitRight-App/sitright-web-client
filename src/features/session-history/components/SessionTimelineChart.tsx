import { useMemo } from 'react'
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

// Hueco sin lecturas a partir del cual asumimos que el chaleco estuvo en pausa
// (apagado o sin uso): no sabemos la postura en ese tramo, así que lo marcamos.
const PAUSE_GAP_MS = 2 * 60 * 1000

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

const DEVIATION: PostureClass[] = ['forward_slouch', 'excessive_recline']

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

type SegKind = PostureClass | 'pausa'

interface Segment {
  kind: SegKind
  startMs: number
  durMs: number
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

interface Built {
  segments: Segment[]
  total: number
  t0: number
  ticks: number[]
  transitions: number
  longestDeviationMs: number
  longestDeviationAt: number | null
  pauses: number
}

/**
 * Convierte las lecturas en una cinta temporal: cada lectura ocupa el intervalo
 * hasta la siguiente, coloreado por su postura. Los huecos largos (sin lecturas)
 * se marcan como "pausa" en vez de extender la última postura conocida.
 */
function build(readings: TimelineReading[]): Built | null {
  if (readings.length < 2) return null
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
  const times = sorted.map((r) => new Date(r.timestamp).getTime())
  const gaps: number[] = []
  for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1])
  const medGap = median(gaps.filter((g) => g > 0 && g <= PAUSE_GAP_MS)) || 5000

  const segments: Segment[] = []
  let pauses = 0
  for (let i = 0; i < sorted.length; i++) {
    const start = times[i]
    const posture = sorted[i].posture_class
    if (i < sorted.length - 1) {
      const g = times[i + 1] - times[i]
      if (g > PAUSE_GAP_MS) {
        // último estado conocido por un instante, luego pausa por el resto del hueco.
        segments.push({ kind: posture, startMs: start, durMs: Math.min(medGap, g) })
        if (g - medGap > 0) {
          segments.push({ kind: 'pausa', startMs: start + medGap, durMs: g - medGap })
          pauses++
        }
      } else {
        segments.push({ kind: posture, startMs: start, durMs: g })
      }
    } else {
      segments.push({ kind: posture, startMs: start, durMs: medGap })
    }
  }

  // Fusiona franjas contiguas del mismo tipo: bloques de color limpios en vez de
  // una rejilla de micro-segmentos (una por lectura).
  const merged: Segment[] = []
  for (const s of segments) {
    const last = merged[merged.length - 1]
    if (last && last.kind === s.kind) last.durMs += s.durMs
    else merged.push({ ...s })
  }

  const t0 = times[0]
  const total = merged.reduce((acc, s) => acc + s.durMs, 0)
  const ticks = Array.from({ length: 5 }, (_, i) => t0 + (total * i) / 4)

  let transitions = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].posture_class !== sorted[i - 1].posture_class) transitions++
  }

  // tramo desviado contiguo más largo (encorvamiento o reclinación seguidos).
  let longestDeviationMs = 0
  let longestDeviationAt: number | null = null
  let runMs = 0
  let runStart = 0
  for (const seg of merged) {
    if (DEVIATION.includes(seg.kind as PostureClass)) {
      if (runMs === 0) runStart = seg.startMs
      runMs += seg.durMs
      if (runMs > longestDeviationMs) {
        longestDeviationMs = runMs
        longestDeviationAt = runStart
      }
    } else {
      runMs = 0
    }
  }

  return {
    segments: merged,
    total,
    t0,
    ticks,
    transitions,
    longestDeviationMs,
    longestDeviationAt,
    pauses,
  }
}

function fmtDur(ms: number): string {
  const min = ms / 60000
  if (min < 1) return '<1 min'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min - h * 60)
  return `${h} h ${m.toString().padStart(2, '0')} min`
}

export function SessionTimelineChart({ readings, isLoading, isError, durationMinutes }: Props) {
  const built = useMemo(() => build(readings), [readings])

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
        <Skeleton width="100%" height={48} />
        <div className="mt-4 flex gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width={90} height={10} />
          ))}
        </div>
      </div>
    )
  }
  if (!built) {
    return (
      <div className="border border-dashed border-sand p-6 text-center">
        <p className="font-serif text-lg text-ink">Sin lecturas suficientes para graficar.</p>
        <p className="mt-1 text-xs text-ink-soft">
          La sesión necesita al menos dos lecturas para mostrar la línea de tiempo.
        </p>
      </div>
    )
  }

  const { segments, total, ticks, transitions, longestDeviationMs, longestDeviationAt, pauses } =
    built
  const isShortSession =
    durationMinutes !== null && durationMinutes !== undefined && durationMinutes < 30
  const hasPause = pauses > 0
  const usedClasses = new Set(segments.map((s) => s.kind))

  return (
    <div>
      {isShortSession && (
        <div className="mb-4 border-l-2 border-sand bg-sand/15 px-4 py-2.5 text-xs text-ink-soft">
          <strong className="font-serif text-ink">Sesión corta:</strong> los resultados son
          referenciales. Continúa usando el chaleco para ver una línea de tiempo más completa.
        </div>
      )}

      <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
        Cada franja es tu postura en ese momento de la sesión. Así puedes ver{' '}
        <span className="font-medium text-ink">cuándo</span> apareció cada desviación, no solo cuánta
        hubo.
      </p>

      {/* Cinta de estado: legible impresa, sin depender del hover. */}
      <div className="flex h-12 w-full overflow-hidden rounded-md border border-sand">
        {segments.map((s, i) => {
          const isPause = s.kind === 'pausa'
          const label = isPause ? 'Pausa (sin lecturas)' : POSTURE_SHORT[s.kind as PostureClass]
          const end = s.startMs + s.durMs
          const style: React.CSSProperties = isPause
            ? {
                width: `${(s.durMs / total) * 100}%`,
                backgroundColor: 'rgb(237 235 230)',
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent 0 4px, rgb(199 195 187) 4px 5px)',
              }
            : {
                width: `${(s.durMs / total) * 100}%`,
                backgroundColor: POSTURE_COLOR[s.kind as PostureClass],
              }
          return (
            <div
              key={i}
              style={style}
              title={`${timeFmt.format(new Date(s.startMs))}–${timeFmt.format(new Date(end))} · ${label}`}
            />
          )
        })}
      </div>

      {/* Eje de horas: el ancho es proporcional al tiempo real, así que los
          ticks equiespaciados en tiempo caen equiespaciados en la cinta. */}
      <div className="relative mt-1.5 h-4">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="absolute font-mono text-[10px] tabular-nums text-ink-faint"
            style={{
              left: `${(i / (ticks.length - 1)) * 100}%`,
              transform:
                i === 0 ? 'none' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {timeFmt.format(new Date(t))}
          </span>
        ))}
      </div>

      {/* Métricas que el gráfico aporta de un vistazo (también impreso). */}
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-sand pt-4 sm:grid-cols-4">
        <Metric label="Duración" value={fmtDur(total)} />
        <Metric
          label="Tramo desviado más largo"
          value={longestDeviationMs > 0 ? fmtDur(longestDeviationMs) : '—'}
          meta={
            longestDeviationAt !== null
              ? `desde ${timeFmt.format(new Date(longestDeviationAt))}`
              : 'sin desviaciones seguidas'
          }
        />
        <Metric label="Cambios de postura" value={String(transitions)} />
        <Metric label="Pausas" value={String(pauses)} meta={pauses === 0 ? 'sin pausas' : undefined} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.10em] text-ink-soft">
        {(['adequate', 'forward_slouch', 'excessive_recline', 'indeterminate'] as PostureClass[])
          .filter((cls) => usedClasses.has(cls))
          .map((cls) => (
            <span key={cls} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: POSTURE_COLOR[cls] }}
              />
              {POSTURE_SHORT[cls]}
            </span>
          ))}
        {hasPause && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor: 'rgb(237 235 230)',
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent 0 2px, rgb(199 195 187) 2px 3px)',
              }}
            />
            Pausa
          </span>
        )}
        <span className="ml-auto normal-case tracking-normal">{readings.length} lecturas</span>
      </div>
    </div>
  )
}

function Metric({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{value}</dd>
      {meta && <p className="mt-0.5 text-[11px] text-ink-soft">{meta}</p>}
    </div>
  )
}
