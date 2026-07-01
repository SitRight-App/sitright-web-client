import { useMemo } from 'react'
import { ArrowRight, Download } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { TimelineReading } from '@/features/posture-visualization/types/posture'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { ScoreRing } from '@/shared/ui/ScoreRing'
import { CARD_TONE, SectionEyebrow } from '@/shared/ui/SectionEyebrow'
import { PostureComparison } from '../components/PostureComparison'
import { SessionTimelineChart } from '../components/SessionTimelineChart'
import { SessionTrend } from '../components/SessionTrend'
import { useSession, useSessions, useZoneAnalysis } from '../hooks/useSessions'
import { useSessionReadings } from '../hooks/useSessionReadings'
import type { PostureSession, SessionSummary, ZoneDeviation } from '../types/session'
import { buildSessionPdf } from '../lib/sessionPdf'
import { recommendationKey, recommendationsFor } from '../lib/postureGuidance'

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

// Versión corta para cifras/etiquetas (2-3 palabras).
const POSTURE_TAG: Record<string, string> = {
  forward_slouch: 'Encorvado',
  excessive_recline: 'Reclinado',
  forward_head: 'Cabeza adelante',
  rounded_shoulders: 'Hombros caídos',
  slouching: 'Espalda encorvada',
  lateral_tilt: 'Ladeado',
}

// Descripción breve de cada postura, para que el usuario entienda los términos.
const POSTURE_DESC: Record<string, string> = {
  adequate: 'espalda alineada',
  forward_slouch: 'inclinado hacia adelante',
  excessive_recline: 'echado hacia atrás',
  forward_head: 'cabeza adelantada',
  rounded_shoulders: 'hombros encorvados',
  slouching: 'espalda encorvada',
  lateral_tilt: 'inclinado a un lado',
}

