import { useMemo } from 'react'
import { ArrowRight, Download } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import type { TimelineReading } from '@/features/posture-visualization/types/posture'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { ScoreRing } from '@/shared/ui/ScoreRing'
import { SectionEyebrow } from '@/shared/ui/SectionEyebrow'
import { SessionBodyMap } from '../components/SessionBodyMap'
import { SessionTimelineChart } from '../components/SessionTimelineChart'
import { SessionTrend } from '../components/SessionTrend'
import { useSession, useSessions, useZoneAnalysis } from '../hooks/useSessions'
import { useSessionReadings } from '../hooks/useSessionReadings'
import type {
  PostureSession,
  SessionSummary,
  SpineZone,
  ZoneAnalysis,
  ZoneDeviation,
} from '../types/session'

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
  const recs = useRecommendations(dominant ?? undefined)
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
      <ZoneReport sessionId={session.id} />
      <SessionTrend
        currentSessionId={session.id}
        currentStartedAt={session.started_at}
        currentAdequatePct={effective.summary?.adequate_percentage ?? null}
        currentDominant={effective.dominant}
      />
      <DetailGrid session={session} readingsQuery={readingsQuery} effective={effective} />
      <SecondRow recommendations={recs.data ?? []} effective={effective} />
    </div>
  )
}

/**
 * HU-21 — exporta el detalle de la sesión como PDF.
 *
 * Usa html2canvas para capturar el bloque `.session-detail-printable` y
 * jsPDF para componer el archivo. Lo carga dinámicamente para no inflar el
 * bundle inicial (la mayoría de usuarios no exporta cada visita).
 *
 * Si la captura falla, hace fallback a `window.print()` (que también
 * permite guardar como PDF desde el diálogo del navegador).
 */
async function exportSessionToPdf(sessionId: string): Promise<void> {
  const target = document.querySelector<HTMLElement>('.session-detail-printable')
  if (!target) {
    window.print()
    return
  }
  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const canvas = await html2canvas(target, {
      backgroundColor: '#FAFAF9',
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      useCORS: true,
    })
    const imgData = canvas.toDataURL('image/png')
    // A4 portrait, márgenes 12 mm
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 12
    const usableWidth = pageWidth - margin * 2
    const ratio = canvas.height / canvas.width
    const imgHeight = usableWidth * ratio
    // Si la imagen es más alta que una página, se trocea en varias.
    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight)
    } else {
      let yOffset = 0
      const sliceHeight = pageHeight - margin * 2
      const sliceCanvasHeight = (sliceHeight / usableWidth) * canvas.width
      while (yOffset < canvas.height) {
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = Math.min(sliceCanvasHeight, canvas.height - yOffset)
        const ctx = sliceCanvas.getContext('2d')
        if (!ctx) break
        ctx.drawImage(
          canvas,
          0,
          yOffset,
          canvas.width,
          sliceCanvas.height,
          0,
          0,
          canvas.width,
          sliceCanvas.height,
        )
        const sliceData = sliceCanvas.toDataURL('image/png')
        if (yOffset > 0) pdf.addPage()
        const sliceImgHeight = (sliceCanvas.height / canvas.width) * usableWidth
        pdf.addImage(sliceData, 'PNG', margin, margin, usableWidth, sliceImgHeight)
        yOffset += sliceCanvas.height
      }
    }
    pdf.save(`sitright-sesion-${sessionId.slice(0, 8)}.pdf`)
  } catch {
    // Fallback al diálogo de impresión del navegador.
    window.print()
  }
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
      <span className="text-ink-faint">/</span>
      <span className="text-ink-faint">Sesión del {dateLongFmt.format(startDate)}</span>
    </div>
  )
}

interface HeroProps {
  session: PostureSession
  effective: EffectiveSession
  stats: DerivedStats
}

