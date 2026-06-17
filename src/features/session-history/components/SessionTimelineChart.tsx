import { useMemo, useState } from 'react'
import type {
  PostureClass,
  TimelineReading,
} from '@/features/posture-visualization/types/posture'
import { Skeleton } from '@/shared/ui/Skeleton'

interface Props {
  readings: TimelineReading[]
  isLoading: boolean
  isError: boolean
  /** Duración de la sesión en minutos (se conserva por compatibilidad de API). */
  durationMinutes?: number | null
}

const MINUTE = 60_000
// Hueco sin lecturas a partir del cual el minuto se marca como pausa.
const PAUSE_GAP_MS = 2 * MINUTE
const SHORT_SESSION_MIN = 30

const POSTURE_COLOR: Record<PostureClass, string> = {
  adequate: 'rgb(45 74 54)',
  forward_slouch: 'rgb(232 166 133)',
  excessive_recline: 'rgb(200 98 60)',
  indeterminate: 'rgb(138 144 136)',
}

const POSTURE_SHORT: Record<PostureClass, string> = {
  adequate: 'Bien sentado',
  forward_slouch: 'Encorvado',
  excessive_recline: 'Echado atrás',
  indeterminate: 'Sin dato claro',
}

const DEVIATION: PostureClass[] = ['forward_slouch', 'excessive_recline']

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const fmtT = (ms: number) => timeFmt.format(new Date(ms))

type Kind = PostureClass | 'pausa'

interface Minute {
  t: number
  kind: Kind
}

interface Block {
  kind: Kind
  count: number
}

interface BadPeriod {
  startMs: number
  endMs: number
  durMin: number
  type: PostureClass
}

function dominant(counts: Record<string, number>): PostureClass {
  let best: PostureClass = 'indeterminate'
  let max = -1
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) {
      max = v
      best = k as PostureClass
    }
  }
  return best
}

/** Agrupa las lecturas en minutos (US010: bloques de color por minuto). */
function buildMinutes(readings: TimelineReading[]): Minute[] {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
  const byMin = new Map<number, Record<string, number>>()
  let firstMin = Infinity
  let lastMin = -Infinity
  let lastTs = 0
  for (const r of sorted) {
    const ts = new Date(r.timestamp).getTime()
    const m = Math.floor(ts / MINUTE) * MINUTE
    const rec = byMin.get(m) ?? {}
    rec[r.posture_class] = (rec[r.posture_class] ?? 0) + 1
    byMin.set(m, rec)
    if (m < firstMin) firstMin = m
    if (m > lastMin) lastMin = m
    lastTs = ts
  }
  if (firstMin === Infinity) return []
  // Asegura al menos un minuto si la sesión es submínima.
  if (lastMin === firstMin && lastTs >= firstMin) lastMin = firstMin

  const minutes: Minute[] = []
  let lastSeen = firstMin
  for (let m = firstMin; m <= lastMin; m += MINUTE) {
    const rec = byMin.get(m)
    if (rec) {
      minutes.push({ t: m, kind: dominant(rec) })
      lastSeen = m
    } else {
      // minuto sin lecturas: pausa solo si el hueco supera el umbral.
      minutes.push({ t: m, kind: m - lastSeen > PAUSE_GAP_MS ? 'pausa' : 'indeterminate' })
    }
  }
  return minutes
}

function mergeBlocks(minutes: Minute[]): Block[] {
  const blocks: Block[] = []
  for (const m of minutes) {
    const last = blocks[blocks.length - 1]
    if (last && last.kind === m.kind) last.count++
    else blocks.push({ kind: m.kind, count: 1 })
  }
  return blocks
}

function badPeriods(minutes: Minute[]): BadPeriod[] {
  const out: BadPeriod[] = []
  let i = 0
  while (i < minutes.length) {
    if (DEVIATION.includes(minutes[i].kind as PostureClass)) {
      let j = i
      const counts: Record<string, number> = {}
      while (j < minutes.length && DEVIATION.includes(minutes[j].kind as PostureClass)) {
        counts[minutes[j].kind] = (counts[minutes[j].kind] ?? 0) + 1
        j++
      }
      out.push({
        startMs: minutes[i].t,
        endMs: minutes[j - 1].t + MINUTE,
        durMin: j - i,
        type: dominant(counts),
      })
      i = j
    } else {
      i++
    }
  }
  return out
}

function fmtDur(min: number): string {
  if (min < 1) return '<1 min'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min - h * 60)
  return `${h} h ${m.toString().padStart(2, '0')} min`
}

interface Franja {
  label: string
  start: number
  end: number
}

