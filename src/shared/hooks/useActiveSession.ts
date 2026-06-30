import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/shared/api/client'

/**
 * Sesión activa del usuario. Vive en `shared/` porque lo consumen dos features
 * distintos (el dashboard de posture-visualization y el historial de sesiones),
 * y así ninguno importa código del otro. Solo expone los campos que esos
 * consumidores necesitan.
 */
export interface ActiveSession {
  id: string
  started_at: string
  reading_count: number
}

export const ACTIVE_SESSION_KEY = ['sessions', 'active'] as const

export async function getActiveSession(): Promise<ActiveSession | null> {
  try {
    return await apiFetch<ActiveSession>('/sessions/active')
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}

export function useActiveSession() {
  return useQuery({
    queryKey: ACTIVE_SESSION_KEY,
    queryFn: getActiveSession,
    refetchInterval: 30_000,
  })
}
