/**
 * HU-11 / HU-12 — Recordatorio de pausa activa
 *   Happy  : 720 lecturas seguidas → recordatorio mostrado
 *   Happy  : gap < 5 min entre lecturas → NO reinicia el contador
 *   Unhappy: gap ≥ 5 min sin lecturas → pausa automática, contador reiniciado
 *
 * El hook lee preferencias del usuario via useAuth; mockeamos el contexto
 * para devolver el valor por defecto de 60 min sin necesitar el provider.
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/iam/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      preferences: { break_reminder_minutes: 60, email_notifications: true },
    },
  }),
}))

import { useBreakReminder } from './useBreakReminder'
import type { LatestReading } from '../types/posture'

function makeReading(id: string): LatestReading {
  return {
    id,
    vest_id: 'vest-001',
    posture_class: 'adequate',
    confidence: 0.95,
    // El timestamp usa el reloj actual (falso en los tests con gap) para que el
    // hook detecte la pausa automática según el tiempo desde la última lectura.
    timestamp: new Date().toISOString(),
    battery_percent: 85,
  }
}

describe('useBreakReminder — HU-11/HU-12', () => {
  // Happy: 720 lecturas seguidas → aparece recordatorio
  it('muestra recordatorio después de 720 lecturas seguidas (60 min)', () => {
    const { result, rerender } = renderHook(({ reading }) => useBreakReminder(reading), {
      initialProps: { reading: undefined as LatestReading | undefined },
    })

    for (let i = 1; i <= 720; i++) {
      act(() => rerender({ reading: makeReading(String(i)) }))
    }

    expect(result.current.showReminder).toBe(true)
  })

  // Happy: dismiss oculta el recordatorio
  it('dismiss desactiva el recordatorio', () => {
    const { result, rerender } = renderHook(({ reading }) => useBreakReminder(reading), {
      initialProps: { reading: undefined as LatestReading | undefined },
    })
    for (let i = 1; i <= 720; i++) {
      act(() => rerender({ reading: makeReading(String(i)) }))
    }
    expect(result.current.showReminder).toBe(true)

    act(() => result.current.dismiss())
    expect(result.current.showReminder).toBe(false)
  })

  // HU-12 AC2 — pausa automática basada en el tiempo desde la última lectura.
  describe('pausa automática por lapso sin lecturas', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-02T09:00:00.000Z'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    // NO reinicia si el lapso entre lecturas es menor a 5 minutos: el contador
    // sigue acumulando y llega al umbral.
    it('no reinicia el contador si el lapso es menor a 5 minutos', () => {
      const { result, rerender } = renderHook(({ reading }) => useBreakReminder(reading), {
        initialProps: { reading: undefined as LatestReading | undefined },
      })

      // 719 lecturas seguidas (contador justo por debajo del umbral de 720).
      for (let i = 1; i <= 719; i++) {
        act(() => rerender({ reading: makeReading(String(i)) }))
      }
      expect(result.current.showReminder).toBe(false)

      // Lapso de 4 min (< 5) antes de la lectura 720: no debe reiniciar, así que
      // el contador llega a 720 y dispara el recordatorio.
      act(() => vi.advanceTimersByTime(4 * 60_000))
      act(() => rerender({ reading: makeReading('720') }))

      expect(result.current.showReminder).toBe(true)
    })

    // Reinicia cuando el lapso alcanza los 5 minutos: se asume pausa activa y el
    // contador vuelve a cero, por lo que no dispara el recordatorio.
    it('reinicia el contador cuando el lapso alcanza los 5 minutos', () => {
      const { result, rerender } = renderHook(({ reading }) => useBreakReminder(reading), {
        initialProps: { reading: undefined as LatestReading | undefined },
      })

      // 719 lecturas seguidas (contador justo por debajo del umbral de 720).
      for (let i = 1; i <= 719; i++) {
        act(() => rerender({ reading: makeReading(String(i)) }))
      }
      expect(result.current.showReminder).toBe(false)

      // Lapso de 5 min (≥ 5) antes de la lectura 720: se considera pausa activa,
      // el contador se reinicia y no aparece el recordatorio.
      act(() => vi.advanceTimersByTime(5 * 60_000))
      act(() => rerender({ reading: makeReading('720') }))

      expect(result.current.showReminder).toBe(false)
    })
  })
})
