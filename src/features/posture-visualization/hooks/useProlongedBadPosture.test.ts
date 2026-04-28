/**
 * HU-08 — Alerta por postura inadecuada prolongada
 *   Happy  : postura corregida antes de 60 lecturas → alerta NO activa, contador reiniciado
 *   Unhappy: 60 lecturas malas consecutivas → alerta activa
 */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useProlongedBadPosture } from './useProlongedBadPosture'
import type { LatestReading } from '../types/posture'

function makeReading(id: string, postureClass: string): LatestReading {
  return {
    id,
    vest_id: 'vest-001',
    posture_class: postureClass as LatestReading['posture_class'],
    confidence: 0.9,
    timestamp: new Date().toISOString(),
    battery_percent: 85,
  }
}

describe('useProlongedBadPosture — HU-08', () => {
  // Happy: usuario corrige la postura antes de 60 lecturas → no hay alerta
  it('NO activa alerta si la postura se corrige antes de 60 lecturas', () => {
    const { result, rerender } = renderHook(
      ({ reading }) => useProlongedBadPosture(reading),
      { initialProps: { reading: makeReading('1', 'forward_slouch') } },
    )

    // 10 lecturas malas
    for (let i = 2; i <= 10; i++) {
      act(() => rerender({ reading: makeReading(String(i), 'forward_slouch') }))
    }
    // Corrección
    act(() => rerender({ reading: makeReading('11', 'adequate') }))

    expect(result.current.isAlertActive).toBe(false)
  })

  // Unhappy: 60 lecturas malas consecutivas → alerta activada
  it('activa alerta después de 60 lecturas malas consecutivas', () => {
    const { result, rerender } = renderHook(
      ({ reading }) => useProlongedBadPosture(reading),
      { initialProps: { reading: undefined } },
    )

    for (let i = 1; i <= 60; i++) {
      act(() => rerender({ reading: makeReading(String(i), 'forward_slouch') }))
    }

    expect(result.current.isAlertActive).toBe(true)
  })

  // Happy: dismiss reinicia la alerta
  it('dismiss desactiva la alerta', () => {
    const { result, rerender } = renderHook(
      ({ reading }) => useProlongedBadPosture(reading),
      { initialProps: { reading: undefined } },
    )
    for (let i = 1; i <= 60; i++) {
      act(() => rerender({ reading: makeReading(String(i), 'excessive_recline') }))
    }
    expect(result.current.isAlertActive).toBe(true)

    act(() => result.current.dismiss())
    expect(result.current.isAlertActive).toBe(false)
  })
})
