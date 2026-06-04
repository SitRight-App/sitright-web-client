import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SkeletonCard, SkeletonTextLine, Skeleton } from '@/shared/ui/Skeleton'
import { useSessions } from '../hooks/useSessions'
import type { PostureSession } from '../types/session'

const weekdayFmt = new Intl.DateTimeFormat('es-PE', { weekday: 'short' })
const dayFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' })

interface DayPoint {
  /** Etiqueta corta para el eje X (ej. "lun 02/06"). */
  label: string
  /** Día normalizado a medianoche (timestamp ms). */
  dayKey: number
  /** % de postura adecuada agregado del día. null si no hubo uso. */
  percent: number | null
  /** Lecturas válidas del día (para tooltip). */
  validReadings: number
}

function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function buildWeek(sessions: PostureSession[]): DayPoint[] {
  // Últimos 7 días, hoy incluido.
  const today = startOfDay(new Date())
  const points: DayPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const dayKey = today - i * 24 * 60 * 60 * 1000
    const date = new Date(dayKey)
    points.push({
      label: `${weekdayFmt.format(date)} ${dayFmt.format(date)}`,
      dayKey,
      percent: null,
      validReadings: 0,
    })
  }

  // Agrega cada sesión cerrada al bucket de su día.
  for (const session of sessions) {
    if (!session.summary) continue
    const dayKey = startOfDay(new Date(session.started_at))
    const point = points.find((p) => p.dayKey === dayKey)
    if (!point) continue
    // Promedio ponderado por lecturas válidas.
    const newValid = point.validReadings + session.summary.valid_readings
    const newPct =
      ((point.percent ?? 0) * point.validReadings +
        session.summary.adequate_percentage * session.summary.valid_readings) /
      Math.max(newValid, 1)
    point.percent = Math.round(newPct)
    point.validReadings = newValid
  }

  return points
}

function trendLine(points: DayPoint[]): { dayKey: number; trend: number | null }[] {
  // Línea de tendencia: regresión lineal simple sobre los puntos con datos.
  const withData = points.filter((p) => p.percent !== null) as Array<
    DayPoint & { percent: number }
  >
  if (withData.length < 2) {
    return points.map((p) => ({ dayKey: p.dayKey, trend: null }))
  }
  // x = índice cronológico (0..n-1), y = percent
  const n = withData.length
  const xs = withData.map((_, i) => i)
  const ys = withData.map((p) => p.percent)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  const intercept = meanY - slope * meanX
  // Mapear cada bucket de 7 días al índice cronológico relativo
  const orderedKeys = withData.map((p) => p.dayKey)
  return points.map((p) => {
    const idx = orderedKeys.indexOf(p.dayKey)
    if (idx === -1) {
      // Punto sin datos: proyectamos su posición en la regresión.
      const projected = points.indexOf(p)
      const projectedIdx = projected - (points.length - n)
      return { dayKey: p.dayKey, trend: Math.round(intercept + slope * projectedIdx) }
    }
    return { dayKey: p.dayKey, trend: Math.round(intercept + slope * idx) }
  })
}

interface ChartRow extends DayPoint {
  trend: number | null
}

interface TooltipItem {
  name?: string
  value?: number | null
  payload?: ChartRow
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipItem[]
}

function WeeklyTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  if (!p) return null
  return (
    <div className="rounded-lg border border-sand bg-cream-bone p-2.5 font-mono text-[10px] shadow-sm">
      <p className="text-ink">{p.label}</p>
      <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-moss">
        {p.percent !== null ? `${p.percent}% postura adecuada` : 'sin uso registrado'}
      </p>
      {p.validReadings > 0 && (
        <p className="text-ink-soft">{p.validReadings} lecturas válidas</p>
      )}
    </div>
  )
}

export function WeeklyEvolutionPage() {
  const { data: sessions, isLoading, isError } = useSessions({ limit: 200 })

  const points = useMemo(() => buildWeek(sessions ?? []), [sessions])
  const trend = useMemo(() => trendLine(points), [points])
  const chartData: ChartRow[] = useMemo(
    () =>
      points.map((p, i) => ({
        ...p,
        trend: trend[i]?.trend ?? null,
      })),
    [points, trend],
  )
  const daysWithData = points.filter((p) => p.percent !== null).length
  const weeklyAvg =
    daysWithData > 0
      ? Math.round(
          points
            .filter((p) => p.percent !== null)
            .reduce((acc, p) => acc + (p.percent ?? 0), 0) / daysWithData,
        )
      : null

  return (
    <div>
      {/* Encabezado: título limpio + promedio destacado como métrica */}
      <div className="flex flex-wrap items-end justify-between gap-6 pb-6">
        <div>
          <Link
            to="/history"
            className="text-[14px] text-ink-soft transition-colors hover:text-moss"
          >
            Historial
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Tu semana postural
          </h1>
        </div>

        {weeklyAvg !== null && (
          <div className="rounded-xl border border-sand bg-cream-bone px-5 py-3.5 text-right">
            <p className="label-mono text-ink-faint">Promedio adecuada</p>
            <p className="mt-1.5 font-mono text-[32px] font-semibold leading-none tabular-nums tracking-tight text-ink">
              {weeklyAvg}
              <small className="ml-0.5 text-xl text-ink-soft">%</small>
            </p>
          </div>
        )}
      </div>

      {isError && (
        <p className="mb-6 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep">
          No se pudo obtener el historial.
        </p>
      )}

      {isLoading && (
        <SkeletonCard className="mt-8">
          <SkeletonTextLine width="40%" />
          <Skeleton width="100%" height={280} className="mt-6" />
        </SkeletonCard>
      )}

      {!isLoading && (
        <div>
          {/* HU-20 AC2 — datos insuficientes (<3 días) */}
          {daysWithData < 3 && (
            <div className="mb-6 rounded-lg border border-sand bg-cream-deep px-4 py-3 text-[14px] text-ink-soft">
              Se necesitan al menos 3 días de uso para mostrar una tendencia. Tienes{' '}
              {daysWithData} día{daysWithData === 1 ? '' : 's'} registrado{daysWithData === 1 ? '' : 's'}.
            </div>
          )}

          <div className="editorial-card rounded-xl p-7">
            <p className="label-mono">Postura adecuada por día</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Últimos 7 días
            </h2>

            <div className="mt-6" style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 4"
                    stroke="rgb(var(--color-ink-soft) / 0.10)"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="rgb(var(--color-ink-faint))"
                    tick={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 10,
                      fill: 'rgb(var(--color-ink-faint))',
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}%`}
                    stroke="rgb(var(--color-ink-faint))"
                    tick={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 10,
                      fill: 'rgb(var(--color-ink-faint))',
                    }}
                    width={42}
                  />
                  <ReferenceLine
                    y={70}
                    stroke="rgb(var(--color-terracotta-soft))"
                    strokeDasharray="3 4"
                    strokeWidth={1}
                  />
                  <Tooltip content={<WeeklyTooltip />} cursor={{ fill: 'rgb(var(--color-ink-soft) / 0.06)' }} />
                  <Bar
                    dataKey="percent"
                    fill="rgb(var(--color-moss))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={42}
                  />
                  {daysWithData >= 2 && (
                    <Line
                      type="monotone"
                      dataKey="trend"
                      stroke="rgb(var(--color-terracotta))"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                      strokeDasharray="2 4"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-moss" />
                Postura adecuada por día
              </span>
              {daysWithData >= 2 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-px w-5 bg-terracotta" />
                  Tendencia
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-px w-5 bg-terracotta-soft" />
                Umbral 70 %
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
