export interface Anthropometric {
  weight_kg: number | null
  height_cm: number | null
}

export interface Preferences {
  email_notifications: boolean
  alert_threshold_minutes: number
  break_reminder_minutes: number
  language: string
}

/**
 * HU-29 AC1 — datos extra que el panel admin necesita ver junto a la lista
 * de usuarios. Se entregan solo desde `/admin/users` (el `/users/me` del
 * usuario regular no los necesita).
 */
export interface LinkedVestSummary {
  mac_address: string | null
  is_calibrated: boolean
  linked_at: string | null
  battery_level: number | null
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'worker' | 'admin'
  is_active: boolean
  created_at: string
  anthropometric_data: Anthropometric
  preferences: Preferences
  /** ISO timestamp del inicio de la última sesión registrada (solo admin). */
  last_session_at?: string | null
  /** Resumen del chaleco vinculado a este usuario (solo admin). */
  linked_vest?: LinkedVestSummary | null
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  weight_kg?: number
  height_cm?: number
}

export interface UpdateProfileRequest {
  name?: string
  weight_kg?: number
  height_cm?: number
  email_notifications?: boolean
  alert_threshold_minutes?: number
  break_reminder_minutes?: number
  language?: string
}

export interface AppNotification {
  id: string
  type: string
  message: string
  channel: string
  sent_at: string
  is_read: boolean
}