function Hero({ session, effective, stats }: HeroProps) {
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
      tone: dominant ? 'alert' : undefined,
    },
    {
      label: 'Pausas',
      value: stats.pauseEstimate.toString(),
      meta: stats.pauseAvgMinutes !== null ? `de ${stats.pauseAvgMinutes} min en promedio` : undefined,
    },
  ]

  const lede =
    adequatePct !== null
      ? dominant
        ? `La desviación más frecuente fue ${POSTURE_COLLOQUIAL[dominant] ?? POSTURE_LABELS[dominant]?.toLowerCase() ?? dominant}.`
        : 'No hubo una desviación predominante en esta sesión.'
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
          <p className="mb-2.5 text-[13px] font-medium text-ink-faint">{metaLine}</p>
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
                <dt className="text-[13px] font-medium text-ink-faint">{f.label}</dt>
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
        <div className="flex gap-2.5 print:hidden">
          <Link
            to="/recommendations"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cream-bone px-3.5 py-3 text-[15px] font-semibold text-moss-deep transition-colors hover:bg-cream"
          >
            Ver recomendaciones
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
          <button
            type="button"
            onClick={() => void exportSessionToPdf(session.id)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cream-bone/30 bg-transparent px-3.5 py-3 text-[15px] font-medium text-cream-bone transition-colors hover:border-cream-bone"
          >
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Descargar PDF
          </button>
        </div>
      </aside>
    </section>
  )
}

// Nombres en lenguaje cotidiano para cada parte de la espalda.
const ZONE_LABELS: Record<SpineZone, string> = {
  cervical: 'Cuello',
  dorsal: 'Espalda media',
  lumbar: 'Espalda baja',
}
const ZONE_ORDER: SpineZone[] = ['cervical', 'dorsal', 'lumbar']

type Severity = 'ok' | 'leve' | 'marcada'
function severityOf(pct: number): Severity {
  if (pct < 5) return 'ok'
  if (pct < 25) return 'leve'
  return 'marcada'
}

const SEV_LABEL: Record<Severity, string> = {
  ok: 'En rango',
  leve: 'Leve',
  marcada: 'Marcada',
}

function fmtMin(m: number): string {
  if (m <= 0) return '0 min'
  if (m < 1) return '<1 min'
  return `${Math.round(m)} min`
}

function zoneSummary(a: ZoneAnalysis): string {
  const dev = ZONE_ORDER.map((z) => ({ z, d: a.zones[z] }))
    .filter(({ d }) => d.deviated_pct >= 5)
    .sort((x, y) => y.d.deviated_pct - x.d.deviated_pct)

  if (dev.length === 0) {
    return 'Ninguna zona presentó una desviación sostenida durante la sesión.'
  }
  const worst = dev[0]
  let s = `La zona con mayor carga fue la ${ZONE_LABELS[worst.z].toLowerCase()}: estuvo desviada el ${Math.round(worst.d.deviated_pct)}% del tiempo.`
  if (dev.length > 1) s += ` También hubo desviación en la ${ZONE_LABELS[dev[1].z].toLowerCase()}.`
  return s
}

interface ZoneReportProps {
  sessionId: string
}

/**
 * Mapa corporal + detalle clínico por zona (ADR-006). Consume el análisis
 * geométrico del backend (ángulo de cada sensor vs. su neutro de calibración),
 * no la clase del modelo.
 */
