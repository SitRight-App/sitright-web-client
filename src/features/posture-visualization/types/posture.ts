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

export interface TimelineReading {
  id: string
  posture_class: PostureClass
  confidence: number
  timestamp: string
}

export const POSTURE_LABELS: Record<PostureClass, string> = {
  // HU-06 AC1: el sistema muestra el texto 'Postura correcta' para 'adequate'.
  adequate: 'Postura correcta',
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

/**
 * Frases editoriales para el dashboard ("Buen día, X. {lead} {emphasis}").
 * Separan el sujeto del énfasis para que la cursiva del cierre quede natural,
 * sin construir oraciones como "Tu columna está reclinación excesiva".
 */
export const POSTURE_DASHBOARD_PHRASE: Record<
  PostureClass,
  { lead: string; emphasis: string; warn: boolean }
> = {
  adequate: {
    lead: 'Tu columna está',
    emphasis: 'alineada.',
    warn: false,
  },
  forward_slouch: {
    lead: 'Tu columna se inclina',
    emphasis: 'hacia adelante.',
    warn: true,
  },
  excessive_recline: {
    lead: 'Tu columna está',
    emphasis: 'demasiado reclinada.',
    warn: true,
  },
  indeterminate: {
    lead: 'Aún',
    emphasis: 'no hay lecturas del chaleco.',
    warn: false,
  },
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
