import { useMemo } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Skeleton, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { CARD_TONE, SectionEyebrow } from '@/shared/ui/SectionEyebrow'
import { parseServerDate } from '@/shared/lib/parseServerDate'
import { useSessions } from '../hooks/useSessions'
import { buildTrend, type TrendPoint } from '../lib/sessionTrend'

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
  forward_slouch: 'Inclinación hacia adelante',
  excessive_recline: 'Reclinación excesiva',
  forward_head: 'Cabeza adelantada',
  rounded_shoulders: 'Hombros encorvados',
  slouching: 'Espalda encorvada',
  lateral_tilt: 'Inclinación lateral',
}

// Parte de la espalda donde se siente principalmente cada patrón, en lenguaje
// cotidiano (el patrón viene del resumen, no del análisis por zona).
const DOMINANT_ZONE: Record<string, string> = {
  forward_slouch: 'espalda media',
  excessive_recline: 'espalda baja',
  forward_head: 'cuello',
  rounded_shoulders: 'cuello',
  slouching: 'espalda media',
}

const dayFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' })

function isToday(iso: string): boolean {
  const d = parseServerDate(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
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

  const series = useMemo<TrendPoint[]>(
    () =>
      buildTrend(
        data ?? [],
        { id: currentSessionId, startedAt: currentStartedAt, adequatePct: currentAdequatePct, dominant: currentDominant },
        MAX_POINTS,
      ).points,
    [data, currentSessionId, currentStartedAt, currentAdequatePct, currentDominant],
  )

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
        <SectionEyebrow tone="moss">Evolución</SectionEyebrow>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Aún no hay con qué comparar
        </h2>
        <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
          Con al menos dos sesiones registradas verás aquí tu evolución de una a otra.
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
    <section className={`mb-7 grid gap-6 rounded-xl border p-6 lg:grid-cols-[1fr_300px] ${CARD_TONE.moss}`}>
      <div>
        <SectionEyebrow tone="moss">Evolución</SectionEyebrow>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Postura correcta, últimas {series.length} sesiones
        </h2>

        {/* Gráfico de barras: el valor (grande) va encima de cada barra y la fecha
            (pequeña) debajo. Track de altura fija para que la barra resuelva el %. */}
        <div className="mt-6 flex items-end gap-3" style={{ height: 140 }}>
          {series.map((p, i) => {
            const isCurrent = i === curIdx
            const barPx = Math.max(6, Math.round((Math.max(0, Math.min(100, p.pct)) / 100) * 110))
            return (
              <div key={p.id} className="flex flex-1 flex-col items-center justify-end gap-2">
                <span
                  className={`text-[16px] font-semibold leading-none tabular-nums ${
                    isCurrent ? 'text-moss-deep' : 'text-ink-soft'
                  }`}
                >
                  {Math.round(p.pct)}%
                </span>
                <div
                  className={`w-full rounded-t-md transition-colors ${
                    isCurrent ? 'bg-moss-deep' : 'bg-ink-soft/25'
                  }`}
                  style={{ height: barPx }}
                  title={`${dayFmt.format(parseServerDate(p.at))} · ${Math.round(p.pct)}% de postura correcta`}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex gap-3">
          {series.map((p, i) => {
            const isCurrent = i === curIdx
            const dateLabel = isToday(p.at) ? 'hoy' : dayFmt.format(parseServerDate(p.at)).replace('.', '')
            return (
              <span
                key={p.id}
                className={`flex-1 text-center text-[13px] ${
                  isCurrent ? 'font-semibold text-moss-deep' : 'text-ink-soft'
                }`}
              >
                {dateLabel}
              </span>
            )
          })}
        </div>

        <p className="mt-4 border-t border-sand pt-3 text-[13px] text-ink-soft">
          Cada barra es el % de postura correcta de una sesión. Promedio:{' '}
          <span className="font-semibold text-ink">{avg}%</span>.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:border-l lg:border-sand lg:pl-6">
        <div className="rounded-lg border border-sand bg-cream/60 p-4">
          <p className="text-[12px] font-medium text-ink-soft">Frente a la sesión anterior</p>
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
          <p className="mt-1 text-[13px] text-ink-soft">
            {delta === null
              ? ''
              : delta > 0
                ? 'Mejora respecto a la sesión anterior.'
                : delta < 0
                  ? 'Descenso respecto a la sesión anterior.'
                  : 'Sin cambios respecto a la anterior.'}
          </p>
        </div>

        <div className="rounded-lg border border-sand bg-cream/60 p-4">
          <p className="text-[12px] font-medium text-ink-soft">Patrón recurrente</p>
          {dominantLabel ? (
            <>
              <p className="mt-1.5 text-[17px] font-semibold leading-tight text-ink">
                {dominantLabel}
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">
                {dominantZone ? `Zona: ${dominantZone}. ` : ''}
                {streak >= 2
                  ? `${streak} sesiones seguidas.`
                  : 'Primera sesión con este patrón.'}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[14px] text-ink-soft">
              Sin patrón recurrente en esta sesión.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
