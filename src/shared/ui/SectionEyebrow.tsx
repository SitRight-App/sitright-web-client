import type { ReactNode } from 'react'

export type EyebrowTone = 'moss' | 'terracotta' | 'amber' | 'neutral'

const TONES: Record<EyebrowTone, { bar: string; text: string }> = {
  moss: { bar: 'bg-moss', text: 'text-moss' },
  terracotta: { bar: 'bg-terracotta', text: 'text-terracotta-deep' },
  amber: { bar: 'bg-amber', text: 'text-amber' },
  neutral: { bar: 'bg-ink-faint', text: 'text-ink-soft' },
}

/**
 * Tinte de fondo + borde para una tarjeta de sección, a juego con el eyebrow.
 * Wash muy sutil para que el contenido (y las sub-tarjetas) sigan resaltando.
 */
export const CARD_TONE: Record<EyebrowTone, string> = {
  moss: 'border-moss/20 bg-moss/[0.045]',
  terracotta: 'border-terracotta/25 bg-terracotta/[0.05]',
  amber: 'border-amber/25 bg-amber/[0.06]',
  neutral: 'border-sand bg-cream-bone',
}

/**
 * Etiqueta de sección con una barra de color que codifica el tema/estado de la
 * sección (verde = evolución/bien, terracota = carga/desviación, ámbar = acción,
 * neutro = informativo). Reemplaza al eyebrow `label-mono` cuando se quiere dar
 * color con intención.
 */
export function SectionEyebrow({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: EyebrowTone
}) {
  const t = TONES[tone]
  return (
    <p className={`flex items-center gap-2 text-[13px] font-semibold ${t.text}`}>
      <span className={`h-3.5 w-[3px] rounded-full ${t.bar}`} />
      {children}
    </p>
  )
}
