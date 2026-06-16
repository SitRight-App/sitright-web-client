import { useMemo } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Skeleton, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { useSessions } from '../hooks/useSessions'

/**
 * Tendencia entre sesiones (benchmark #3 — seguimiento del paciente).
 *
 * Construye la serie de "% de postura adecuada" de las últimas sesiones a partir
 * del resumen que ya devuelve `GET /sessions` (sin coste extra ni endpoint nuevo)
 * y la compara con la sesión actual: variación vs la anterior y racha del patrón
 * de mayor carga. Pensado para que un especialista vea la evolución de un vistazo.
 */

const MAX_POINTS = 8

const DOMINANT_LABEL: Record<string, string> = {
  forward_slouch: 'Inclinación frontal',
  excessive_recline: 'Reclinación excesiva',
  forward_head: 'Cabeza adelantada',
  rounded_shoulders: 'Hombros encorvados',
  slouching: 'Espalda encorvada',
  lateral_tilt: 'Inclinación lateral',
}

// Zona de la columna donde se siente principalmente cada patrón dominante.
// Aproximación legible para el seguimiento (el patrón viene del resumen, no del
// análisis por zona, que es por sesión).
const DOMINANT_ZONE: Record<string, string> = {
  forward_slouch: 'dorsal',
  excessive_recline: 'lumbar',
  forward_head: 'cervical',
  rounded_shoulders: 'cervical',
  slouching: 'dorsal',
}

const dayFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' })

interface Point {
  id: string
  at: string
  pct: number
  dominant: string | null
}

interface SessionTrendProps {
  currentSessionId: string
  currentStartedAt: string
  currentAdequatePct: number | null
  currentDominant: string | null
}

