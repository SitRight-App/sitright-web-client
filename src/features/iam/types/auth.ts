export interface Anthropometric {
  weight_kg: number | null
  height_cm: number | null
}

export interface Preferences {
  email_notifications: boolean
  alert_threshold_minutes: number
  language: string
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
