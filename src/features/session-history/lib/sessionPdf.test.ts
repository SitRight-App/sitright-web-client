// src/features/session-history/lib/sessionPdf.test.ts
import { describe, expect, it } from 'vitest'
import { buildDistribution, scoreLevel, toneColor } from './sessionPdf'

describe('sessionPdf helpers', () => {
  it('distribución excluye indeterminate y suma ~100', () => {
    const dist = buildDistribution({ adequate: 80, forward_slouch: 15, excessive_recline: 5, indeterminate: 50 })
    const labels = dist.map((d) => d.label)
    expect(labels).toContain('Correcta')
    expect(labels).not.toContain('Indeterminada')
    expect(Math.round(dist.reduce((a, d) => a + d.pct, 0))).toBe(100)
  })
})

describe('scoreLevel / toneColor', () => {
  it('scoreLevel mapea las bandas', () => {
    expect(scoreLevel(70)).toBe('good')
    expect(scoreLevel(69)).toBe('mid')
    expect(scoreLevel(50)).toBe('mid')
    expect(scoreLevel(49)).toBe('low')
    expect(scoreLevel(0)).toBe('low')
  })
  it('toneColor mapea a RGB', () => {
    expect(toneColor('ok')).toEqual([45, 74, 54])
    expect(toneColor('leve')).toEqual([232, 166, 133])
    expect(toneColor('marcada')).toEqual([200, 98, 60])
  })
})
