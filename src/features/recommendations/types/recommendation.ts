export type RecommendationCategory = 'lumbar' | 'cervical' | 'general'

export interface Recommendation {
  title: string
  description: string
}

export interface RecommendationCatalogEntry {
  id: string
  number: string
  category: RecommendationCategory
  title: string
  description: string
  frequencyLabel: string
  applied?: boolean
  appliedAtLabel?: string
  icon: 'lumbar-slouch' | 'cervical-retract' | 'monitor' | 'pause' | 'lumbar-cushion' | 'cervical-rotate' | 'foot-support' | 'pelvis-neutral' | 'hydration'
}

export interface FeaturedRecommendation {
  category: RecommendationCategory
  tagline: string
  title: string
  titleEmphasis: string
  body: string
  steps: Array<{ number: string; body: string; meta: string }>
}
