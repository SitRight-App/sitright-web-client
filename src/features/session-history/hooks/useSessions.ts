import { useQuery } from '@tanstack/react-query'
import { getActiveSession, getSession, listSessions } from '../services/sessionService'
import type { ListSessionsParams } from '../types/session'

export function useSessions(params: ListSessionsParams = {}) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => listSessions(params),
  })
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,
  })
}

export function useActiveSession() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: getActiveSession,
    refetchInterval: 30_000,
  })
}
