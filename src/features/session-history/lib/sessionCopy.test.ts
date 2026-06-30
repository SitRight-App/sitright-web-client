// src/features/session-history/lib/sessionCopy.test.ts
import { describe, expect, it } from 'vitest'
import { METRIC_LABELS, POSTURE_LEGEND, dominantPlain, verdictSentence } from './sessionCopy'
import type { ZoneDeviation } from '../types/session'

const zd = (deviated_pct: number, avg = 18): ZoneDeviation => ({
  deviated_pct, minutes_in_deviation: 5, avg_angle_deg: avg,
  peak_angle_deg: avg + 8, longest_streak_min: 2, episodes: 3,
})

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

describe('verdictSentence', () => {
  it('sin calibración da la frase corta', () => {
    const s = verdictSentence({ adequatePct: 80, zones: { cervical: zd(0), dorsal: zd(0), lumbar: zd(0) }, calibrated: false })
    expect(s).toBe('Mantuviste una postura correcta el 80% del tiempo.')
  })
  it('calibrado con desviación menciona la peor zona', () => {
    const s = verdictSentence({ adequatePct: 70, zones: { cervical: zd(41, 22), dorsal: zd(12), lumbar: zd(2) }, calibrated: true })
    expect(s).toMatch(/^Mantuviste una postura correcta el 70% del tiempo\./)
    expect(s).toMatch(/tu mayor desafío fue cuello, con desviación el 41% del tiempo\.$/i)
  })
  it('calibrado todo en rango da la frase positiva', () => {
    const s = verdictSentence({ adequatePct: 96, zones: { cervical: zd(1), dorsal: zd(0), lumbar: zd(0) }, calibrated: true })
    expect(s).toBe('Tu postura se mantuvo adecuada la mayor parte de la sesión. Buen trabajo.')
  })
})
