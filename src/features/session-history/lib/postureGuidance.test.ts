// src/features/session-history/lib/postureGuidance.test.ts
import { describe, expect, it } from 'vitest'
import { recommendationKey, recommendationsFor } from './postureGuidance'
import type { ZoneDeviation } from '../types/session'

const zd = (deviated_pct: number): ZoneDeviation => ({
  deviated_pct, minutes_in_deviation: 5, avg_angle_deg: 18,
  peak_angle_deg: 26, longest_streak_min: 2, episodes: 3,
})

describe('recommendationsFor', () => {
  it('encorvado: monitor a la altura de los ojos y mentón; con pausas', () => {
    const r = recommendationsFor('forward_slouch')
    expect(r.tips.join(' ')).toMatch(/altura de tus ojos/i)
    expect(r.tips.join(' ')).toMatch(/mentón/i)
    expect(r.tips.join(' ')).toMatch(/30 min/)
    expect(r.sources.length).toBeGreaterThan(0)
  })
  it('reclinado: 100-110° y cadera al fondo', () => {
    const r = recommendationsFor('excessive_recline')
    expect(r.tips.join(' ')).toMatch(/100/)
    expect(r.tips.join(' ')).toMatch(/cadera al fondo/i)
    expect(r.sources.length).toBeGreaterThan(0)
  })
  it('sin desviación: guía general', () => {
    const r = recommendationsFor(null)
    expect(r.tips.length).toBeGreaterThanOrEqual(2)
    expect(r.sources.length).toBeGreaterThan(0)
  })
})

describe('recommendationKey', () => {
  it('respeta el dominante explícito', () => {
    expect(recommendationKey('forward_slouch')).toBe('forward_slouch')
    expect(recommendationKey('excessive_recline', { cervical: zd(0), dorsal: zd(0), lumbar: zd(0) })).toBe('excessive_recline')
  })
  it('infiere de la zona peor cuando no hay dominante', () => {
    expect(recommendationKey(null, { cervical: zd(40), dorsal: zd(10), lumbar: zd(0) })).toBe('forward_slouch')
    expect(recommendationKey(null, { cervical: zd(0), dorsal: zd(0), lumbar: zd(30) })).toBe('excessive_recline')
  })
  it('null si todo en rango o sin zonas', () => {
    expect(recommendationKey(null, { cervical: zd(1), dorsal: zd(0), lumbar: zd(2) })).toBeNull()
    expect(recommendationKey(null)).toBeNull()
    expect(recommendationKey('adequate')).toBeNull()
  })
})
