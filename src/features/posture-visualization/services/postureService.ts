import { apiFetch } from '@/shared/api/client'
import type { LatestReading } from '../types/posture'

export async function getLatestReading(): Promise<LatestReading | null> {
  try {
    return await apiFetch<LatestReading>('/readings/latest')
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}
