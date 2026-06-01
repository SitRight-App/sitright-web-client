import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import type {
  PostureClass,
  TimelineReading,
} from '@/features/posture-visualization/types/posture'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { SessionSpineSnapshot } from '../components/SessionSpineSnapshot'
import { SessionTimelineChart } from '../components/SessionTimelineChart'
import { useSession } from '../hooks/useSessions'
import { useSessionReadings } from '../hooks/useSessionReadings'
import type { PostureSession } from '../types/session'

const dateLongFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'long',
  weekday: 'long',
})

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const POSTURE_LABELS: Record<string, string> = {
  adequate: 'Postura adecuada',
  forward_slouch: 'Inclinación frontal',
  excessive_recline: 'Reclinación excesiva',
  indeterminate: 'Indeterminada',
  forward_head: 'Cabeza adelantada',
  rounded_shoulders: 'Hombros encorvados',
  slouching: 'Espalda encorvada',
  lateral_tilt: 'Inclinación lateral',
}

const POSTURE_COLORS: Record<string, string> = {
  adequate: 'bg-moss',
  forward_slouch: 'bg-terracotta-soft',
  excessive_recline: 'bg-terracotta',
  indeterminate: 'bg-ink-faint/40',
}

function sensorFromPosture(cls: PostureClass | string): 'cervical' | 'dorsal' | 'lumbar' | null {
  switch (cls) {
    case 'forward_slouch':
      return 'cervical'
    case 'excessive_recline':
      return 'lumbar'
    default:
      return null
  }
}

interface DerivedStats {
  avgConfidencePercent: number
  pauseEstimate: number
  pauseAvgMinutes: number | null
  dominantPeakTime: string | null
  outlierCount: number
}

/**
 * Deriva métricas de UI a partir de las lecturas reales de la sesión.
 *
 * - "Pausas": tramos sin lecturas mayores a 2 minutos (cuando el chaleco
 *   probablemente estuvo apagado o en pausa).
 * - "Outliers": lecturas con confianza menor al 70 % (la clase indeterminate del modelo).
 * - "Pico desviación": timestamp de la lectura con mayor confianza dentro de la clase
 *   dominante de desviación.
 */
function deriveStats(readings: TimelineReading[], dominant: string | null): DerivedStats {
  if (readings.length === 0) {
    return {
      avgConfidencePercent: 0,
      pauseEstimate: 0,
      pauseAvgMinutes: null,
      dominantPeakTime: null,
      outlierCount: 0,
    }
  }
  const total = readings.length
  const avgConfidence = readings.reduce((acc, r) => acc + r.confidence, 0) / total
  const outliers = readings.filter((r) => r.confidence < 0.7).length

  const pauseGaps: number[] = []
  for (let i = 1; i < readings.length; i++) {
    const dt =
      (new Date(readings[i].timestamp).getTime() -
        new Date(readings[i - 1].timestamp).getTime()) /
      60_000
    if (dt > 2) pauseGaps.push(dt)
  }

  let peakTime: string | null = null
  if (dominant) {
    const dominantReadings = readings.filter((r) => r.posture_class === dominant)
    if (dominantReadings.length > 0) {
      const peak = dominantReadings.reduce(
        (best, r) => (r.confidence > best.confidence ? r : best),
        dominantReadings[0],
      )
      peakTime = peak.timestamp
    }
  }

  return {
    avgConfidencePercent: Math.round(avgConfidence * 100),
    pauseEstimate: pauseGaps.length,
    pauseAvgMinutes:
      pauseGaps.length > 0
        ? Math.round((pauseGaps.reduce((a, b) => a + b, 0) / pauseGaps.length) * 10) / 10
        : null,
    dominantPeakTime: peakTime,
    outlierCount: outliers,
  }
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { data: session, isLoading, isError } = useSession(sessionId)

  const readingsQuery = useSessionReadings({
    startedAt: session?.started_at,
    endedAt: session?.ended_at,
  })

  const dominant = session?.summary?.dominant_deviation ?? null
  const recs = useRecommendations(dominant ?? undefined)

  const stats = useMemo(
    () => deriveStats(readingsQuery.data ?? [], dominant),
    [readingsQuery.data, dominant],
  )

  if (isLoading) {
    return <SessionDetailSkeleton />
  }

  if (isError || !session) {
    return (
      <div>
        <Link to="/history" className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
          ← Historial
        </Link>
        <p className="mt-5 border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo cargar la sesión.
        </p>
      </div>
    )
  }

  return (
    <div className="session-detail-printable">
      <Crumbs session={session} />
      <Hero session={session} stats={stats} dominant={dominant} />
      <StatsRow session={session} stats={stats} dominant={dominant} />
      <DetailGrid
        session={session}
        readingsQuery={readingsQuery}
        dominant={dominant}
      />
      <SecondRow
        session={session}
        recommendations={recs.data ?? []}
        dominant={dominant}
      />
    </div>
  )
}

