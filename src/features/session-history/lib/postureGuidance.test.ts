// src/features/session-history/lib/postureGuidance.test.ts
import { describe, expect, it } from 'vitest'
import { recommendationsFor } from './postureGuidance'

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
