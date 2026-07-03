/**
 * HU-07 — El dashboard muestra de forma explícita el estado de conexión del
 * chaleco y, cuando la batería está baja, un aviso ámbar "conectar cargador".
 * Se reutiliza el componente VestStatusBadge en el encabezado; el estado deriva
 * de useVestStatus (real, no mockeado) según la última lectura.
 *
 *   Happy  : lectura reciente + batería OK → badge "Conectado"
 *   Unhappy: batería < 10% (umbral BATTERY_LOW_THRESHOLD) → aviso ámbar
 *   Unhappy: sin lectura → "Chaleco sin conexión"
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LatestReading } from '../types/posture'

// Estado mutable de la lectura que alimenta al dashboard en cada test.
const state = vi.hoisted(() => ({
  reading: undefined as LatestReading | null | undefined,
}))

vi.mock('@/features/iam/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Christopher Test',
      preferences: {
        email_notifications: true,
        break_reminder_minutes: 60,
        alert_threshold_minutes: 5,
      },
    },
  }),
}))
vi.mock('@/features/vest-management/hooks/useMyVest', () => ({
  useMyVest: () => ({ data: { id: 'vest-001' }, isLoading: false }),
}))
vi.mock('../hooks/useCurrentPosture', () => ({
  useCurrentPosture: () => ({ data: state.reading, isLoading: false, isError: false }),
}))
vi.mock('../hooks/useRecentReadings', () => ({
  useRecentReadings: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/shared/hooks/useActiveSession', () => ({
  useActiveSession: () => ({ data: null }),
}))
vi.mock('@/features/recommendations/hooks/useRecommendations', () => ({
  useRecommendations: () => ({ data: [] }),
}))
vi.mock('@/features/session-history/components/SessionControls', () => ({
  SessionControls: () => null,
}))
vi.mock('../services/notifyEvent', () => ({ notifyEvent: vi.fn(() => Promise.resolve()) }))
vi.mock('../lib/playAlertSound', () => ({ playAlertSound: vi.fn() }))

import { DashboardPage } from './DashboardPage'

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

describe('DashboardPage — HU-07 estado de conexión + batería baja', () => {
  // Happy: lectura reciente y batería OK → estado "Conectado".
  it('muestra "Conectado" cuando hay lectura reciente y batería OK', () => {
    state.reading = makeReading({ battery_percent: 85 })
    render(<DashboardPage />)
    expect(screen.getByText(/conectado/i)).toBeInTheDocument()
  })

  // Unhappy: batería por debajo del umbral → aviso ámbar "conectar cargador".
  it('muestra el aviso ámbar de batería baja cuando la batería está por debajo del umbral', () => {
    state.reading = makeReading({ battery_percent: 5 })
    render(<DashboardPage />)

    const aviso = screen.getByText(/batería baja, conectar cargador/i)
    expect(aviso).toBeInTheDocument()
    // El punto indicador usa el amarillo/ámbar de la paleta editorial (sand-light).
    expect(aviso.parentElement?.querySelector('.bg-sand-light')).toBeTruthy()
  })

  // Unhappy: sin lectura → "Chaleco sin conexión".
  it('muestra "Chaleco sin conexión" cuando no hay lectura', () => {
    state.reading = null
    render(<DashboardPage />)
    expect(screen.getAllByText(/chaleco sin conexión/i).length).toBeGreaterThan(0)
  })
})
