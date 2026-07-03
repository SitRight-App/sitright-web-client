import { apiFetch } from '@/shared/api/client'
import type { TimelineReading } from '@/features/posture-visualization/types/posture'
import type {
  CloseSessionRequest,
  ListSessionsParams,
  PostureSession,
  StartSessionRequest,
  ZoneAnalysis,
} from '../types/session'

export async function listSessions(params: ListSessionsParams = {}): Promise<PostureSession[]> {
  const search = new URLSearchParams()
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  if (params.since) search.set('since', params.since)
  if (params.until) search.set('until', params.until)
  const qs = search.toString()
  return apiFetch<PostureSession[]>(`/sessions${qs ? `?${qs}` : ''}`)
}

export async function getSession(sessionId: string): Promise<PostureSession | null> {
  try {
    return await apiFetch<PostureSession>(`/sessions/${sessionId}`)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}

export async function getZoneAnalysis(sessionId: string): Promise<ZoneAnalysis | null> {
  try {
    return await apiFetch<ZoneAnalysis>(`/sessions/${sessionId}/zone-analysis`)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}

// Lecturas de la sesión por session_id (clave estable, sin depender de
// filtros por rango horario). Ver ADR-006.
export async function getSessionReadings(sessionId: string): Promise<TimelineReading[]> {
  return apiFetch<TimelineReading[]>(`/sessions/${sessionId}/readings`)
}

export async function startSession(body: StartSessionRequest): Promise<PostureSession> {
  return apiFetch<PostureSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function closeSession(
  sessionId: string,
  body: CloseSessionRequest = {},
): Promise<PostureSession> {
  return apiFetch<PostureSession>(`/sessions/${sessionId}/close`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
