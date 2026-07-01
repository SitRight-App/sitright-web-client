import { describe, expect, it } from 'vitest'
import { buildTrend } from './sessionTrend'
import type { PostureSession } from '../types/session'

const s = (id: string, at: string, pct: number): PostureSession =>
  ({
    id, user_id: 'u', vest_device_id: 'v', started_at: at, ended_at: at, status: 'closed',
    reading_count: 100, note: null, duration_minutes: 10,
    summary: { total_readings: 100, valid_readings: 100, adequate_percentage: pct, dominant_deviation: null, total_minutes: 10, counts_by_class: {} },
  }) as PostureSession

describe('buildTrend', () => {
  it('ordena, calcula delta y currentIndex', () => {
    const sessions = [s('a', '2026-06-20', 60), s('b', '2026-06-21', 75)]
    const r = buildTrend(sessions, { id: 'b', startedAt: '2026-06-21', adequatePct: 75, dominant: null })
    expect(r.points.map((p) => p.id)).toEqual(['a', 'b'])
    expect(r.currentIndex).toBe(1)
    expect(r.delta).toBe(15)
  })
  it('inyecta la sesión actual si falta', () => {
    const sessions = [s('a', '2026-06-20', 60)]
    const r = buildTrend(sessions, { id: 'x', startedAt: '2026-06-22', adequatePct: 80, dominant: null })
    expect(r.points.map((p) => p.id)).toEqual(['a', 'x'])
    expect(r.delta).toBe(20)
  })
  it('delta null con una sola sesión', () => {
    const r = buildTrend([], { id: 'x', startedAt: '2026-06-22', adequatePct: 80, dominant: null })
    expect(r.points).toHaveLength(1)
    expect(r.delta).toBeNull()
  })
})
