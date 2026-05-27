import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { calibrateVest, getMyVest, linkVest } from '../services/vestService'
import type { CalibrateVestRequest, LinkVestRequest } from '../types/vest'

export function useMyVest() {
  return useQuery({
    queryKey: ['vest', 'me'],
    queryFn: getMyVest,
  })
}

export function useLinkVest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LinkVestRequest) => linkVest(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vest', 'me'] }),
  })
}

export function useCalibrateVest(vestId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CalibrateVestRequest) => {
      if (!vestId) throw new Error('Falta vestId')
      return calibrateVest(vestId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vest', 'me'] }),
  })
}
