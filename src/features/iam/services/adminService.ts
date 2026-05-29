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
