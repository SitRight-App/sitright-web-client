// src/features/session-history/lib/sessionCopy.test.ts
import { describe, expect, it } from 'vitest'
import { METRIC_LABELS, POSTURE_LEGEND, dominantPlain } from './sessionCopy'

describe('sessionCopy', () => {
  it('no usa términos prohibidos en las etiquetas', () => {
    const all = Object.values(METRIC_LABELS).join(' | ') + ' ' + POSTURE_LEGEND
    expect(all).not.toMatch(/tramo máximo|pico|episodios|% desviado|ángulo promedio/i)
  })
  it('etiquetas clave en lenguaje llano', () => {
    expect(METRIC_LABELS.longestStreak).toBe('Lo más que estuvo inclinada de corrido')
    expect(METRIC_LABELS.episodes).toBe('Veces que se desvió')
    expect(METRIC_LABELS.peakAngle).toBe('Lo más que se inclinó')
  })
  it('dominantPlain traduce a palabras', () => {
    expect(dominantPlain('forward_slouch')).toBe('Encorvado')
    expect(dominantPlain('excessive_recline')).toBe('Reclinado')
    expect(dominantPlain(null)).toBe('Ninguna')
  })
})
