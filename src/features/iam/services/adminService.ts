import { apiFetch } from '@/shared/api/client'
import type { AuthUser } from '../types/auth'

export interface UsersPage {
  total: number
  users: AuthUser[]
}

export async function listAllUsers(limit = 100, offset = 0): Promise<UsersPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  return apiFetch<UsersPage>(`/admin/users?${params.toString()}`)
}

export interface AdminStats {
  active_users: number
  total_users: number
  total_sessions: number
  average_adequate_percentage: number | null
}

export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/admin/stats')
}

export async function deactivateUser(userId: string): Promise<void> {
  return apiFetch<void>(`/admin/users/${userId}/deactivate`, { method: 'PATCH' })
}
