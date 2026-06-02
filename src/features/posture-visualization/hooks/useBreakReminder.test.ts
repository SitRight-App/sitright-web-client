/**
 * HU-11 — Recordatorio de pausa activa
 *   Happy  : 720 lecturas conectado → recordatorio mostrado
 *   Unhappy: chaleco se desconecta → contador reiniciado, no aparece recordatorio falso
 *
 * El hook lee preferencias del usuario via useAuth; mockeamos el contexto
 * para devolver el valor por defecto de 60 min sin necesitar el provider.
 */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/iam/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      preferences: { break_reminder_minutes: 60, email_notifications: true },
    },
  }),
}))

import { useBreakReminder } from './useBreakReminder'
import type { LatestReading } from '../types/posture'
import type { VestStatus } from './useVestStatus'

function makeReading(id: string): LatestReading {
  return {
    id,
    vest_id: 'vest-001',
    posture_class: 'adequate',
    confidence: 0.95,
    timestamp: new Date().toISOString(),
    battery_percent: 85,
  }
}

describe('useBreakReminder — HU-11', () => {
  // Happy: 720 lecturas conectado → aparece recordatorio
  it('muestra recordatorio después de 720 lecturas conectado (60 min)', () => {
    const { result, rerender } = renderHook(
      ({ vestStatus, reading }) => useBreakReminder(vestStatus, reading),
      { initialProps: { vestStatus: 'connected' as VestStatus, reading: undefined as LatestReading | undefined } },
    )

    for (let i = 1; i <= 720; i++) {
      act(() => rerender({ vestStatus: 'connected', reading: makeReading(String(i)) }))
    }

    expect(result.current.showReminder).toBe(true)
  })

  // Unhappy: chaleco se desconecta → contador se reinicia, no aparece recordatorio
  it('reinicia el contador cuando el chaleco se desconecta', () => {
    const { result, rerender } = renderHook(
      ({ vestStatus, reading }) => useBreakReminder(vestStatus, reading),
      { initialProps: { vestStatus: 'connected' as VestStatus, reading: undefined as LatestReading | undefined } },
    )

    // 500 lecturas conectado (no llega a 720)
    for (let i = 1; i <= 500; i++) {
      act(() => rerender({ vestStatus: 'connected', reading: makeReading(String(i)) }))
    }
    // Se desconecta
    act(() => rerender({ vestStatus: 'disconnected', reading: makeReading('500') }))
    // Vuelve a conectar y hace 220 lecturas más (500 + 220 = 720, pero contador reinició)
    for (let i = 501; i <= 720; i++) {
      act(() => rerender({ vestStatus: 'connected', reading: makeReading(String(i)) }))
    }

    expect(result.current.showReminder).toBe(false)
  })

  // Happy: dismiss oculta el recordatorio
  it('dismiss desactiva el recordatorio', () => {
    const { result, rerender } = renderHook(
      ({ vestStatus, reading }) => useBreakReminder(vestStatus, reading),
      { initialProps: { vestStatus: 'connected' as VestStatus, reading: undefined as LatestReading | undefined } },
    )
    for (let i = 1; i <= 720; i++) {
      act(() => rerender({ vestStatus: 'connected', reading: makeReading(String(i)) }))
    }
    expect(result.current.showReminder).toBe(true)

    act(() => result.current.dismiss())
    expect(result.current.showReminder).toBe(false)
  })
})
