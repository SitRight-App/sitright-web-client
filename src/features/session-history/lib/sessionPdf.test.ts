// src/features/session-history/lib/sessionPdf.test.ts
import { describe, expect, it } from 'vitest'
import { buildDistribution, scoreLevel, toneColor } from './sessionPdf'

describe('sessionPdf helpers', () => {
  it('Correcta usa el score y reparte el resto; suma 100', () => {
    const dist = buildDistribution(
      { adequate: 80, forward_slouch: 15, excessive_recline: 5, indeterminate: 50 },
      82,
    )
    expect(dist.find((d) => d.label === 'Correcta')?.pct).toBe(82)
    expect(dist.map((d) => d.label)).not.toContain('Indeterminada')
    expect(dist.reduce((a, d) => a + d.pct, 0)).toBe(100)
    // resto 18 repartido 15:5 → Encorvado 14, Reclinado 4
    expect(dist.find((d) => d.label === 'Encorvado')?.pct).toBe(14)
    expect(dist.find((d) => d.label === 'Reclinado')?.pct).toBe(4)
  })
  it('sin clases de desviación, el resto va a "Desviada"', () => {
    const dist = buildDistribution({ adequate: 5 }, 35)
    expect(dist.find((d) => d.label === 'Correcta')?.pct).toBe(35)
    expect(dist.find((d) => d.label === 'Desviada')?.pct).toBe(65)
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
