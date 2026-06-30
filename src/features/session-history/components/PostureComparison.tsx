// src/features/session-history/components/PostureComparison.tsx
import { SeatedFigure, type FigureTone } from '@/shared/ui/SeatedFigure'
import { CARD_TONE, SectionEyebrow } from '@/shared/ui/SectionEyebrow'
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_ORDER, toneFor } from '../lib/zoneTone'
import { ZoneDetailList } from './ZoneDetailList'
import { POSTURE_LEGEND, verdictSentence } from '../lib/sessionCopy'

interface PostureComparisonProps {
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
  adequatePct: number
  dominantDeviation: string | null
}

const HEAD_TILT_MAX_DEG = 32

const DOMINANT_SUB: Record<string, string> = {
  forward_slouch: 'Encorvado hacia adelante',
  excessive_recline: 'Reclinado hacia atrás',
}

function leanFor(dominant: string | null, worstTone: 'ok' | 'leve' | 'marcada'): number {
  const mag = worstTone === 'marcada' ? 16 : 12
  if (dominant === 'forward_slouch') return mag
  if (dominant === 'excessive_recline') return -mag
  return 0
}

const OK_ZONE = { tone: 'ok' as const }

export function PostureComparison({
  zones,
  calibrated,
  adequatePct,
  dominantDeviation,
}: PostureComparisonProps) {
  const ordered = ZONE_ORDER.map((z) => ({ z, d: zones[z] })).sort(
    (a, b) => b.d.deviated_pct - a.d.deviated_pct,
  )
  const worst = ordered[0]
  const anyDeviated = ordered.some(({ d }) => toneFor(d.deviated_pct) !== 'ok')
  const sectionTone = !calibrated ? 'neutral' : anyDeviated ? 'terracotta' : 'moss'

  // Figura "Tu sesión"
  const headTilt =
    calibrated && toneFor(zones.cervical.deviated_pct) !== 'ok'
      ? Math.min(zones.cervical.avg_angle_deg, HEAD_TILT_MAX_DEG)
      : 0
  const lean = calibrated ? leanFor(dominantDeviation, toneFor(worst.d.deviated_pct)) : 0

  // Marcadores de ángulo por zona: en la sesión, el ángulo real de las zonas
  // desviadas; en la referencia, las mismas zonas a 0°.
  const sessionMarkers: Partial<Record<'cervical' | 'dorsal' | 'lumbar', { deg: number; tone: FigureTone }>> = {}
  const idealMarkers: Partial<Record<'cervical' | 'dorsal' | 'lumbar', { deg: number; tone: FigureTone }>> = {}
  if (calibrated) {
    for (const { z, d } of ordered) {
      const t = toneFor(d.deviated_pct)
      if (t !== 'ok') {
        sessionMarkers[z] = { deg: Math.round(d.avg_angle_deg), tone: t }
        idealMarkers[z] = { deg: 0, tone: 'ok' }
      }
    }
  }

  const sessionSub = !calibrated
    ? 'Sin detalle por zona'
    : (DOMINANT_SUB[dominantDeviation ?? ''] ?? 'Alineada')

  const sessionZones = calibrated
    ? {
        cervical: { tone: toneFor(zones.cervical.deviated_pct) },
        dorsal: { tone: toneFor(zones.dorsal.deviated_pct) },
        lumbar: { tone: toneFor(zones.lumbar.deviated_pct) },
      }
    : { cervical: { tone: 'neutral' as const }, dorsal: { tone: 'neutral' as const }, lumbar: { tone: 'neutral' as const } }

  const verdict = verdictSentence({ adequatePct, zones, calibrated })

  return (
    <section className="mb-7">
      <div className={`rounded-xl border p-6 sm:p-7 ${CARD_TONE[sectionTone]}`}>
        <SectionEyebrow tone={sectionTone}>Postura</SectionEyebrow>
        <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
          Cómo te sentaste hoy
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-8">
          <figure className="text-center">
            <div data-pdf-figure="ideal" className="grid place-items-center">
              <SeatedFigure
                className="w-full max-w-[180px]"
                tight
                cervical={OK_ZONE}
                dorsal={OK_ZONE}
                lumbar={OK_ZONE}
                angleMarkers={idealMarkers}
              />
            </div>
            <figcaption className="mt-2">
              <span className="block text-[16px] font-semibold text-ink">Postura correcta</span>
              <span className="block text-[13px] text-ink-soft">Referencia</span>
            </figcaption>
          </figure>

          <figure className="text-center">
            <div data-pdf-figure="session" className="grid place-items-center">
              <SeatedFigure
                className="w-full max-w-[180px]"
                tight
                headTilt={headTilt}
                lean={lean}
                cervical={sessionZones.cervical}
                dorsal={sessionZones.dorsal}
                lumbar={sessionZones.lumbar}
                angleMarkers={sessionMarkers}
              />
            </div>
            <figcaption className="mt-2">
              <span className="block text-[16px] font-semibold text-ink">Tu sesión</span>
              <span className="block text-[13px] text-ink-soft">{sessionSub}</span>
            </figcaption>
          </figure>
        </div>

        <p className="mt-6 max-w-[760px] text-[16px] leading-relaxed text-ink-soft">{verdict}</p>

        {calibrated && <ZoneDetailList zones={zones} />}

        {!calibrated && (
          <p className="mt-4 rounded-lg border border-sand bg-cream-bone px-4 py-3 text-[14px] text-ink-soft">
            Calibra el chaleco para ver el detalle por zona de esta sesión.
          </p>
        )}

        <p className="mt-5 text-[12px] leading-relaxed text-ink-soft">
          Encorvado: espalda o cuello inclinados hacia adelante. Reclinado: tronco echado hacia
          atrás. {POSTURE_LEGEND} Este resumen es un prediagnóstico orientativo y no reemplaza la
          evaluación de un profesional de salud.
        </p>
      </div>
    </section>
  )
}