// Nombre de cada desviación en lenguaje claro pero no clínico.
const POSTURE_COLLOQUIAL: Record<string, string> = {
  forward_slouch: 'inclinarte hacia adelante',
  excessive_recline: 'reclinarte en exceso',
  forward_head: 'adelantar la cabeza',
  rounded_shoulders: 'encorvar los hombros',
  slouching: 'encorvar la espalda',
  lateral_tilt: 'inclinarte hacia un lado',
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

const DEVIATION_CLASSES = ['forward_slouch', 'excessive_recline'] as const

/**
 * Construye un resumen con la misma forma que `SessionSummary` a partir de las
 * lecturas reales. Se usa cuando la sesión aún no tiene resumen consolidado
 * (p. ej. sigue abierta) pero sí hay lecturas en su ventana: así todas las
 * métricas salen de la misma fuente y dejan de contradecirse.
 */
function summarizeReadings(readings: TimelineReading[]): SessionSummary {
  const counts: Record<string, number> = {}
  for (const r of readings) counts[r.posture_class] = (counts[r.posture_class] ?? 0) + 1
  const valid = readings.filter((r) => r.posture_class !== 'indeterminate').length
  const adequate = counts['adequate'] ?? 0
  let dominant: string | null = null
  let maxCount = 0
  for (const d of DEVIATION_CLASSES) {
    const c = counts[d] ?? 0
    if (c > maxCount) {
      maxCount = c
      dominant = d
    }
  }
  return {
    total_readings: readings.length,
    valid_readings: valid,
    adequate_percentage: valid > 0 ? (adequate / valid) * 100 : 0,
    dominant_deviation: dominant,
    total_minutes: 0,
    counts_by_class: counts,
  }
}

interface EffectiveSession {
  summary: SessionSummary | null
  readingCount: number
  dominant: string | null
  /** true cuando el resumen se derivó de lecturas en vivo (sesión sin consolidar). */
  provisional: boolean
}

/**
 * Vista coherente de la sesión: usa el resumen consolidado del backend si
 * existe; si no, lo deriva de las lecturas reales y lo marca como provisional.
 */
function resolveEffective(session: PostureSession, readings: TimelineReading[]): EffectiveSession {
  const s = session.summary
  if (s && s.valid_readings > 0) {
    return {
      summary: s,
      readingCount: session.reading_count,
      dominant: s.dominant_deviation,
      provisional: false,
    }
  }
  if (readings.length > 0) {
    const derived = summarizeReadings(readings)
    return {
      summary: derived,
      readingCount: readings.length,
      dominant: derived.dominant_deviation,
      provisional: true,
    }
  }
  return {
    summary: s,
    readingCount: session.reading_count,
    dominant: s?.dominant_deviation ?? null,
    provisional: false,
  }
}

const EMPTY_ZONE: ZoneDeviation = {
  deviated_pct: 0,
  minutes_in_deviation: 0,
  avg_angle_deg: 0,
  peak_angle_deg: 0,
  longest_streak_min: 0,
  episodes: 0,
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { data: session, isLoading, isError } = useSession(sessionId)

  const readingsQuery = useSessionReadings(sessionId)

  const readings = readingsQuery.data ?? []
  const effective = useMemo(
    () => (session ? resolveEffective(session, readings) : null),
    [session, readings],
  )
  const dominant = effective?.dominant ?? null
  const { data: reportZones } = useZoneAnalysis(session?.id)
  const stats = useMemo(() => deriveStats(readings, dominant), [readings, dominant])

  if (isLoading) {
    return <SessionDetailSkeleton />
  }

  if (isError || !session || !effective) {
    return (
      <div>
        <Link to="/history" className="text-[14px] font-medium text-moss hover:text-moss-deep">
          ← Historial
        </Link>
        <p className="mt-5 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep">
          No se pudo cargar la sesión.
        </p>
      </div>
    )
  }

  return (
    <div className="session-detail-printable">
      <Crumbs session={session} />
      <Hero session={session} effective={effective} stats={stats} />
      <PostureComparisonSection
        sessionId={session.id}
        adequatePct={Math.round(effective.summary?.adequate_percentage ?? 0)}
        dominantDeviation={effective.dominant}
      />
      <SessionTrend
        currentSessionId={session.id}
        currentStartedAt={session.started_at}
        currentAdequatePct={effective.summary?.adequate_percentage ?? null}
        currentDominant={effective.dominant}
      />
      <DetailGrid session={session} readingsQuery={readingsQuery} effective={effective} />
      <SecondRow tips={recommendationsFor(recommendationKey(dominant, reportZones?.zones)).tips} />
    </div>
  )
}

function SessionDetailSkeleton() {
  return (
    <div>
      <SkeletonTextLine width={200} className="mb-4" />
      <section className="mb-9 grid gap-10 border-b border-sand pb-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5 flex flex-wrap gap-7">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTextLine key={i} width={100} />
            ))}
          </div>
          <Skeleton width="70%" height={44} className="mb-3" />
          <Skeleton width="90%" height={20} />
        </div>
        <Skeleton width="100%" height={280} />
      </section>
      <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonTextLine width="60%" className="mb-4" />
            <Skeleton width="50%" height={36} />
            <SkeletonTextLine width="70%" className="mt-3" />
          </SkeletonCard>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SkeletonCard>
          <SkeletonTextLine width="40%" />
          <Skeleton width="70%" height={26} className="mt-2" />
          <Skeleton width="100%" height={260} className="mt-6" />
        </SkeletonCard>
        <SkeletonCard className="bg-cream-deep">
          <SkeletonTextLine width="30%" />
          <Skeleton width="80%" height={22} className="mt-3" />
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
    <div className="mb-5 flex items-center gap-2 text-[13px] text-ink-soft">
      <Link to="/history" className="font-medium text-moss hover:text-moss-deep">
        Historial
      </Link>
      <span className="text-ink-soft">/</span>
      <span className="text-ink-soft">Sesión del {dateLongFmt.format(startDate)}</span>
    </div>
  )
}

interface HeroProps {
  session: PostureSession
  effective: EffectiveSession
  stats: DerivedStats
}

