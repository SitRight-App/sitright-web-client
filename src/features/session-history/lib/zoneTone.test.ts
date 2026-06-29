import { describe, expect, it } from 'vitest'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from './zoneTone'

describe('toneFor', () => {
  it('mapea las bandas de presentación', () => {
    expect(toneFor(0)).toBe('ok')
    expect(toneFor(4.9)).toBe('ok')
    expect(toneFor(5)).toBe('leve')
    expect(toneFor(24)).toBe('leve')
    expect(toneFor(25)).toBe('marcada')
  })
  it('expone etiquetas y orden de zonas', () => {
    expect(ZONE_LABELS.cervical).toBe('Cuello')
    expect(ZONE_ORDER).toEqual(['cervical', 'dorsal', 'lumbar'])
  })
})
