import type { RecommendationCatalogEntry } from '../types/recommendation'

interface Props {
  icon: RecommendationCatalogEntry['icon']
  size?: number
}

/**
 * Iconos SVG para cada recomendación del catálogo. Mantenidos como un solo
 * componente para que la paleta y el grosor de trazo se actualicen de forma
 * consistente. Si la paleta cambia, los colores `stroke` siguen las variables
 * CSS via `currentColor`.
 */
export function RecommendationIcon({ icon, size = 40 }: Props) {
  switch (icon) {
    case 'lumbar-slouch':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <rect x="14" y="6" width="12" height="6" rx="1.5" />
          <line x1="20" y1="12" x2="20" y2="34" strokeDasharray="2 2" />
          <circle cx="20" cy="18" r="3" fill="currentColor" />
          <circle cx="20" cy="26" r="3" className="text-terracotta" fill="currentColor" stroke="none" />
          <path d="M14 32h12" />
        </svg>
      )
    case 'cervical-retract':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="20" cy="14" r="6" />
          <path d="M14 22h12M14 26h12" />
          <line x1="14" y1="22" x2="13" y2="34" />
          <line x1="26" y1="22" x2="27" y2="34" />
        </svg>
      )
    case 'monitor':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <rect x="6" y="14" width="28" height="20" rx="2" />
          <line x1="20" y1="14" x2="20" y2="34" />
          <line x1="13" y1="6" x2="13" y2="14" />
          <line x1="27" y1="6" x2="27" y2="14" />
        </svg>
      )
    case 'pause':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="20" cy="20" r="14" />
          <path d="M14 20l4 4 8-8" strokeWidth={2} />
        </svg>
      )
    case 'lumbar-cushion':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <path d="M8 28c0-8 5-14 12-14s12 6 12 14" />
          <circle cx="14" cy="22" r="2" />
          <circle cx="26" cy="22" r="2" />
        </svg>
      )
    case 'cervical-rotate':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="20" cy="12" r="5" />
          <line x1="20" y1="17" x2="20" y2="34" />
          <path d="M12 22l8-2 8 2" />
          <path d="M14 28l6-2 6 2" />
        </svg>
      )
    case 'foot-support':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <path d="M8 32h24" />
          <path d="M14 32V18l6-4 6 4v14" />
          <line x1="20" y1="14" x2="20" y2="32" />
        </svg>
      )
    case 'pelvis-neutral':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <line x1="10" y1="20" x2="30" y2="20" />
          <line x1="14" y1="14" x2="14" y2="34" />
          <line x1="26" y1="14" x2="26" y2="34" />
          <circle cx="20" cy="20" r="3" className="text-terracotta" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'hydration':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="20" cy="20" r="12" />
          <line x1="20" y1="14" x2="20" y2="20" />
          <line x1="20" y1="20" x2="25" y2="22" />
        </svg>
      )
  }
}
