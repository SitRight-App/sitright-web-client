/**
 * HU-08 — Alerta por postura inadecuada prolongada
 *   Happy  : postura corregida antes de 60 lecturas → alerta NO activa, contador reiniciado
 *   Unhappy: 60 lecturas malas consecutivas → alerta activa
 *
 * US017 — el umbral es configurable via user.preferences.alert_threshold_minutes;
 * el hook lee preferencias del usuario via useAuth, así que mockeamos el
 * contexto para controlar el umbral sin necesitar el provider real.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LatestReading } from '../types/posture'

const mockUseAuth = vi.fn()

vi.mock('@/features/iam/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useProlongedBadPosture } from './useProlongedBadPosture'

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
  beforeEach(() => {
    // Por defecto (sin preferencias) el comportamiento es el histórico: 5 min / 60 lecturas.
    mockUseAuth.mockReturnValue({ user: undefined })
  })

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
      { initialProps: { reading: undefined as LatestReading | undefined } },
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
      { initialProps: { reading: undefined as LatestReading | undefined } },
    )
    for (let i = 1; i <= 60; i++) {
      act(() => rerender({ reading: makeReading(String(i), 'excessive_recline') }))
    }
    expect(result.current.isAlertActive).toBe(true)

    act(() => result.current.dismiss())
    expect(result.current.isAlertActive).toBe(false)
  })
})

describe('useProlongedBadPosture — US017 (umbral configurable)', () => {
  // Happy: usuario configuró 10 min (120 lecturas) → no activa a las 60, sí a las 120
  it('usa el umbral configurado por el usuario en lugar del valor fijo de 60', () => {
    mockUseAuth.mockReturnValue({
      user: { preferences: { alert_threshold_minutes: 10, email_notifications: true } },
    })

    const { result, rerender } = renderHook(
      ({ reading }) => useProlongedBadPosture(reading),
      { initialProps: { reading: undefined as LatestReading | undefined } },
    )

    for (let i = 1; i <= 60; i++) {
      act(() => rerender({ reading: makeReading(String(i), 'forward_slouch') }))
    }
    expect(result.current.isAlertActive).toBe(false)

    for (let i = 61; i <= 120; i++) {
      act(() => rerender({ reading: makeReading(String(i), 'forward_slouch') }))
    }
    expect(result.current.isAlertActive).toBe(true)
  })

  // Unhappy: preferencias sin alert_threshold_minutes → cae al default de 5 min (60 lecturas)
  it('cae al default de 5 minutos (60 lecturas) si la preferencia no está definida', () => {
    mockUseAuth.mockReturnValue({
      user: { preferences: { email_notifications: true } },
    })

    const { result, rerender } = renderHook(
      ({ reading }) => useProlongedBadPosture(reading),
      { initialProps: { reading: undefined as LatestReading | undefined } },
    )

    for (let i = 1; i <= 60; i++) {
      act(() => rerender({ reading: makeReading(String(i), 'forward_slouch') }))
    }

    expect(result.current.isAlertActive).toBe(true)
  })
})
