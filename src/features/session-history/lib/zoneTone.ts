import type { SpineZone } from '../types/session'

/** Banda de color por % de tiempo desviado (presentación, no cutoff clínico). */
export function toneFor(pct: number): 'ok' | 'leve' | 'marcada' {
  if (pct < 5) return 'ok'
  if (pct < 25) return 'leve'
  return 'marcada'
}

/** Nombres en lenguaje cotidiano de cada zona de la columna. */
export const ZONE_LABELS: Record<SpineZone, string> = {
  cervical: 'Cuello',
  dorsal: 'Espalda media',
  lumbar: 'Espalda baja',
}

export const ZONE_ORDER: SpineZone[] = ['cervical', 'dorsal', 'lumbar']
