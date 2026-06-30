// src/features/session-history/components/ZoneDetailList.test.tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ZoneDetailList } from './ZoneDetailList'
import type { ZoneDeviation } from '../types/session'

const z = (deviated_pct: number, avg = 18, streak = 2): ZoneDeviation => ({
  deviated_pct,
  minutes_in_deviation: 5,
  avg_angle_deg: avg,
  peak_angle_deg: avg + 8,
  longest_streak_min: streak,
  episodes: 3,
})

describe('ZoneDetailList', () => {
  it('usa el glosario (sin "tramo máximo") y ordena peor primero', () => {
    render(<ZoneDetailList zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }} />)
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Cuello')).toBeTruthy()
    expect(screen.getByText(/Lo más que estuvo inclinada de corrido/)).toBeTruthy()
    expect(screen.queryByText(/tramo máximo/i)).toBeNull()
  })
  it('marca zonas en rango', () => {
    render(<ZoneDetailList zones={{ cervical: z(2, 0), dorsal: z(1, 0), lumbar: z(0, 0) }} />)
    expect(screen.getAllByText(/En rango/).length).toBeGreaterThan(0)
  })
})
