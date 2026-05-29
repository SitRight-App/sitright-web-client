import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/ui/toast'
import {
  getAllRecommendations,
  getAppliedRecommendations,
  getRecommendationsByClass,
  markRecommendationApplied,
  unmarkRecommendationApplied,
} from '../services/recommendationsService'

const APPLIED_KEY = ['recommendations', 'applied'] as const

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

export function useAppliedRecommendations() {
  return useQuery({
    queryKey: APPLIED_KEY,
    queryFn: getAppliedRecommendations,
    staleTime: 30_000,
  })
}

export function useMarkRecommendationApplied() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: markRecommendationApplied,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPLIED_KEY })
      toast.success('Marcada como aplicada hoy.')
    },
    onError: (err) => {
      toast.error(
        'No se pudo marcar la recomendación.',
        err instanceof Error ? err.message : undefined,
      )
    },
  })
}

export function useUnmarkRecommendationApplied() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: unmarkRecommendationApplied,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPLIED_KEY })
      toast.info('Recomendación desmarcada.')
    },
    onError: (err) => {
      toast.error(
        'No se pudo desmarcar la recomendación.',
        err instanceof Error ? err.message : undefined,
      )
    },
  })
}
