/**
 * HU-20 AC2 — con menos de 3 días de uso registrados en la semana, la página
 * muestra SOLO el mensaje de datos insuficientes (sin gráfico ni tendencia).
 * Con 3 días o más, se muestra el gráfico completo.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WeeklyEvolutionPage } from './WeeklyEvolutionPage'
import type { PostureSession } from '../types/session'

const mockUseSessions = vi.fn()
vi.mock('../hooks/useSessions', () => ({
  useSessions: () => mockUseSessions(),
}))

function makeSession(daysAgo: number, id: string): PostureSession {
  const started = new Date()
  started.setDate(started.getDate() - daysAgo)
  started.setHours(10, 0, 0, 0)
  return {
    id,
    user_id: 'u1',
    vest_device_id: 'v1',
    started_at: started.toISOString(),
    ended_at: started.toISOString(),
    status: 'closed',
    reading_count: 20,
    note: null,
    duration_minutes: 30,
    summary: {
      total_readings: 20,
      valid_readings: 20,
      adequate_percentage: 70,
      dominant_deviation: null,
      total_minutes: 30,
      counts_by_class: {},
    },
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WeeklyEvolutionPage />
    </MemoryRouter>,
  )
}

describe('WeeklyEvolutionPage — HU-20 AC2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    mockUseSessions.mockReset()
  })

  it('con <3 días de uso muestra solo el mensaje, sin gráfico', () => {
    mockUseSessions.mockReturnValue({
      data: [makeSession(0, 's1'), makeSession(1, 's2')],
      isLoading: false,
      isError: false,
    })
    renderPage()

    expect(screen.getByText(/Se necesitan al menos 3 días de uso/)).toBeInTheDocument()
    expect(screen.queryByText('Últimos 7 días')).not.toBeInTheDocument()
  })

  it('con >=3 días de uso muestra el gráfico y no el mensaje', () => {
    mockUseSessions.mockReturnValue({
      data: [makeSession(0, 's1'), makeSession(1, 's2'), makeSession(2, 's3')],
      isLoading: false,
      isError: false,
    })
    renderPage()

    expect(screen.getByText('Últimos 7 días')).toBeInTheDocument()
    expect(screen.queryByText(/Se necesitan al menos 3 días de uso/)).not.toBeInTheDocument()
  })
})
