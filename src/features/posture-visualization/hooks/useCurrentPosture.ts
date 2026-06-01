import { useQuery } from '@tanstack/react-query'
import { getLatestReading } from '../services/postureService'

interface Options {
  enabled?: boolean
}

export function useCurrentPosture(options: Options = {}) {
  return useQuery({
    queryKey: ['posture', 'latest'],
    queryFn: getLatestReading,
    refetchInterval: 5000,
    staleTime: 4000,
    enabled: options.enabled ?? true,
  })
}