export function SessionTrend({
  currentSessionId,
  currentStartedAt,
  currentAdequatePct,
  currentDominant,
}: SessionTrendProps) {
  const { data, isLoading } = useSessions({ limit: 20 })

  const series = useMemo<Point[]>(() => {
    const points: Point[] = (data ?? [])
      .filter((s) => s.summary && s.summary.valid_readings > 0)
      .map((s) => ({
        id: s.id,
        at: s.started_at,
        pct: s.summary!.adequate_percentage,
        dominant: s.summary!.dominant_deviation,
      }))

    // La sesión actual puede no estar en la lista todavía (recién cerrada, caché)
    // o estar provisional sin resumen consolidado: la inyectamos con su valor.
    if (currentAdequatePct != null && !points.some((p) => p.id === currentSessionId)) {
      points.push({
        id: currentSessionId,
        at: currentStartedAt,
        pct: currentAdequatePct,
        dominant: currentDominant,
      })
    }

    points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    return points.slice(-MAX_POINTS)
  }, [data, currentSessionId, currentStartedAt, currentAdequatePct, currentDominant])

  if (isLoading) {
    return (
      <section className="editorial-card mb-7 p-6">
        <SkeletonTextLine width="30%" />
        <Skeleton width="100%" height={120} className="mt-5" />
      </section>
    )
  }

  // Sin material de comparación: primera(s) sesión(es).
  if (series.length < 2) {
    return (
      <section className="editorial-card mb-7 bg-cream-deep p-6">
        <p className="label-mono">Evolución entre sesiones</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
          Aún sin historial para comparar
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Cuando tengas al menos dos jornadas registradas, aquí verás cómo evoluciona tu postura de
          una sesión a otra.
        </p>
      </section>
    )
  }

  const curIdxRaw = series.findIndex((p) => p.id === currentSessionId)
  const curIdx = curIdxRaw === -1 ? series.length - 1 : curIdxRaw
  const current = series[curIdx]
  const prev = curIdx > 0 ? series[curIdx - 1] : null
  const delta = prev ? Math.round(current.pct - prev.pct) : null
  const avg = Math.round(series.reduce((acc, p) => acc + p.pct, 0) / series.length)

  // Racha del patrón dominante: cuántas sesiones seguidas (terminando en la actual)
  // comparten la misma desviación dominante.
  let streak = 0
  if (current.dominant) {
    for (let i = curIdx; i >= 0; i--) {
      if (series[i].dominant === current.dominant) streak++
      else break
    }
  }
  const dominantLabel = current.dominant ? DOMINANT_LABEL[current.dominant] ?? current.dominant : null
  const dominantZone = current.dominant ? DOMINANT_ZONE[current.dominant] ?? null : null

  return (
    <section className="editorial-card mb-7 grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
      <div>
        <p className="label-mono">Evolución entre sesiones</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
          Postura adecuada, últimas {series.length} sesiones
        </h2>

        {/* Track de barras con altura fija: el % de cada barra se resuelve contra
            una altura definida (un contenedor flex con flex-1 no la garantiza). */}
        <div className="mt-6 flex items-end gap-2" style={{ height: 96 }}>
          {series.map((p, i) => {
            const isCurrent = i === curIdx
            const h = Math.max(4, Math.round(p.pct))
            return (
              <div
                key={p.id}
                className={`flex-1 rounded-t-md transition-colors ${
                  isCurrent ? 'bg-moss-deep' : 'bg-ink-soft/20'
                }`}
                style={{ height: `${h}%` }}
                title={`${dayFmt.format(new Date(p.at))} · ${Math.round(p.pct)}% adecuada`}
              />
            )
          })}
        </div>
        <div className="mt-2 flex gap-2">
          {series.map((p, i) => {
            const isCurrent = i === curIdx
            return (
              <div key={p.id} className="flex flex-1 flex-col items-center">
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isCurrent ? 'font-semibold text-moss-deep' : 'text-ink-faint'
                  }`}
                >
                  {Math.round(p.pct)}
                </span>
                <span className="text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                  {isCurrent ? 'hoy' : dayFmt.format(new Date(p.at)).replace('.', '')}
                </span>
              </div>
            )
          })}
        </div>

        <p className="mt-4 border-t border-sand pt-3 text-[12px] text-ink-soft">
          Cada barra es una sesión (% del tiempo en postura adecuada). Promedio del periodo:{' '}
          <span className="font-semibold text-ink">{avg}%</span>.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:border-l lg:border-sand lg:pl-6">
        <div className="rounded-lg border border-sand bg-cream/60 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Vs. sesión anterior
          </p>
          {delta !== null ? (
            <div
              className={`mt-1.5 flex items-center gap-2 ${
                delta > 0 ? 'text-moss' : delta < 0 ? 'text-terracotta-deep' : 'text-ink-soft'
              }`}
            >
              {delta > 0 ? (
                <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
              ) : delta < 0 ? (
                <TrendingDown className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <Minus className="h-5 w-5" strokeWidth={1.8} />
              )}
              <span className="text-2xl font-semibold tabular-nums">
                {delta > 0 ? '+' : ''}
                {delta}
                <span className="ml-1 text-sm font-normal">pts</span>
              </span>
            </div>
          ) : (
            <p className="mt-1.5 text-[14px] text-ink-soft">Sin sesión previa.</p>
          )}
          <p className="mt-1 text-[12px] text-ink-soft">
            {delta === null
              ? ''
              : delta > 0
                ? 'Mejoraste respecto a la jornada anterior.'
                : delta < 0
                  ? 'Bajaste respecto a la jornada anterior.'
                  : 'Te mantuviste igual que la jornada anterior.'}
          </p>
        </div>

        <div className="rounded-lg border border-sand bg-cream/60 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Patrón que se repite
          </p>
          {dominantLabel ? (
            <>
              <p className="mt-1.5 text-[16px] font-semibold leading-tight text-ink">
                {dominantLabel}
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">
                {dominantZone ? `Zona ${dominantZone} · ` : ''}
                {streak >= 2
                  ? `${streak} sesiones seguidas`
                  : 'primera sesión con este patrón'}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[14px] text-ink-soft">
              Sin desviación dominante en esta sesión.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
