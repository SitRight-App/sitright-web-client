// src/features/session-history/lib/sessionCopy.ts
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
