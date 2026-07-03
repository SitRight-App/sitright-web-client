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

/** Notifica al backend del cierre de sesión. Los JWT son
 * stateless así que el backend sólo responde 204; pero llamar este endpoint
 * deja constancia en logs y permite invalidación server-side a futuro. */
export async function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiFetch<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
    skipAuth: true,
  })
}

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return apiFetch<void>('/users/me/password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
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

export async function markAllNotificationsRead(): Promise<{ marked_as_read: number }> {
  return apiFetch<{ marked_as_read: number }>(`/users/me/notifications/read-all`, {
    method: 'PATCH',
  })
}
