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
  adequate: 'Postura correcta',
  forward_slouch: 'Encorvamiento frontal',
  excessive_recline: 'Reclinación excesiva',
  indeterminate: 'Sin datos',
}

export const POSTURE_COLORS: Record<PostureClass, string> = {
  adequate: 'bg-green-500',
  forward_slouch: 'bg-amber-500',
  excessive_recline: 'bg-red-500',
  indeterminate: 'bg-slate-400',
}

export const POSTURE_TEXT_COLORS: Record<PostureClass, string> = {
  adequate: 'text-green-600',
  forward_slouch: 'text-amber-600',
  excessive_recline: 'text-red-600',
  indeterminate: 'text-slate-500',
}

export const POSTURE_BORDER_COLORS: Record<PostureClass, string> = {
  adequate: 'border-green-500',
  forward_slouch: 'border-amber-500',
  excessive_recline: 'border-red-500',
  indeterminate: 'border-slate-400',
}
