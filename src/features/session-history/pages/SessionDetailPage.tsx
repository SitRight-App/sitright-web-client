import { useMemo } from 'react'
import { ArrowRight, Download } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import type { TimelineReading } from '@/features/posture-visualization/types/posture'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { SessionBodyMap } from '../components/SessionBodyMap'
import { SessionTimelineChart } from '../components/SessionTimelineChart'
import { useSession, useZoneAnalysis } from '../hooks/useSessions'
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
      <Hero session={session} effective={effective} />
      <ZoneReport
        sessionId={session.id}
        durationMinutes={session.duration_minutes}
        adequatePct={effective.summary?.adequate_percentage ?? null}
      />
      <StatsRow stats={stats} effective={effective} />
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
}

function Hero({ session, effective }: HeroProps) {
  const { dominant, readingCount, provisional, summary } = effective
  const started = new Date(session.started_at)
  const ended = session.ended_at ? new Date(session.ended_at) : null
  const adequatePct =
    summary?.adequate_percentage != null ? Math.round(summary.adequate_percentage) : null

  const lede =
    adequatePct !== null
      ? dominant
        ? `Mantuviste postura adecuada el ${adequatePct}% del tiempo, con la desviación dominante concentrada en ${POSTURE_LABELS[dominant]?.toLowerCase() ?? dominant}.`
        : `Mantuviste postura adecuada el ${adequatePct}% del tiempo, sin desviaciones dominantes registradas.`
      : 'Esta sesión aún no tiene resumen consolidado.'

  const meta: Array<{ label: string; value: string }> = [
    { label: 'Sesión', value: session.id.slice(0, 8) },
    {
      label: 'Horario',
      value: ended
        ? `${timeFmt.format(started)} a ${timeFmt.format(ended)}`
        : timeFmt.format(started),
    },
    ...(session.duration_minutes !== null
      ? [{ label: 'Duración', value: formatHoursMinutes(session.duration_minutes) }]
      : []),
    { label: 'Lecturas', value: readingCount.toLocaleString('es-PE') },
  ]

  return (
    <section className="mb-9 grid gap-10 border-b border-sand pb-8 lg:grid-cols-[1fr_360px]">
      <div>
        <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-3">
          {meta.map((m) => (
            <div key={m.label}>
              <dt className="text-[12px] font-medium text-ink-faint">{m.label}</dt>
              <dd className="mt-0.5 text-[15px] font-medium text-ink">
                {m.label === 'Sesión' ? (
                  <span className="font-mono tabular-nums">{m.value}</span>
                ) : (
                  m.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-tight text-ink">
          Una jornada de{' '}
          <span className="text-moss">
            {adequatePct !== null && adequatePct >= 70
              ? 'postura disciplinada.'
              : 'postura activa.'}
          </span>
        </h1>
        <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-ink-soft">{lede}</p>
        {provisional && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[12px] font-medium text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            Datos provisionales · la sesión sigue abierta
          </p>
        )}
      </div>

      <aside className="rounded-xl bg-moss-deep p-7 text-cream-bone">
        <p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.12em] text-cream-bone/60">
          Análisis automático
        </p>
        <h3 className="mb-3 text-2xl font-semibold leading-tight tracking-tight">
          {dominant ? 'Detectamos un patrón.' : 'Jornada balanceada.'}
        </h3>
        <p className="mb-6 text-[14px] leading-relaxed text-cream-bone/70">
          {dominant
            ? `Tu desviación dominante fue ${POSTURE_LABELS[dominant]?.toLowerCase() ?? dominant}. Revisa las recomendaciones activadas para corregir el patrón en próximas sesiones.`
            : 'No se identificó una desviación dominante. Mantén el ritmo y consulta las recomendaciones generales.'}
        </p>
        <div className="flex gap-2.5 print:hidden">
          <Link
            to="/recommendations"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cream-bone px-3.5 py-3 text-[14px] font-semibold text-moss-deep transition-colors hover:bg-cream"
          >
            Ver acciones
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
          <button
            type="button"
            onClick={() => void exportSessionToPdf(session.id)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cream-bone/30 bg-transparent px-3.5 py-3 text-[14px] font-medium text-cream-bone transition-colors hover:border-cream-bone"
          >
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Exportar PDF
          </button>
        </div>
      </aside>
    </section>
  )
}

const ZONE_LABELS: Record<SpineZone, string> = {
  cervical: 'Cervical',
  dorsal: 'Dorsal',
  lumbar: 'Lumbar',
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
  leve: 'Desviación leve',
  marcada: 'Desviación marcada',
}

function fmtMin(m: number): string {
  if (m <= 0) return '0 min'
  if (m < 1) return '<1 min'
  return `${Math.round(m)} min`
}

function clinicalSummary(
  a: ZoneAnalysis,
  durationMinutes: number | null,
  adequatePct: number | null,
): string {
  const head = [
    durationMinutes != null ? `Jornada de ${formatHoursMinutes(durationMinutes)}.` : null,
    adequatePct != null ? `Postura adecuada ${Math.round(adequatePct)}%.` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const dev = ZONE_ORDER.map((z) => ({ z, d: a.zones[z] }))
    .filter(({ d }) => d.deviated_pct >= 5)
    .sort((x, y) => y.d.deviated_pct - x.d.deviated_pct)

  if (dev.length === 0) {
    return `${head} Ninguna zona superó el umbral de ${a.threshold_degrees}° de forma sostenida; la columna se mantuvo en rango durante la sesión.`
  }

  const parts = dev.map(({ z, d }, i) => {
    const name = ZONE_LABELS[z].toLowerCase()
    if (i === 0) {
      return `La zona ${name} concentró la mayor carga: ${Math.round(d.deviated_pct)}% del tiempo en desviación (${fmtMin(d.minutes_in_deviation)} acumulados), con un episodio sostenido de hasta ${fmtMin(d.longest_streak_min)} y ${Math.round(d.avg_angle_deg)}° de inclinación promedio.`
    }
    return `La ${name} registró ${Math.round(d.deviated_pct)}% (${fmtMin(d.minutes_in_deviation)}).`
  })
  return `${head} ${parts.join(' ')}`
}

interface ZoneReportProps {
  sessionId: string
  durationMinutes: number | null
  adequatePct: number | null
}

/**
 * Mapa corporal + detalle clínico por zona (ADR-006). Consume el análisis
 * geométrico del backend (ángulo de cada sensor vs. su neutro de calibración),
 * no la clase del modelo.
 */
function ZoneReport({ sessionId, durationMinutes, adequatePct }: ZoneReportProps) {
  const { data, isLoading, isError } = useZoneAnalysis(sessionId)

  if (isLoading) {
    return (
      <section className="mb-7 grid gap-4 lg:grid-cols-[300px_1fr]">
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
    ? 'El chaleco no estaba calibrado en esta sesión, así que no se puede medir el ángulo por zona. Calíbralo para habilitar este análisis.'
    : data.total_readings === 0
      ? 'No hay lecturas suficientes en esta sesión para el análisis por zona.'
      : null

  if (note) {
    return (
      <section className="editorial-card mb-7 bg-cream-deep p-6">
        <p className="label-mono">Mapa postural por zona</p>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{note}</p>
      </section>
    )
  }

  return (
    <section className="mb-7 grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="editorial-card flex flex-col bg-cream-deep p-6">
        <p className="label-mono">Mapa postural</p>
        <h2 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-ink">
          Zonas con desviación
        </h2>
        <div className="mt-3 flex-1">
          <SessionBodyMap zones={data.zones} thresholdDeg={data.threshold_degrees} />
        </div>
        <p className="mt-4 border-t border-sand pt-3 text-[11px] leading-relaxed text-ink-faint">
          Ángulo de cada zona respecto a tu calibración neutra. Umbral {data.threshold_degrees}°
          (ISO 11226 / RULA); el color crece con el % de tiempo desviado.
        </p>
      </div>

      <div className="editorial-card p-6">
        <p className="label-mono">Carga por zona</p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
          Detalle para seguimiento
        </h2>
        <p className="mt-3 max-w-[680px] text-[15px] leading-relaxed text-ink-soft">
          {clinicalSummary(data, durationMinutes, adequatePct)}
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
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {ZONE_LABELS[zone]}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip}`}>
            {SEV_LABEL[sev]}
          </span>
        </div>
        <span className={`font-mono text-lg font-semibold tabular-nums ${pctTone}`}>
          {Math.round(d.deviated_pct)}%
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <ZoneMetric label="Tiempo desviado" value={fmtMin(d.minutes_in_deviation)} />
        <ZoneMetric label="Racha máx." value={fmtMin(d.longest_streak_min)} />
        <ZoneMetric label="Episodios" value={String(d.episodes)} />
        <ZoneMetric
          label="Ángulo prom/pico"
          value={`${Math.round(d.avg_angle_deg)}° / ${Math.round(d.peak_angle_deg)}°`}
        />
      </dl>
    </li>
  )
}

function ZoneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-medium tabular-nums text-ink">{value}</dd>
    </div>
  )
}

interface StatsRowProps {
  stats: DerivedStats
  effective: EffectiveSession
}

function StatsRow({ stats, effective }: StatsRowProps) {
  const { summary, dominant } = effective
  const dominantCount = dominant && summary?.counts_by_class[dominant] ? summary.counts_by_class[dominant] : null
  const dominantPct =
    dominantCount !== null && summary?.valid_readings
      ? Math.round((dominantCount / summary.valid_readings) * 100)
      : null

  return (
    <div className="mb-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Postura adecuada"
        value={summary ? `${Math.round(summary.adequate_percentage)}%` : '—'}
        meta={summary ? `${summary.valid_readings.toLocaleString('es-PE')} lecturas válidas` : ''}
        variant="dark"
      />
      <StatCard
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
        title="Pausas detectadas"
        value={stats.pauseEstimate.toString()}
        meta={
          stats.pauseAvgMinutes !== null
            ? `prom. ${stats.pauseAvgMinutes} min`
            : 'sin pausas detectadas'
        }
      />
      <StatCard
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
  title: string
  value: string
  meta: string
  variant?: 'default' | 'dark' | 'alert'
  valueSize?: 'lg' | 'md'
}

function StatCard({ title, value, meta, variant = 'default', valueSize = 'lg' }: StatCardProps) {
  const styles: Record<NonNullable<StatCardProps['variant']>, string> = {
    default: 'border-sand bg-cream-bone text-ink',
    dark: 'border-moss-deep bg-moss text-cream-bone',
    alert: 'border-terracotta-deep bg-terracotta text-cream-bone',
  }
  const metaStyle: Record<NonNullable<StatCardProps['variant']>, string> = {
    default: 'text-ink-soft',
    dark: 'text-cream-bone/70',
    alert: 'text-cream-bone/70',
  }
  const titleStyle: Record<NonNullable<StatCardProps['variant']>, string> = {
    default: 'text-ink-soft',
    dark: 'text-cream-bone/80',
    alert: 'text-cream-bone/80',
  }

  return (
    <div className={`rounded-xl border p-5 ${styles[variant]}`}>
      <p className={`mb-3 text-[12px] font-medium ${titleStyle[variant]}`}>{title}</p>
      <p
        className={`font-semibold leading-none tracking-tight ${
          valueSize === 'lg' ? 'font-mono tabular-nums text-[40px]' : 'text-[24px]'
        }`}
      >
        {value}
      </p>
      <p className={`mt-3 text-[13px] ${metaStyle[variant]}`}>{meta}</p>
    </div>
  )
}

interface DetailGridProps {
  session: PostureSession
  readingsQuery: ReturnType<typeof useSessionReadings>
  effective: EffectiveSession
}

function DetailGrid({ session, readingsQuery, effective }: DetailGridProps) {
  const { summary, readingCount } = effective

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-xl border border-sand bg-cream-bone p-7">
        <div className="mb-5 border-b border-sand pb-4">
          <p className="label-mono mb-1.5">Línea de tiempo de la sesión</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
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
        <p className="label-mono">Distribución</p>
        <h3 className="mb-6 mt-1.5 text-xl font-semibold leading-tight tracking-tight text-ink">
          Cómo se repartieron tus{' '}
          {summary?.valid_readings
            ? summary.valid_readings.toLocaleString('es-PE')
            : readingCount.toLocaleString('es-PE')}{' '}
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
                      <span className="text-[15px] font-medium text-ink">
                        {POSTURE_LABELS[cls] ?? cls}
                      </span>
                      <span
                        className={`font-mono text-lg font-semibold tabular-nums ${cls === 'adequate' ? 'text-ink' : 'text-terracotta-deep'}`}
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
                    <p className="mt-1 text-[12px] text-ink-faint">
                      {count.toLocaleString('es-PE')} lecturas
                    </p>
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
          <p className="label-mono">Recomendaciones disparadas en esta sesión</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            Qué activó tu columna.
          </h2>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-[14px] text-ink-soft">
            Sin recomendaciones específicas para el patrón postural de esta sesión.
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
                  <p className="text-[15px] font-medium text-ink">{r.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                    {r.description}
                  </p>
                </div>
                {dominant && (
                  <span className="whitespace-nowrap rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-[11px] font-medium text-terracotta-deep">
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
