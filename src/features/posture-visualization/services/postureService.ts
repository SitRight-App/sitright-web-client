import { apiFetch } from '@/shared/api/client'
import type { LatestReading, TimelineReading } from '../types/posture'

export async function getLatestReading(): Promise<LatestReading | null> {
  try {
    return await apiFetch<LatestReading>('/readings/latest')
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) return null
    throw err
  }
}

interface RecentReadingsOptions {
  limit?: number
  minutes?: number
  since?: string
  until?: string
}

export async function getRecentReadings(
  opts: RecentReadingsOptions = {},
): Promise<TimelineReading[]> {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.minutes) params.set('minutes', String(opts.minutes))
  if (opts.since) params.set('since', opts.since)
  if (opts.until) params.set('until', opts.until)
  const qs = params.toString()
  return apiFetch<TimelineReading[]>(`/readings/recent${qs ? `?${qs}` : ''}`)
}
