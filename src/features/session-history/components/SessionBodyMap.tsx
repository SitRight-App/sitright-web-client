import { SeatedFigure, type FigureTone, type SeatedFigureZone } from '@/shared/ui/SeatedFigure'
import type { SpineZone, ZoneDeviation } from '../types/session'

interface Props {
  zones: Record<SpineZone, ZoneDeviation>
  thresholdDeg: number
}

// Bandas de color por % de tiempo desviado (presentación, no cutoff clínico).
function toneFor(pct: number): FigureTone {
  if (pct < 5) return 'ok'
  if (pct < 25) return 'leve'
  return 'marcada'
}

function zoneProp(d: ZoneDeviation): SeatedFigureZone {
  const tone = toneFor(d.deviated_pct)
  return {
    tone,
    callout:
      tone === 'ok'
        ? undefined
        : [`${Math.round(d.deviated_pct)}%`, `${Math.round(d.avg_angle_deg)}°`],
  }
}

/**
 * Mapa corporal del reporte de sesión: figura humana sentada con la carga
 * agregada de cada zona (% de tiempo desviado → color; % y ángulo → callout).
 * La cabeza se inclina según la desviación cervical promedio. (ADR-006)
 */
export function SessionBodyMap({ zones }: Props) {
  return (
    <SeatedFigure
      className="mx-auto max-w-[300px]"
      headTilt={Math.min(zones.cervical.avg_angle_deg, 32)}
      cervical={zoneProp(zones.cervical)}
      dorsal={zoneProp(zones.dorsal)}
      lumbar={zoneProp(zones.lumbar)}
    />
  )
}
