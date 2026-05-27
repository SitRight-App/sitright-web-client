import { apiFetch } from '@/shared/api/client'
import type {
  CloseSessionRequest,
  ListSessionsParams,
  PostureSession,
  StartSessionRequest,
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

export async function getActiveSession(): Promise<PostureSession | null> {
  try {
    return await apiFetch<PostureSession>('/sessions/active')
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
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