function ZoneReport({ sessionId }: ZoneReportProps) {
  const { data, isLoading, isError } = useZoneAnalysis(sessionId)

  if (isLoading) {
    return (
      <section className="mb-7 grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <SkeletonCard className="bg-cream-deep">
          <SkeletonTextLine width="40%" />
          <Skeleton width="100%" height={280} className="mt-4" />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonTextLine width="40%" />
          <Skeleton width="90%" height={20} className="mt-3" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={72} />
            ))}
          </div>
        </SkeletonCard>
      </section>
    )
  }

  // Endpoint nuevo: sesiones viejas o backend sin desplegar → no romper la página.
  if (isError || !data) {
    return null
  }

  const note = !data.calibrated
    ? 'Tu chaleco no estaba calibrado en esta sesión, así que no pudimos medir cada parte de tu espalda. Calíbralo para verlo la próxima vez.'
    : data.total_readings === 0
      ? 'No hubo suficientes datos en esta sesión para revisar tu espalda parte por parte.'
      : null

  if (note) {
    return (
      <section className="editorial-card mb-7 bg-cream-deep p-6">
        <p className="label-mono">Tu espalda, parte por parte</p>
        <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">{note}</p>
      </section>
    )
  }

  // El color de la sección refleja el estado: terracota si alguna zona se desvió,
  // verde si todas quedaron en rango.
  const zoneTone = ZONE_ORDER.some((z) => severityOf(data.zones[z].deviated_pct) !== 'ok')
    ? 'terracotta'
    : 'moss'

  return (
    <section className="mb-7 grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="editorial-card flex flex-col bg-cream-deep p-6">
        <SectionEyebrow tone={zoneTone}>Mapa postural</SectionEyebrow>
        <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-ink">
          Tu espalda por zonas
        </h2>
        <div className="mt-3 flex-1">
          <SessionBodyMap zones={data.zones} thresholdDeg={data.threshold_degrees} />
        </div>
        <p className="mt-4 border-t border-sand pt-3 text-[14px] leading-relaxed text-ink-soft">
          El número es el <span className="font-medium text-ink">% del tiempo</span> que esa zona
          estuvo desviada. A más color, más tiempo de desviación.
        </p>
      </div>

      <div className="editorial-card p-6">
        <SectionEyebrow tone={zoneTone}>Carga por zona</SectionEyebrow>
        <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
          Zona con mayor carga
        </h2>
        <p className="mt-3 max-w-[680px] text-[16px] leading-relaxed text-ink-soft">
          {zoneSummary(data)}
        </p>

        <ul className="mt-5 space-y-3">
          {ZONE_ORDER.map((zone) => (
            <ZoneRow key={zone} zone={zone} d={data.zones[zone]} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function ZoneRow({ zone, d }: { zone: SpineZone; d: ZoneDeviation }) {
  const sev = severityOf(d.deviated_pct)
  const card =
    sev === 'ok'
      ? 'border-sand bg-cream/60'
      : sev === 'leve'
        ? 'border-terracotta/30 bg-terracotta/[0.06]'
        : 'border-terracotta-deep/40 bg-terracotta/10'
  const chip =
    sev === 'ok'
      ? 'bg-moss/12 text-moss'
      : 'bg-terracotta/15 text-terracotta-deep'
  const pctTone = sev === 'ok' ? 'text-ink' : 'text-terracotta-deep'

  return (
    <li className={`rounded-lg border p-4 ${card}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold text-ink">{ZONE_LABELS[zone]}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${chip}`}>
            {SEV_LABEL[sev]}
          </span>
        </div>
        <span className={`text-xl font-semibold tabular-nums ${pctTone}`}>
          {Math.round(d.deviated_pct)}%
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
        <ZoneMetric label="Tiempo desviada" value={fmtMin(d.minutes_in_deviation)} />
        <ZoneMetric label="Tramo más largo" value={fmtMin(d.longest_streak_min)} />
      </dl>
    </li>
  )
}

function ZoneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-medium tabular-nums text-ink">{value}</dd>
    </div>
  )
}

interface DetailGridProps {
  session: PostureSession
  readingsQuery: ReturnType<typeof useSessionReadings>
  effective: EffectiveSession
}

function DetailGrid({ session, readingsQuery, effective }: DetailGridProps) {
  const { summary } = effective

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
                      <span className="text-[15px] font-medium text-ink">
                        {cls === 'adequate'
                          ? 'Postura correcta'
                          : (POSTURE_TAG[cls] ?? POSTURE_LABELS[cls] ?? cls)}
                      </span>
                      <span
                        className={`text-lg font-semibold tabular-nums ${cls === 'adequate' ? 'text-ink' : 'text-terracotta-deep'}`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-soft/15">
                      <div
                        className={`h-full ${POSTURE_COLORS[cls] ?? 'bg-ink-faint'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-soft">Aún sin distribución consolidada.</p>
        )}
      </section>
    </div>
  )
}

interface SecondRowProps {
  recommendations: Array<{ id: string; number: string; title: string; description: string }>
  effective: EffectiveSession
}

function SecondRow({ recommendations, effective }: SecondRowProps) {
  const { dominant } = effective

  return (
    <div className="mt-4">
      <section className="rounded-xl border border-sand bg-cream-bone p-6">
        <div className="mb-4">
          <SectionEyebrow tone="amber">Recomendaciones</SectionEyebrow>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
            Qué puedes mejorar
          </h2>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-[15px] text-ink-soft">
            No hay recomendaciones específicas para esta sesión.
          </p>
        ) : (
          <ul className="space-y-3">
            {recommendations.slice(0, 4).map((r, i) => (
              <li
                key={r.id}
                className="grid grid-cols-[32px_1fr_auto] items-center gap-4 rounded-xl border border-sand bg-cream/60 p-4 transition-colors hover:border-moss/40 hover:bg-cream"
              >
                <span className="text-center font-mono text-base font-semibold tabular-nums text-terracotta-deep">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-[16px] font-medium text-ink">{r.title}</p>
                  <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">
                    {r.description}
                  </p>
                </div>
                {dominant && (
                  <span className="whitespace-nowrap rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-[12px] font-medium text-terracotta-deep">
                    {POSTURE_TAG[dominant] ?? POSTURE_LABELS[dominant] ?? dominant}
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
