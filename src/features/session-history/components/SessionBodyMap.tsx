import { SeatedFigure, type FigureTone, type SeatedFigureZone } from '@/shared/ui/SeatedFigure'
import type { SpineZone, ZoneDeviation } from '../types/session'

interface Props {
  zones: Record<SpineZone, ZoneDeviation>
  thresholdDeg: number
  /** Muestra el % junto a cada nodo. Se desactiva cuando los datos se anotan
   *  aparte (avatar con anotaciones al lado). */
  showCallouts?: boolean
  className?: string
}

// Bandas de color por % de tiempo desviado (presentación, no cutoff clínico).
function toneFor(pct: number): FigureTone {
  if (pct < 5) return 'ok'
  if (pct < 25) return 'leve'
  return 'marcada'
}

function zoneProp(d: ZoneDeviation, showCallouts: boolean): SeatedFigureZone {
  const tone = toneFor(d.deviated_pct)
  return {
    tone,
    callout: showCallouts && tone !== 'ok' ? [`${Math.round(d.deviated_pct)}%`] : undefined,
  }
}

/**
 * Mapa corporal del reporte de sesión: figura humana sentada con la carga
 * agregada de cada zona (% de tiempo desviado → color e indicador).
 * La cabeza se inclina solo si la cervical estuvo realmente desviada. (ADR-006)
 */
export function SessionBodyMap({ zones, showCallouts = true, className }: Props) {
  // Inclina la cabeza solo cuando la cervical está desviada (si está "en rango",
  // una cabeza torcida contradiría el estado).
  const headTilt =
    toneFor(zones.cervical.deviated_pct) === 'ok'
      ? 0
      : Math.min(zones.cervical.avg_angle_deg, 32)
  return (
    <SeatedFigure
      className={className ?? 'mx-auto w-full max-w-[360px]'}
      tight={!showCallouts}
      headTilt={headTilt}
      cervical={zoneProp(zones.cervical, showCallouts)}
      dorsal={zoneProp(zones.dorsal, showCallouts)}
      lumbar={zoneProp(zones.lumbar, showCallouts)}
    />
  )
}
