import { describe, expect, it } from 'vitest'
import { parseServerDate } from './parseServerDate'

const UTC = Date.UTC(2026, 6, 4, 20, 30, 0) // 2026-07-04 20:30:00 UTC

describe('parseServerDate', () => {
  it('trata una marca sin zona como UTC (no como hora local)', () => {
    expect(parseServerDate('2026-07-04T20:30:00').getTime()).toBe(UTC)
  })

  it('respeta una marca que ya trae Z', () => {
    expect(parseServerDate('2026-07-04T20:30:00Z').getTime()).toBe(UTC)
  })

  it('respeta un desplazamiento explícito', () => {
    expect(parseServerDate('2026-07-04T15:30:00-05:00').getTime()).toBe(UTC)
  })

  it('maneja los microsegundos del isoformat de Python', () => {
    expect(parseServerDate('2026-07-04T20:30:00.123456').getTime()).toBe(UTC + 123)
  })
})
