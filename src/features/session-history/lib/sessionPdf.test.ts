// src/features/session-history/lib/sessionPdf.test.ts
import { describe, expect, it } from 'vitest'
import { buildFindings, buildZoneTableRows, recommendationsFor } from './sessionPdf'
import type { ZoneDeviation } from '../types/session'

const z = (deviated_pct: number, avg = 18): ZoneDeviation => ({
  deviated_pct,
  minutes_in_deviation: 5,
  avg_angle_deg: avg,
  peak_angle_deg: avg + 8,
  longest_streak_min: 2,
  episodes: 3,
})

describe('sessionPdf helpers', () => {
  it('separa hallazgos buenos y a mejorar', () => {
    const f = buildFindings({ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) })
    expect(f.improve.some((s) => s.includes('Cuello'))).toBe(true)
    expect(f.good.some((s) => s.includes('Espalda baja'))).toBe(true)
  })

  it('arma filas de tabla en orden de zonas', () => {
    const rows = buildZoneTableRows({ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) })
    expect(rows).toHaveLength(3)
    expect(rows[0][0]).toBe('Cuello')
    expect(rows[0][1]).toBe('41%')
  })

  it('da recomendaciones según la desviación dominante', () => {
    expect(recommendationsFor('forward_slouch').length).toBeGreaterThanOrEqual(2)
    expect(recommendationsFor('excessive_recline').length).toBeGreaterThanOrEqual(2)
    expect(recommendationsFor(null).length).toBeGreaterThanOrEqual(1)
  })
})
