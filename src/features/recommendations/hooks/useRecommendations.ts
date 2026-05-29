import { useQuery } from '@tanstack/react-query'
import {
  getAllRecommendations,
  getRecommendationsByClass,
} from '../services/recommendationsService'

export function useRecommendations(postureClass: string | undefined) {
  return useQuery({
    queryKey: ['recommendations', postureClass],
    queryFn: () => getRecommendationsByClass(postureClass!),
    enabled: !!postureClass,
    staleTime: 60_000,
  })
}

export function useAllRecommendations() {
  return useQuery({
    queryKey: ['recommendations', 'all'],
    queryFn: getAllRecommendations,
    staleTime: 5 * 60_000,
  })
}
