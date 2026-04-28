import { useQuery } from '@tanstack/react-query'
import { getRecommendations } from '../services/recommendationsService'

export function useRecommendations(postureClass: string | undefined) {
  return useQuery({
    queryKey: ['recommendations', postureClass],
    queryFn: () => getRecommendations(postureClass!),
    enabled: !!postureClass,
    staleTime: 60_000,
  })
}