function Hero({ session, effective, stats }: HeroProps) {
  const { data: zoneData } = useZoneAnalysis(session.id)
  const { dominant, provisional, summary } = effective
  const started = new Date(session.started_at)
  const ended = session.ended_at ? new Date(session.ended_at) : null
  const adequatePct =
    summary?.adequate_percentage != null ? Math.round(summary.adequate_percentage) : null

  // Variación vs. la sesión anterior (mismo cálculo que la tendencia; la query
  // de sesiones la comparte TanStack Query, así que no hay doble fetch).
  const { data: allSessions } = useSessions({ limit: 20 })
  const delta = useMemo<number | null>(() => {
    if (!allSessions || adequatePct === null) return null
    const pts = allSessions
      .filter((s) => s.summary && s.summary.valid_readings > 0)
      .map((s) => ({ id: s.id, at: s.started_at, pct: s.summary!.adequate_percentage }))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    const idx = pts.findIndex((p) => p.id === session.id)
    if (idx <= 0) return null
    return Math.round(pts[idx].pct - pts[idx - 1].pct)
  }, [allSessions, session.id, adequatePct])

  const figures: Array<{ label: string; value: string; meta?: string; tone?: 'moss' | 'alert' }> = [
    {
      label: 'Desviación más frecuente',
      value: dominant ? (POSTURE_TAG[dominant] ?? POSTURE_LABELS[dominant] ?? dominant) : 'Ninguna',
      meta: dominant ? POSTURE_DESC[dominant] : undefined,
      tone: dominant ? 'alert' : undefined,
    },
    {
      label: 'Pausas',
      value: stats.pauseEstimate.toString(),
      meta:
        stats.pauseAvgMinutes !== null
          ? `de ${stats.pauseAvgMinutes} min en promedio`
          : 'tramos sin datos del chaleco',
    },
  ]

  const lede =
    adequatePct !== null
      ? dominant
        ? `Mantuviste una postura correcta el ${adequatePct}% del tiempo. La desviación más frecuente fue ${POSTURE_COLLOQUIAL[dominant] ?? POSTURE_LABELS[dominant]?.toLowerCase() ?? dominant}.`
        : `Mantuviste una postura correcta el ${adequatePct}% del tiempo, sin una desviación predominante.`
      : 'Esta sesión todavía no tiene un resumen.'

  const metaLine = [
    ended ? `${timeFmt.format(started)} a ${timeFmt.format(ended)}` : timeFmt.format(started),
    session.duration_minutes !== null ? formatHoursMinutes(session.duration_minutes) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="mb-9 grid gap-8 border-b border-sand pb-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-9">
        {/* Anillo de score: protagonista del encabezado */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <ScoreRing value={adequatePct} />
          {delta !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${
                delta > 0
                  ? 'bg-moss/10 text-moss'
                  : delta < 0
                    ? 'bg-terracotta/10 text-terracotta-deep'
                    : 'bg-sand/50 text-ink-soft'
              }`}
            >
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {delta > 0 ? '+' : ''}
              {delta} pts vs. anterior
            </span>
          )}
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <p className="mb-2.5 text-[13px] font-medium text-ink-soft">{metaLine}</p>
          <h1 className="text-[44px] font-semibold leading-[1.02] tracking-tight text-ink">
            {adequatePct !== null && adequatePct >= 70 ? (
              <>
                Buena postura <span className="text-moss">en general.</span>
              </>
            ) : (
              <>
                Postura con <span className="text-amber">margen de mejora.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed text-ink-soft">{lede}</p>
          {provisional && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[12px] font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              Datos provisionales · la sesión sigue abierta
            </p>
          )}

          <dl className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-sand pt-5 sm:justify-start">
            {figures.map((f) => (
              <div key={f.label}>
                <dt className="text-[13px] font-medium text-ink-soft">{f.label}</dt>
                <dd
                  className={`mt-1 text-[26px] font-semibold leading-none tracking-tight ${
                    f.tone === 'moss'
                      ? 'text-moss'
                      : f.tone === 'alert'
                        ? 'text-terracotta-deep'
                        : 'text-ink'
                  }`}
                >
                  {f.value}
                </dd>
                {f.meta && <p className="mt-1 text-[13px] text-ink-soft">{f.meta}</p>}
              </div>
            ))}
          </dl>
        </div>
      </div>

      <aside className="rounded-xl bg-moss-deep p-7 text-cream-bone">
        <p className="mb-2.5 text-[13px] font-medium text-cream-bone/70">Resumen</p>
        <h3 className="mb-3 text-2xl font-semibold leading-tight tracking-tight">
          {dominant ? 'Hay margen de mejora.' : 'Buen desempeño.'}
        </h3>
        <p className="mb-6 text-[15px] leading-relaxed text-cream-bone/80">
          {dominant
            ? `Prioriza evitar ${POSTURE_COLLOQUIAL[dominant] ?? 'la desviación'}. Abajo tienes recomendaciones para corregirlo.`
            : 'Mantuviste una postura correcta la mayor parte del tiempo. Revisa las recomendaciones para conservarla.'}
        </p>
        <div className="flex flex-col gap-2.5 print:hidden">
          <Link
            to="/recommendations"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cream-bone px-4 py-3 text-[15px] font-semibold text-moss-deep transition-colors hover:bg-cream"
          >
            Ver recomendaciones
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
          <button
            type="button"
            onClick={() =>
              void buildSessionPdf({
                sessionId: session.id,
                dateLabel: dateLongFmt.format(new Date(session.started_at)),
                totalMinutes: summary?.total_minutes ?? session.duration_minutes ?? 0,
                adequatePct:
                  summary?.adequate_percentage != null ? Math.round(summary.adequate_percentage) : 0,
                dominantDeviation: dominant,
                zones:
                  zoneData?.zones ?? {
                    cervical: EMPTY_ZONE,
                    dorsal: EMPTY_ZONE,
                    lumbar: EMPTY_ZONE,
                  },
                calibrated: !!zoneData?.calibrated && (zoneData?.total_readings ?? 0) > 0,
                countsByClass: summary?.counts_by_class ?? {},
                pauses: stats.pauseEstimate,
              })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cream-bone/30 bg-transparent px-4 py-3 text-[15px] font-medium text-cream-bone transition-colors hover:border-cream-bone"
          >
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Descargar PDF
          </button>
        </div>
      </aside>
    </section>
  )
}

function PostureComparisonSection({
  sessionId,
  adequatePct,
  dominantDeviation,
}: {
  sessionId: string
  adequatePct: number
  dominantDeviation: string | null
}) {
  const { data, isLoading, isError } = useZoneAnalysis(sessionId)

  if (isLoading) {
    return (
      <section className="mb-7">
        <SkeletonCard>
          <SkeletonTextLine width="40%" />
          <Skeleton width="100%" height={240} className="mt-4" />
        </SkeletonCard>
      </section>
    )
  }

  // Endpoint nuevo: sesiones viejas o backend sin desplegar → no romper la página.
  if (isError || !data) return null

  return (
    <PostureComparison
      zones={data.zones}
      calibrated={data.calibrated && data.total_readings > 0}
      adequatePct={adequatePct}
      dominantDeviation={dominantDeviation}
    />
  )
}

interface DetailGridProps {
  session: PostureSession
  readingsQuery: ReturnType<typeof useSessionReadings>
  effective: EffectiveSession
}

function DetailGrid({ session, readingsQuery, effective }: DetailGridProps) {
  const { summary } = effective

  // Composición de la sesión para la barra segmentada (patrón "etapas de sueño").
  const dist = summary
    ? Object.entries(summary.counts_by_class)
        .map(([cls, count]) => ({
          cls,
          count,
          pct: summary.valid_readings ? Math.round((count / summary.valid_readings) * 100) : 0,
          label:
            cls === 'adequate' ? 'Postura correcta' : (POSTURE_TAG[cls] ?? POSTURE_LABELS[cls] ?? cls),
          desc: POSTURE_DESC[cls] ?? '',
          color: POSTURE_COLORS[cls] ?? 'bg-ink-faint',
        }))
        .filter((d) => d.pct > 0)
        .sort((a, b) => b.count - a.count)
    : []

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-xl border border-sand bg-cream-bone p-7">
        <div className="mb-5 border-b border-sand pb-4">
          <SectionEyebrow tone="neutral">Línea de tiempo de la sesión</SectionEyebrow>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
            Cómo se comportó tu columna
          </h2>
        </div>
        <SessionTimelineChart
          readings={readingsQuery.data ?? []}
          isLoading={readingsQuery.isLoading}
          isError={readingsQuery.isError}
          durationMinutes={session.duration_minutes}
        />
      </section>

      <section className="rounded-xl border border-sand bg-cream-deep p-7">
        <SectionEyebrow tone="neutral">Distribución</SectionEyebrow>
        <h3 className="mb-6 mt-2 text-xl font-semibold leading-tight tracking-tight text-ink">
          Cómo se repartió tu postura
        </h3>
        {dist.length > 0 ? (
          <>
            {/* Una sola barra dividida por color (composición de un vistazo). */}
            <div className="mt-2 flex h-5 w-full overflow-hidden rounded-full bg-ink-soft/10">
              {dist.map((d) => (
                <div
                  key={d.cls}
                  className={d.color}
                  style={{ width: `${d.pct}%` }}
                  title={`${d.label} · ${d.pct}%`}
                />
              ))}
            </div>
            <ul className="mt-5 space-y-3.5">
              {dist.map((d) => (
                <li key={d.cls} className="flex items-center justify-between gap-3">
                  <span className="flex items-start gap-2.5">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${d.color}`} />
                    <span>
                      <span className="block text-[15px] font-medium text-ink">{d.label}</span>
                      {d.desc && <span className="block text-[12.5px] text-ink-soft">{d.desc}</span>}
                    </span>
                  </span>
                  <span
                    className={`text-[20px] font-semibold tabular-nums ${
                      d.cls === 'adequate' ? 'text-moss' : 'text-terracotta-deep'
                    }`}
                  >
                    {d.pct}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-sand pt-3 text-[12.5px] text-ink-soft">
              Porcentajes sobre el tiempo registrado de la sesión.
            </p>
          </>
        ) : (
          <p className="text-[14px] text-ink-soft">Aún sin distribución consolidada.</p>
        )}
      </section>
    </div>
  )
}

function SecondRow({ tips }: { tips: string[] }) {
  return (
    <div className="mt-4">
      <section className={`rounded-xl border p-6 ${CARD_TONE.amber}`}>
        <div className="mb-4">
          <SectionEyebrow tone="amber">Recomendaciones</SectionEyebrow>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
            Qué puedes mejorar
          </h2>
        </div>
        <ul className="space-y-3">
          {tips.map((tip, i) => (
            <li
              key={i}
              className="grid grid-cols-[32px_1fr] items-start gap-4 rounded-xl border border-sand bg-cream/60 p-4"
            >
              <span className="text-center font-mono text-base font-semibold tabular-nums text-terracotta-deep">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[15px] leading-snug text-ink">{tip}</p>
            </li>
          ))}
        </ul>
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
