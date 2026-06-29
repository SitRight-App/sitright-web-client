// src/features/session-history/components/PostureComparison.tsx
import { SeatedFigure } from '@/shared/ui/SeatedFigure'
import { CARD_TONE, SectionEyebrow } from '@/shared/ui/SectionEyebrow'
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from '../lib/zoneTone'

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

  const verdict = !calibrated
    ? `Mantuviste una postura correcta el ${adequatePct}% del tiempo.`
    : anyDeviated
      ? `Mantuviste una postura correcta el ${adequatePct}% del tiempo. Tu mayor desafío fue ${ZONE_LABELS[worst.z].toLowerCase()}, con desviación el ${Math.round(worst.d.deviated_pct)}% del tiempo.`
      : `Tu postura se mantuvo adecuada la mayor parte de la sesión. Buen trabajo.`

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
              />
            </div>
            <figcaption className="mt-2">
              <span className="block text-[16px] font-semibold text-ink">Tu sesión</span>
              <span className="block text-[13px] text-ink-soft">{sessionSub}</span>
            </figcaption>
          </figure>
        </div>

        <p className="mt-6 max-w-[760px] text-[16px] leading-relaxed text-ink-soft">{verdict}</p>

        {calibrated && (
          <ul className="mt-5 space-y-2.5">
            {ordered.map(({ z, d }) => {
              const tone = toneFor(d.deviated_pct)
              const ok = tone === 'ok'
              return (
                <li
                  key={z}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${ok ? 'border-sand bg-cream-bone' : 'border-terracotta/30 bg-terracotta/[0.06]'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${ok ? 'bg-moss/12 text-moss' : 'bg-terracotta/15 text-terracotta-deep'}`}
                      aria-hidden
                    >
                      {ok ? '✓' : '!'}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[16px] font-semibold text-ink">{ZONE_LABELS[z]}</span>
                      <p className="mt-0.5 text-[13px] text-ink-soft">
                        {ok
                          ? 'Se mantuvo dentro de lo recomendado'
                          : `Se inclinó ${Math.round(d.avg_angle_deg)}° el ${Math.round(d.deviated_pct)}% del tiempo`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${ok ? 'bg-moss/12 text-moss' : 'bg-terracotta/15 text-terracotta-deep'}`}
                  >
                    {ok ? 'En rango' : 'Atención'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {!calibrated && (
          <p className="mt-4 rounded-lg border border-sand bg-cream-bone px-4 py-3 text-[14px] text-ink-soft">
            Calibra el chaleco para ver el detalle por zona de esta sesión.
          </p>
        )}

        <p className="mt-5 text-[12px] leading-relaxed text-ink-soft">
          Encorvado: espalda o cuello inclinados hacia adelante. Reclinado: tronco echado hacia
          atrás. Este resumen es un prediagnóstico orientativo y no reemplaza la evaluación de un
          profesional de salud.
        </p>
      </div>
    </section>
  )
}
