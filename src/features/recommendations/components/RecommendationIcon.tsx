import {
  Armchair,
  Coffee,
  Droplets,
  Footprints,
  MonitorUp,
  PersonStanding,
  RotateCw,
  ShieldCheck,
  Squircle,
  type LucideIcon,
  User,
} from 'lucide-react'
import type { RecommendationIconSlug } from '../types/recommendation'

interface Props {
  icon: RecommendationIconSlug
  size?: number
}

const ICONS: Record<RecommendationIconSlug, LucideIcon> = {
  'lumbar-stretch': PersonStanding,
  'lumbar-slouch': Armchair,
  'cervical-retract': User,
  monitor: MonitorUp,
  pause: Coffee,
  'lumbar-cushion': Armchair,
  'cervical-rotate': RotateCw,
  'foot-support': Footprints,
  'pelvis-neutral': Squircle,
  hydration: Droplets,
  'vest-check': ShieldCheck,
}

/**
 * Iconos editoriales de recomendaciones, ahora basados en `lucide-react` para
 * mantener consistencia visual con el resto de la UI y evitar SVG hand-rolled.
 */
export function RecommendationIcon({ icon, size = 36 }: Props) {
  const Icon = ICONS[icon] ?? ShieldCheck
  return <Icon size={size} strokeWidth={1.5} />
}