function exportSessionToPdf() {
  window.print()
}

function SessionDetailSkeleton() {
  return (
    <div>
      <SkeletonTextLine width={260} className="mb-4" />
      <section className="mb-9 grid gap-12 border-b border-sand pb-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5 flex flex-wrap gap-7">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTextLine key={i} width={120} />
            ))}
          </div>
          <Skeleton width="70%" height={56} className="mb-3" />
          <Skeleton width="60%" height={56} className="mb-4" />
          <Skeleton width="100%" height={56} />
        </div>
        <Skeleton width="100%" height={280} />
      </section>
      <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonTextLine width="60%" className="mb-4" />
            <Skeleton width="50%" height={40} />
            <SkeletonTextLine width="70%" className="mt-3" />
          </SkeletonCard>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SkeletonCard>
          <SkeletonTextLine width="40%" />
          <Skeleton width="70%" height={28} className="mt-2" />
          <Skeleton width="100%" height={260} className="mt-6" />
        </SkeletonCard>
        <SkeletonCard className="bg-cream-deep">
          <SkeletonTextLine width="30%" />
          <Skeleton width="80%" height={24} className="mt-3" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <SkeletonTextLine width="70%" />
                <Skeleton width="100%" height={6} className="mt-1.5" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  )
}

function Crumbs({ session }: { session: PostureSession }) {
  const startDate = new Date(session.started_at)
  return (
    <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
      <Link to="/" className="hover:text-ink">
        Panel
      </Link>
      <span className="mx-2 text-terracotta">›</span>
      <Link to="/history" className="hover:text-ink">
        Historial
      </Link>
      <span className="mx-2 text-terracotta">›</span>
      Sesión {dateLongFmt.format(startDate)}
    </div>
  )
}

interface HeroProps {
  session: PostureSession
  stats: DerivedStats
  dominant: string | null
}

function Hero({ session, dominant }: HeroProps) {
  const started = new Date(session.started_at)
  const ended = session.ended_at ? new Date(session.ended_at) : null
  const adequatePct = session.summary?.adequate_percentage
    ? Math.round(session.summary.adequate_percentage)
    : null

  const lede =
    adequatePct !== null
      ? dominant
        ? `Mantuviste postura adecuada el ${adequatePct}% del tiempo, con la desviación dominante concentrada en ${POSTURE_LABELS[dominant]?.toLowerCase() ?? dominant}.`
        : `Mantuviste postura adecuada el ${adequatePct}% del tiempo, sin desviaciones dominantes registradas.`
      : 'Esta sesión aún no tiene resumen consolidado.'

  return (
    <section className="mb-9 grid gap-12 border-b border-sand pb-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-5 flex flex-wrap gap-7 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          <span>
            <strong className="font-medium text-terracotta">SES №</strong> {session.id.slice(0, 8)}
          </span>
          <span>
            <strong className="font-medium text-terracotta">INI</strong> {timeFmt.format(started)}
            {ended && (
              <>
                {' — '}
                <strong className="font-medium text-terracotta">FIN</strong> {timeFmt.format(ended)}
              </>
            )}
          </span>
          {session.duration_minutes !== null && (
            <span>
              <strong className="font-medium text-terracotta">DURACIÓN</strong>{' '}
              {formatHoursMinutes(session.duration_minutes)}
            </span>
          )}
          <span>
            <strong className="font-medium text-terracotta">LECTURAS</strong>{' '}
            {session.reading_count.toLocaleString('es-PE')}
          </span>
        </div>

        <h1 className="mb-5 font-serif text-[64px] font-normal leading-[0.92] tracking-[-0.035em] text-ink">
          Una jornada
          <br />
          de <em className="italic text-moss">{adequatePct !== null && adequatePct >= 70 ? 'postura disciplinada.' : 'postura activa.'}</em>
        </h1>
        <p className="max-w-[640px] font-serif text-[17px] font-light leading-relaxed text-ink-soft">
          {lede}
        </p>
      </div>

      <aside
        className="relative rounded p-7 text-cream"
        style={{
          backgroundColor: 'rgb(var(--color-moss-deep))',
          backgroundImage:
            'radial-gradient(at 100% 0%, rgba(200,98,60,0.18), transparent 60%)',
        }}
      >
        <span className="absolute right-5 top-5 font-mono text-[10px] uppercase tracking-[0.16em] text-cream/55">
          № 00
        </span>
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sand">
          Análisis automático
        </p>
        <h3 className="mb-3 font-serif text-2xl leading-tight tracking-tight">
          {dominant ? 'Detectamos un patrón.' : 'Jornada balanceada.'}
        </h3>
        <p className="mb-5 text-[13px] leading-relaxed text-cream/70">
          {dominant
            ? `Tu desviación dominante fue ${POSTURE_LABELS[dominant]?.toLowerCase() ?? dominant}. Revisa las recomendaciones activadas para corregir el patrón en próximas sesiones.`
            : 'No se identificó una desviación dominante. Mantén el ritmo y consulta las recomendaciones generales.'}
        </p>
        <div className="flex gap-2.5 print:hidden">
          <Link
            to="/recommendations"
            className="flex-1 border border-terracotta bg-terracotta px-3.5 py-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-cream transition-colors hover:bg-terracotta-deep"
          >
            Ver acciones
          </Link>
          <button
            type="button"
            onClick={exportSessionToPdf}
            className="flex-1 border border-cream/30 bg-transparent px-3.5 py-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-cream transition-colors hover:border-cream"
          >
            Exportar PDF
          </button>
        </div>
      </aside>
    </section>
  )
}

