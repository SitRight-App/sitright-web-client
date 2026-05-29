import { apiFetch } from '@/shared/api/client'
import type {
  AppliedRecommendation,
  Recommendation,
} from '../types/recommendation'

/** Recomendaciones aplicables a una clase postural específica (uso del dashboard). */
export async function getRecommendationsByClass(
  postureClass: string,
): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>(`/recommendations/${postureClass}`)
}

/** Catálogo completo de recomendaciones (uso de la página /recommendations). */
export async function getAllRecommendations(): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>('/recommendations')
}

/** Recomendaciones aplicadas por el usuario hoy. */
export async function getAppliedRecommendations(): Promise<AppliedRecommendation[]> {
  return apiFetch<AppliedRecommendation[]>('/recommendations/applied')
}

/** Marca una recomendación como aplicada hoy. */
export async function markRecommendationApplied(
  recommendationId: string,
): Promise<AppliedRecommendation> {
  return apiFetch<AppliedRecommendation>(
    `/recommendations/${recommendationId}/apply`,
    { method: 'POST' },
  )
}

/** Desmarca una recomendación previamente aplicada hoy. */
export async function unmarkRecommendationApplied(
  recommendationId: string,
): Promise<void> {
  return apiFetch<void>(`/recommendations/${recommendationId}/apply`, {
    method: 'DELETE',
  })
}
