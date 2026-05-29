import { apiFetch } from '@/shared/api/client'
import type {
  AppNotification,
  AuthTokens,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
} from '../types/auth'

export async function login(body: LoginRequest): Promise<AuthTokens> {
  return apiFetch<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function register(body: RegisterRequest): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
    skipAuth: true,
  })
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/users/me')
}

export async function updateMe(body: UpdateProfileRequest): Promise<AuthUser> {
  return apiFetch<AuthUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function listMyNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>('/users/me/notifications')
}

export async function countUnreadNotifications(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>('/users/me/notifications/unread-count')
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  return apiFetch<void>(`/users/me/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}
