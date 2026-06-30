// src/features/session-history/lib/sessionCopy.ts
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'
import type { SpineZone, ZoneDeviation } from '../types/session'

export const METRIC_LABELS = {
  deviatedPct: '% del tiempo inclinada',
  minutesInDeviation: 'Tiempo inclinada en total',
  longestStreak: 'Lo más que estuvo inclinada de corrido',
  avgAngle: 'Cuánto se inclinó (promedio)',
  peakAngle: 'Lo más que se inclinó',
  episodes: 'Veces que se desvió',
  adequatePct: '% de postura correcta',
  totalMinutes: 'Tiempo de uso',
  dominant: 'Desviación más frecuente',
  pauses: 'Pausas',
} as const

export const POSTURE_LEGEND =
  "Inclinación = ángulo respecto a la posición neutra de calibración. 'De corrido' = tiempo continuo sin corregir."

export function dominantPlain(dominant: string | null): string {
  if (dominant === 'forward_slouch') return 'Encorvado'
  if (dominant === 'excessive_recline') return 'Reclinado'
  return 'Ninguna'
}

/** Tramo continuo más largo en lenguaje claro y con la concordancia correcta. */
export function streakLabel(min: number): string {
  if (min < 1) return 'menos de 1 min'
  const n = Math.round(min)
  return `hasta ${n} min ${n === 1 ? 'seguido' : 'seguidos'}`
}

export function verdictSentence(opts: {
  adequatePct: number
  zones: Record<SpineZone, ZoneDeviation>
  calibrated: boolean
}): string {
  const { adequatePct, zones, calibrated } = opts
  if (!calibrated) return `Mantuviste una postura correcta el ${adequatePct}% del tiempo.`
  const ordered = ZONE_ORDER.map((z) => ({ z, d: zones[z] })).sort(
    (a, b) => b.d.deviated_pct - a.d.deviated_pct,
  )
  const anyDeviated = ordered.some(({ d }) => toneFor(d.deviated_pct) !== 'ok')
  if (!anyDeviated) {
    return 'Tu postura se mantuvo adecuada la mayor parte de la sesión. Buen trabajo.'
  }
  const worst = ordered[0]
  return `Mantuviste una postura correcta el ${adequatePct}% del tiempo. Tu mayor desafío fue ${ZONE_LABELS[worst.z].toLowerCase()}, con desviación el ${Math.round(worst.d.deviated_pct)}% del tiempo.`
}
