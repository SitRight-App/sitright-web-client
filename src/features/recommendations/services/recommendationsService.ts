import { apiFetch } from '@/shared/api/client'
import type { Recommendation } from '../types/recommendation'

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
