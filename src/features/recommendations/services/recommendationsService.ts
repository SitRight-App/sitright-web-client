import { apiFetch } from '@/shared/api/client'
import type { Recommendation } from '../types/recommendation'

export async function getRecommendations(postureClass: string): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>(`/recommendations/${postureClass}`)
}
