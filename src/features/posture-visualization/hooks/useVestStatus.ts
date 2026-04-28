import type { LatestReading } from '../types/posture'

const DISCONNECTED_THRESHOLD_MS = 30_000
const BATTERY_LOW_THRESHOLD = 10

export type VestStatus = 'connected' | 'battery_low' | 'disconnected' | 'loading'

export function useVestStatus(reading: LatestReading | null | undefined): VestStatus {
  if (reading === undefined) return 'loading'
  if (!reading) return 'disconnected'

  const ageMs = Date.now() - new Date(reading.timestamp).getTime()
  if (ageMs > DISCONNECTED_THRESHOLD_MS) return 'disconnected'
  if (reading.battery_percent < BATTERY_LOW_THRESHOLD) return 'battery_low'
  return 'connected'
}