interface StatsRowProps {
  session: PostureSession
  stats: DerivedStats
  dominant: string | null
}

function StatsRow({ session, stats, dominant }: StatsRowProps) {
  const summary = session.summary
  const dominantCount = dominant && summary?.counts_by_class[dominant] ? summary.counts_by_class[dominant] : null
  const dominantPct =
    dominantCount !== null && summary?.valid_readings
      ? Math.round((dominantCount / summary.valid_readings) * 100)
      : null

  return (
    <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        num="№ 01"
        title="Postura adecuada"
        value={summary ? `${Math.round(summary.adequate_percentage)}%` : '—'}
        meta={summary ? `${summary.valid_readings.toLocaleString('es-PE')} lecturas válidas` : ''}
        variant="dark"
      />
      <StatCard
        num="№ 02"
        title="Desviación dominante"
        value={
          dominant
            ? (POSTURE_LABELS[dominant] ?? dominant)
            : '—'
        }
        valueSize="md"
        meta={
          dominantCount !== null && dominantPct !== null
            ? `${dominantCount} lecturas · ${dominantPct}% del tiempo`
            : 'Sin desviaciones dominantes'
        }
        variant={dominant ? 'alert' : 'default'}
      />
      <StatCard
        num="№ 03"
        title="Pausas detectadas"
        value={stats.pauseEstimate.toString()}
        meta={
          stats.pauseAvgMinutes !== null
            ? `prom. ${stats.pauseAvgMinutes} min`
            : 'sin pausas detectadas'
        }
      />
      <StatCard
        num="№ 04"
        title="Confianza ML media"
        value={`${stats.avgConfidencePercent}%`}
        meta={
          stats.outlierCount > 0
            ? `${stats.outlierCount} outliers (<70 %)`
            : 'sin outliers detectados'
        }
      />
    </div>
  )
}

interface StatCardProps {
  num: string
  title: string
  value: string
  meta: string
  variant?: 'default' | 'dark' | 'alert'
  valueSize?: 'lg' | 'md'
}

function StatCard({ num, title, value, meta, variant = 'default', valueSize = 'lg' }: StatCardProps) {
  const styles: Record<NonNullable<StatCardProps['variant']>, string> = {
    default: 'border-sand bg-cream-bone text-ink',
    dark: 'border-moss bg-moss text-cream',
    alert: 'border-terracotta-deep bg-terracotta text-cream',
  }
  const metaStyle: Record<NonNullable<StatCardProps['variant']>, string> = {
    default: 'text-ink-soft',
    dark: 'text-cream/70',
    alert: 'text-cream/70',
  }
  const titleStyle: Record<NonNullable<StatCardProps['variant']>, string> = {
    default: 'text-ink-soft',
    dark: 'text-sand',
    alert: 'text-sand',
  }

  return (
    <div className={`relative rounded border p-5 ${styles[variant]}`}>
      <span
        className={`absolute right-4 top-4 font-mono text-[10px] uppercase tracking-[0.16em] ${variant === 'default' ? 'text-ink-faint' : 'text-cream/55'}`}
      >
        {num}
      </span>
      <p className={`mb-4 font-mono text-[10px] uppercase tracking-[0.18em] ${titleStyle[variant]}`}>
        {title}
      </p>
      <p
        className={`font-serif leading-none tracking-[-0.035em] ${
          valueSize === 'lg' ? 'text-[48px]' : 'text-[28px]'
        }`}
      >
        {value}
      </p>
      <p className={`mt-2.5 font-mono text-[11px] ${metaStyle[variant]}`}>{meta}</p>
    </div>
  )
}

interface DetailGridProps {
  session: PostureSession
  readingsQuery: ReturnType<typeof useSessionReadings>
  dominant: string | null
}

