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

export type SpineZone = 'cervical' | 'dorsal' | 'lumbar'

/** Desviación de una zona durante la sesión (ADR-006), medida por ángulo. */
export interface ZoneDeviation {
  deviated_pct: number
  minutes_in_deviation: number
  avg_angle_deg: number
  peak_angle_deg: number
  longest_streak_min: number
  episodes: number
}

export interface ZoneAnalysis {
  /** false si el chaleco no está calibrado: no hay neutro para medir ángulo. */
  calibrated: boolean
  threshold_degrees: number
  total_readings: number
  zones: Record<SpineZone, ZoneDeviation>
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
