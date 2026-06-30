// src/features/session-history/lib/sessionPdf.test.ts
import { describe, expect, it } from 'vitest'
import { ZONE_TABLE_HEADERS, buildDistribution, buildZoneTableRows } from './sessionPdf'
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
  it('encabezados de tabla en lenguaje del glosario', () => {
    expect(ZONE_TABLE_HEADERS.join(' ')).not.toMatch(/% desviado|pico|episodios|tramo máximo/i)
    expect(ZONE_TABLE_HEADERS).toContain('% del tiempo inclinada')
  })
  it('arma filas de 6 columnas en orden de zonas', () => {
    const rows = buildZoneTableRows({ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) })
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveLength(6)
    expect(rows[0][0]).toBe('Cuello')
    expect(rows[0][1]).toBe('41%')
  })
  it('distribución excluye indeterminate y suma ~100', () => {
    const dist = buildDistribution({ adequate: 80, forward_slouch: 15, excessive_recline: 5, indeterminate: 50 })
    const labels = dist.map((d) => d.label)
    expect(labels).toContain('Correcta')
    expect(labels).not.toContain('Indeterminada')
    expect(Math.round(dist.reduce((a, d) => a + d.pct, 0))).toBe(100)
  })
})
