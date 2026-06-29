// src/features/session-history/lib/sessionPdf.ts
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'

export function buildFindings(zones: Record<SpineZone, ZoneDeviation>): {
  good: string[]
  improve: string[]
} {
  const good: string[] = []
  const improve: string[] = []
  for (const z of ZONE_ORDER) {
    const d = zones[z]
    if (toneFor(d.deviated_pct) === 'ok') {
      good.push(`${ZONE_LABELS[z]}: se mantuvo en rango durante la sesión.`)
    } else {
      improve.push(
        `${ZONE_LABELS[z]}: desviada el ${Math.round(d.deviated_pct)}% del tiempo (≈${Math.round(d.avg_angle_deg)}°).`,
      )
    }
  }
  return { good, improve }
}

export function buildZoneTableRows(zones: Record<SpineZone, ZoneDeviation>): string[][] {
  return ZONE_ORDER.map((z) => {
    const d = zones[z]
    return [
      ZONE_LABELS[z],
      `${Math.round(d.deviated_pct)}%`,
      `${Math.round(d.avg_angle_deg)}°`,
      `${Math.round(d.peak_angle_deg)}°`,
      String(d.episodes),
    ]
  })
}

const RECS: Record<string, string[]> = {
  forward_slouch: [
    'Coloca la pantalla a la altura de los ojos para no inclinar el cuello.',
    'Apoya la zona lumbar en el respaldo y evita encorvarte hacia el escritorio.',
    'Haz pausas activas con estiramientos de cuello cada 45 minutos.',
  ],
  excessive_recline: [
    'Ajusta el respaldo para que el tronco quede casi vertical.',
    'Mantén los pies apoyados en el suelo y la cadera al fondo del asiento.',
    'Evita deslizarte hacia adelante en la silla.',
  ],
}

export function recommendationsFor(dominant: string | null): string[] {
  return (
    RECS[dominant ?? ''] ?? [
      'Mantén la pantalla a la altura de los ojos y la espalda apoyada en el respaldo.',
      'Haz pausas activas cada 45–60 minutos.',
    ]
  )
}