function DetailGrid({ session, readingsQuery }: DetailGridProps) {
  const summary = session.summary

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="relative rounded border border-sand bg-cream-bone p-7">
        <span className="num-tag absolute right-5 top-5">№ 05</span>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-sand pb-4">
          <div>
            <p className="label-mono mb-1.5">Línea de tiempo de la sesión</p>
            <h2 className="font-serif text-2xl tracking-tight text-ink">
              Cómo se comportó tu columna
            </h2>
          </div>
        </div>
        <SessionTimelineChart
          readings={readingsQuery.data ?? []}
          isLoading={readingsQuery.isLoading}
          isError={readingsQuery.isError}
          durationMinutes={session.duration_minutes}
        />
      </section>

      <section className="relative rounded border border-sand bg-cream-deep p-7">
        <span className="num-tag absolute right-5 top-5">№ 06</span>
        <p className="label-mono">Distribución</p>
        <h3 className="mt-1.5 mb-6 font-serif text-xl leading-tight tracking-tight text-ink">
          Cómo se repartieron tus{' '}
          {summary?.valid_readings
            ? summary.valid_readings.toLocaleString('es-PE')
            : session.reading_count.toLocaleString('es-PE')}{' '}
          lecturas.
        </h3>
        {summary && Object.keys(summary.counts_by_class).length > 0 ? (
          <ul className="space-y-4">
            {Object.entries(summary.counts_by_class)
              .sort(([, a], [, b]) => b - a)
              .map(([cls, count]) => {
                const pct = summary.valid_readings
                  ? Math.round((count / summary.valid_readings) * 100)
                  : 0
                return (
                  <li key={cls}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-serif text-[15px] text-ink">
                        {POSTURE_LABELS[cls] ?? cls}
                      </span>
                      <span
                        className={`font-serif text-xl ${cls === 'adequate' ? 'text-ink' : 'text-terracotta-deep'}`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-soft/15">
                      <div
                        className={`h-full ${POSTURE_COLORS[cls] ?? 'bg-ink-faint'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.10em] text-ink-faint">
                      {count.toLocaleString('es-PE')} lecturas
                    </p>
                  </li>
                )
              })}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Aún sin distribución consolidada.</p>
        )}
      </section>
    </div>
  )
}

interface SecondRowProps {
  session: PostureSession
  recommendations: Array<{ id: string; number: string; title: string; description: string }>
  dominant: string | null
}

function SecondRow({ session, recommendations, dominant }: SecondRowProps) {
  const summary = session.summary
  const dominantSensor = dominant ? sensorFromPosture(dominant) : null
  const dominantPct =
    dominant && summary?.counts_by_class[dominant] && summary.valid_readings
      ? Math.round((summary.counts_by_class[dominant] / summary.valid_readings) * 100)
      : null

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
      <section className="relative rounded border border-sand bg-cream-deep p-6">
        <span className="num-tag absolute right-5 top-5">№ 07</span>
        <p className="label-mono">Posición promedio</p>
        <h3 className="mt-2 mb-3 font-serif text-xl leading-tight tracking-tight text-ink">
          Promedio
          <br />
          de la sesión.
        </h3>
        <SessionSpineSnapshot
          warningSensor={dominantSensor}
          deviationPercentage={dominantPct}
        />
        <div className="mt-3 border-t border-dashed border-sand pt-3 font-mono text-[10px] uppercase tracking-[0.10em] text-ink-soft">
          {dominantSensor
            ? `Desviación en ${dominantSensor}`
            : 'Sin desviación dominante registrada'}
        </div>
      </section>

      <section className="relative rounded border border-sand bg-cream-bone p-6">
        <span className="num-tag absolute right-5 top-5">№ 08</span>
        <div className="mb-3.5">
          <p className="label-mono">Recomendaciones disparadas en esta sesión</p>
          <h2 className="mt-1.5 font-serif text-2xl tracking-tight text-ink">
            Qué activó tu columna.
          </h2>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Sin recomendaciones específicas para el patrón postural de esta sesión.
          </p>
        ) : (
          <ul className="space-y-3.5">
            {recommendations.slice(0, 4).map((r, i) => (
              <li
                key={r.id}
                className="grid grid-cols-[40px_1fr_auto] items-center gap-4 rounded border border-sand-light bg-cream/60 p-4 transition-colors hover:border-sand hover:bg-cream"
              >
                <span className="text-center font-serif text-2xl leading-none text-terracotta-deep">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="font-serif text-[15px] text-ink">{r.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
                    {r.description}
                  </p>
                </div>
                {dominant && (
                  <span className="whitespace-nowrap rounded-full border border-terracotta-soft bg-terracotta-soft/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-terracotta-deep">
                    {POSTURE_LABELS[dominant]?.toLowerCase() ?? dominant}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatHoursMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes - h * 60)
  return `${h} h ${m.toString().padStart(2, '0')} min`
}
