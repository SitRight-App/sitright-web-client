import { apiFetch } from '@/shared/api/client'
import type {
  CalibrateVestRequest,
  LinkVestRequest,
  LinkVestResponse,
  VestDevice,
} from '../types/vest'

export async function getMyVest(): Promise<VestDevice | null> {
  try {
    return await apiFetch<VestDevice>('/vests/me')
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}

export async function linkVest(body: LinkVestRequest): Promise<LinkVestResponse> {
  return apiFetch<LinkVestResponse>('/vests/link', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function calibrateVest(
  vestId: string,
  body: CalibrateVestRequest,
): Promise<VestDevice> {
  return apiFetch<VestDevice>(`/vests/${vestId}/calibrate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function unlinkVest(vestId: string): Promise<VestDevice> {
  return apiFetch<VestDevice>(`/vests/${vestId}/unlink`, {
    method: 'POST',
  })
}
