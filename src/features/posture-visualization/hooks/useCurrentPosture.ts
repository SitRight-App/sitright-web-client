import { useQuery } from '@tanstack/react-query'
import { getLatestReading } from '../services/postureService'

export function useCurrentPosture() {
  return useQuery({
    queryKey: ['posture', 'latest'],
    queryFn: getLatestReading,
    refetchInterval: 5000,
    staleTime: 4000,
  })
}
