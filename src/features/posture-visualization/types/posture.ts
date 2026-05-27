export type PostureClass =
  | 'adequate'
  | 'forward_slouch'
  | 'excessive_recline'
  | 'indeterminate'

export interface LatestReading {
  id: string
  vest_id: string
  posture_class: PostureClass
  confidence: number
  timestamp: string
  battery_percent: number
}

export const POSTURE_LABELS: Record<PostureClass, string> = {
  adequate: 'Postura adecuada',
  forward_slouch: 'Inclinación frontal',
  excessive_recline: 'Reclinación excesiva',
  indeterminate: 'Sin datos',
}

export const POSTURE_HEADLINES: Record<PostureClass, string> = {
  adequate: 'Columna en línea.',
  forward_slouch: 'Inclinación frontal leve.',
  excessive_recline: 'Reclinación excesiva.',
  indeterminate: 'Aún sin lectura.',
}

export const POSTURE_BG: Record<PostureClass, string> = {
  adequate: 'bg-moss',
  forward_slouch: 'bg-terracotta',
  excessive_recline: 'bg-terracotta-deep',
  indeterminate: 'bg-ink-faint',
}

export const POSTURE_TEXT: Record<PostureClass, string> = {
  adequate: 'text-moss',
  forward_slouch: 'text-terracotta-deep',
  excessive_recline: 'text-terracotta-deep',
  indeterminate: 'text-ink-faint',
}

export function isDeviation(cls: PostureClass): boolean {
  return cls === 'forward_slouch' || cls === 'excessive_recline'
}
