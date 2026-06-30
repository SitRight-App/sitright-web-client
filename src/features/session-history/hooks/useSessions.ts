import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/ui/toast'
import { ACTIVE_SESSION_KEY } from '@/shared/hooks/useActiveSession'
import {
  closeSession,
  getSession,
  getZoneAnalysis,
  listSessions,
  startSession,
} from '../services/sessionService'
import type { CloseSessionRequest, ListSessionsParams, StartSessionRequest } from '../types/session'

// El hook de sesión activa vive en shared/ (lo usa también el dashboard, otro
// feature). Se re-exporta aquí para los consumidores internos del feature.
export { useActiveSession } from '@/shared/hooks/useActiveSession'

const SESSIONS_KEY = ['sessions'] as const

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

export function useZoneAnalysis(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'zone-analysis'],
    queryFn: () => getZoneAnalysis(sessionId!),
    enabled: !!sessionId,
    staleTime: 60_000,
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (body: StartSessionRequest) => startSession(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_SESSION_KEY })
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      toast.success('Sesión iniciada.', 'El chaleco empieza a registrar lecturas.')
    },
    onError: (err) => {
      toast.error(
        'No se pudo iniciar la sesión.',
        err instanceof Error ? err.message : undefined,
      )
    },
  })
}

export function useCloseSession() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (args: { sessionId: string; body?: CloseSessionRequest }) =>
      closeSession(args.sessionId, args.body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVE_SESSION_KEY })
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      toast.success('Sesión cerrada.', 'Ya podés revisar el resumen en el historial.')
    },
    onError: (err) => {
      toast.error(
        'No se pudo cerrar la sesión.',
        err instanceof Error ? err.message : undefined,
      )
    },
  })
}
