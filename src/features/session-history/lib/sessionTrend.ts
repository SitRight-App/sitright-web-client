import type { PostureSession } from '../types/session'

export interface TrendPoint {
  id: string
  at: string
  pct: number
  dominant: string | null
}

export interface TrendResult {
  points: TrendPoint[]
  currentIndex: number
  delta: number | null
}

export function buildTrend(
  sessions: PostureSession[],
  current: { id: string; startedAt: string; adequatePct: number | null; dominant: string | null },
  maxPoints = 8,
): TrendResult {
  const points: TrendPoint[] = sessions
    .filter((s) => s.summary && s.summary.valid_readings > 0)
    .map((s) => ({
      id: s.id,
      at: s.started_at,
      pct: s.summary!.adequate_percentage,
      dominant: s.summary!.dominant_deviation,
    }))
  if (current.adequatePct != null && !points.some((p) => p.id === current.id)) {
    points.push({ id: current.id, at: current.startedAt, pct: current.adequatePct, dominant: current.dominant })
  }
  points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const capped = points.slice(-maxPoints)
  const idxRaw = capped.findIndex((p) => p.id === current.id)
  const currentIndex = idxRaw === -1 ? Math.max(0, capped.length - 1) : idxRaw
  const cur = capped[currentIndex]
  const prev = currentIndex > 0 ? capped[currentIndex - 1] : null
  const delta = cur && prev ? Math.round(cur.pct - prev.pct) : null
  return { points: capped, currentIndex, delta }
}
