/**
 * HU-07 — Indicador de estado del chaleco
 *   Happy  : lectura reciente + batería OK → 'connected'
 *   Happy  : lectura reciente + batería < 10% → 'battery_low'
 *   Unhappy: última lectura > 30s → 'disconnected'
 *   Unhappy: sin lectura (null) → 'disconnected'
 */
import { describe, expect, it } from 'vitest'
import { useVestStatus } from './useVestStatus'
import type { LatestReading } from '../types/posture'

function makeReading(overrides: Partial<LatestReading> = {}): LatestReading {
  return {
    id: '1',
    vest_id: 'vest-001',
    posture_class: 'adequate',
    confidence: 0.95,
    timestamp: new Date().toISOString(),
    battery_percent: 85,
    ...overrides,
  }
}

describe('useVestStatus — HU-07', () => {
  // Happy: transmitiendo y batería OK
  it('retorna connected cuando hay lectura reciente y batería OK', () => {
    expect(useVestStatus(makeReading())).toBe('connected')
  })

  // Happy: batería baja — mostrar advertencia
  it('retorna battery_low cuando battery_percent < 10', () => {
    expect(useVestStatus(makeReading({ battery_percent: 5 }))).toBe('battery_low')
  })

  // Unhappy: último dato tiene más de 30 segundos → desconectado
  it('retorna disconnected cuando la última lectura tiene más de 30s', () => {
    const staleTimestamp = new Date(Date.now() - 35_000).toISOString()
    expect(useVestStatus(makeReading({ timestamp: staleTimestamp }))).toBe('disconnected')
  })

  // Unhappy: sin lecturas previas
  it('retorna disconnected cuando reading es null', () => {
    expect(useVestStatus(null)).toBe('disconnected')
  })

  // Loading state
  it('retorna loading cuando reading es undefined', () => {
    expect(useVestStatus(undefined)).toBe('loading')
  })
})
