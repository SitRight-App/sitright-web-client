// src/features/session-history/lib/postureGuidance.ts
// Recomendaciones de corrección postural basadas en guías ergonómicas/clínicas.
// Fuentes: OSHA Computer Workstations; ángulo craneovertebral (postura de cabeza);
// guías de pausas activas en sedentarismo.
import { ZONE_ORDER, toneFor } from './zoneTone'
import type { SpineZone, ZoneDeviation } from '../types/session'

export interface Guidance {
  tips: string[]
  sources: string[]
}

const PAUSA = 'Cada ~30 min, levántate y camina 1–2 min.'
const SOURCES = [
  'OSHA Computer Workstations',
  'Ángulo craneovertebral (postura de cabeza)',
  'Guías de pausas activas en sedentarismo',
]

const GUIDANCE: Record<string, string[]> = {
  forward_slouch: [
    'Sube la pantalla: el borde superior a la altura de tus ojos (o un poco más abajo), a un brazo de distancia, para no inclinar el cuello.',
    "Lleva el mentón ligeramente hacia atrás (como hacer 'papada') para alinear la cabeza con el tronco.",
    'Apoya bien la espalda en el respaldo con soporte lumbar; no te acerques al escritorio encorvándote.',
    PAUSA,
  ],
  excessive_recline: [
    'Endereza el respaldo a una ligera inclinación (100–110°); echarte más es para descansar, no para trabajar.',
    'Lleva la cadera al fondo del asiento y apoya los pies en el piso o un reposapiés; no te deslices hacia adelante.',
    'Usa el soporte lumbar para acompañar la curva de tu espalda baja.',
    PAUSA,
  ],
}

const GENERAL = [
  'Mantén la cabeza alineada con el tronco y la pantalla a la altura de los ojos.',
  'Espalda apoyada con soporte lumbar y pies planos en el piso.',
  'Cambia de postura seguido y camina unos minutos cada ~30 min.',
]

export function recommendationsFor(dominant: string | null): Guidance {
  return { tips: GUIDANCE[dominant ?? ''] ?? GENERAL, sources: SOURCES }
}

/** Clave de recomendación: dominante explícito, o inferida de la zona peor. */
export function recommendationKey(
  dominant: string | null,
  zones?: Record<SpineZone, ZoneDeviation>,
): string | null {
  if (dominant === 'forward_slouch' || dominant === 'excessive_recline') return dominant
  if (!zones) return null
  let worst: SpineZone | null = null
  let worstPct = -1
  for (const z of ZONE_ORDER) {
    const p = zones[z].deviated_pct
    if (toneFor(p) !== 'ok' && p > worstPct) { worstPct = p; worst = z }
  }
  if (!worst) return null
  return worst === 'lumbar' ? 'excessive_recline' : 'forward_slouch'
}
