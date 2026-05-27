export type SessionStatus = 'active' | 'closed'

export interface SessionSummary {
  total_readings: number
  valid_readings: number
  adequate_percentage: number
  dominant_deviation: string | null
  total_minutes: number
  counts_by_class: Record<string, number>
}

export interface PostureSession {
  id: string
  user_id: string
  vest_device_id: string
  started_at: string
  ended_at: string | null
  status: SessionStatus
  reading_count: number
  note: string | null
  duration_minutes: number | null
  summary: SessionSummary | null
}

export interface StartSessionRequest {
  vest_device_id: string
  note?: string
}

export interface CloseSessionRequest {
  note?: string
}

export interface ListSessionsParams {
  limit?: number
  offset?: number
  since?: string
  until?: string
}
