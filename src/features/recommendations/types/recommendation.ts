export type RecommendationCategory = 'lumbar' | 'cervical' | 'general'

export type RecommendationIconSlug =
  | 'lumbar-stretch'
  | 'lumbar-slouch'
  | 'cervical-retract'
  | 'monitor'
  | 'pause'
  | 'lumbar-cushion'
  | 'cervical-rotate'
  | 'foot-support'
  | 'pelvis-neutral'
  | 'hydration'
  | 'vest-check'

export interface RecommendationStep {
  body: string
  meta: string
}

/**
 * Recomendación entregada por el backend.
 *
 * Forma plana, alineada uno a uno con el `RecommendationResponse` del backend
 * (`GET /api/v1/recommendations` y `GET /api/v1/recommendations/{class}`).
 */
export interface Recommendation {
  id: string
  number: string
  title: string
  description: string
  category: RecommendationCategory
  icon: RecommendationIconSlug
  frequency_label: string
  posture_classes: string[]
  is_featured: boolean
  featured_tagline: string | null
  featured_title_emphasis: string | null
  featured_body: string | null
  steps: RecommendationStep[]
}