export function SessionTimelineChart({ readings, isLoading, isError }: Props) {
  const minutes = useMemo(() => buildMinutes(readings), [readings])
  const [franjaIdx, setFranjaIdx] = useState<number | null>(null)

  // Franjas para hacer zoom (US010 AC1). Solo cuando la sesión es larga
  // suficiente como para que el zoom aporte.
  const franjas = useMemo<Franja[]>(() => {
    if (minutes.length < 10) return []
    const n = Math.min(4, Math.ceil(minutes.length / 5))
    const size = Math.ceil(minutes.length / n)
    const out: Franja[] = []
    for (let i = 0; i < minutes.length; i += size) {
      const end = Math.min(i + size, minutes.length)
      out.push({
        label: `${fmtT(minutes[i].t)}–${fmtT(minutes[end - 1].t + MINUTE)}`,
        start: i,
        end,
      })
    }
    return out
  }, [minutes])

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
        <Skeleton width="100%" height={56} />
        <div className="mt-4 flex gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width={120} height={12} />
          ))}
        </div>
      </div>
    )
  }
  if (minutes.length < 1 || readings.length < 2) {
    return (
      <div className="border border-dashed border-sand p-6 text-center">
        <p className="text-lg font-semibold text-ink">Aún no hay datos suficientes.</p>
        <p className="mt-1 text-xs text-ink-soft">
          La sesión necesita al menos dos lecturas para mostrar la línea de tiempo.
        </p>
      </div>
    )
  }

  const sel = franjaIdx !== null && franjas[franjaIdx] ? franjas[franjaIdx] : null
  const view = sel ? minutes.slice(sel.start, sel.end) : minutes
  const blocks = mergeBlocks(view)
  const totalMin = view.length
  const t0 = view[0].t
  const tEnd = view[view.length - 1].t + MINUTE
  const ticks = Array.from({ length: 5 }, (_, i) => t0 + ((tEnd - t0) * i) / 4)
  const periods = badPeriods(view)

  const usedKinds = new Set(view.map((m) => m.kind))
  const hasPause = usedKinds.has('pausa')
  const transitions = blocks.filter((b) => b.kind !== 'pausa').length - 1
  const longest = periods.reduce((mx, p) => Math.max(mx, p.durMin), 0)
  const pauseCount = blocks.filter((b) => b.kind === 'pausa').length

  // Sesión corta (US010/US019 AC2): se mide por el tiempo realmente registrado.
  const isShort = minutes.length < SHORT_SESSION_MIN

  return (
    <div>
      {isShort && (
        <div className="mb-4 border-l-2 border-sand bg-sand/15 px-4 py-2.5 text-xs text-ink-soft">
          <strong className="font-serif text-ink">Sesión corta:</strong> los resultados son
          referenciales. Continúa usando el chaleco para ver una línea de tiempo más completa.
        </div>
      )}

      <p className="mb-3 text-[15px] leading-relaxed text-ink-soft">
        Cada bloque es cómo estuviste sentado en ese minuto. Los colores cálidos son los ratos en que
        estuviste mal sentado; abajo te los detallamos.
      </p>

      {/* Zoom por franjas horarias (US010 AC1). */}
      {franjas.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-ink-faint">Acercar a:</span>
          <button
            type="button"
            onClick={() => setFranjaIdx(null)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              sel === null
                ? 'border-moss bg-moss text-cream-bone'
                : 'border-sand bg-cream-bone text-ink-soft hover:border-moss hover:text-ink'
            }`}
          >
            Toda la sesión
          </button>
          {franjas.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setFranjaIdx(i)}
              className={`rounded-full border px-3 py-1 font-mono text-[12px] tabular-nums transition-colors ${
                franjaIdx === i
                  ? 'border-moss bg-moss text-cream-bone'
                  : 'border-sand bg-cream-bone text-ink-soft hover:border-moss hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Cinta de bloques por minuto. Legible impresa, sin depender del hover. */}
      <div className="flex h-14 w-full overflow-hidden rounded-md border border-sand">
        {blocks.map((b, i) => {
          const isPause = b.kind === 'pausa'
          const label = isPause ? 'Pausa (sin datos)' : POSTURE_SHORT[b.kind as PostureClass]
          const style: React.CSSProperties = isPause
            ? {
                width: `${(b.count / totalMin) * 100}%`,
                backgroundColor: 'rgb(237 235 230)',
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent 0 4px, rgb(199 195 187) 4px 5px)',
              }
            : { width: `${(b.count / totalMin) * 100}%`, backgroundColor: POSTURE_COLOR[b.kind as PostureClass] }
          return <div key={i} style={style} title={`${label} · ${fmtDur(b.count)}`} />
        })}
      </div>

      {/* Eje de horas: el ancho es proporcional al tiempo (1 bloque = 1 min). */}
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
            {fmtT(t)}
          </span>
        ))}
      </div>

      {/* US019 AC1: resalta los períodos inadecuados con su tipo de desviación. */}
      <div className="mt-5 border-t border-sand pt-4">
        <p className="mb-2.5 text-[14px] font-semibold text-ink">
          Ratos en que estuviste mal sentado
        </p>
        {periods.length === 0 ? (
          <p className="text-[14px] text-ink-soft">
            No estuviste mal sentado por mucho rato seguido en {sel ? 'esta franja' : 'toda la sesión'}. ¡Bien ahí!
          </p>
        ) : (
          <ul className="space-y-1.5">
            {periods
              .slice()
              .sort((a, b) => b.durMin - a.durMin)
              .slice(0, 8)
              .map((p, i) => (
                <li key={i} className="flex items-center gap-3 text-[14px]">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: POSTURE_COLOR[p.type] }}
                  />
                  <span className="font-medium text-ink">{POSTURE_SHORT[p.type]}</span>
                  <span className="text-[13px] tabular-nums text-ink-soft">
                    {fmtT(p.startMs)} a {fmtT(p.endMs)}
                  </span>
                  <span className="ml-auto text-[13px] font-medium tabular-nums text-terracotta-deep">
                    {fmtDur(p.durMin)}
                  </span>
                </li>
              ))}
            {periods.length > 8 && (
              <li className="text-[13px] text-ink-faint">
                y {periods.length - 8} ratos más cortos.
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Métricas de lectura rápida (también impresas). */}
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-sand pt-4 sm:grid-cols-4">
        <Metric label="Tiempo medido" value={fmtDur(totalMin)} />
        <Metric label="Lo más seguido mal sentado" value={longest > 0 ? fmtDur(longest) : '—'} />
        <Metric label="Veces que te moviste" value={String(Math.max(0, transitions))} />
        <Metric label="Pausas" value={String(pauseCount)} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-soft">
        {(['adequate', 'forward_slouch', 'excessive_recline', 'indeterminate'] as PostureClass[])
          .filter((cls) => usedKinds.has(cls))
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
        <span className="ml-auto">{readings.length} mediciones</span>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] font-medium leading-snug text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}
