import type { ReactNode } from 'react'

export type EyebrowTone = 'moss' | 'terracotta' | 'amber' | 'neutral'

const TONES: Record<EyebrowTone, { bar: string; text: string }> = {
  moss: { bar: 'bg-moss', text: 'text-moss' },
  terracotta: { bar: 'bg-terracotta', text: 'text-terracotta-deep' },
  amber: { bar: 'bg-amber', text: 'text-amber' },
  neutral: { bar: 'bg-ink-faint', text: 'text-ink-soft' },
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
