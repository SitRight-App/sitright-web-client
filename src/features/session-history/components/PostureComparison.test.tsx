// src/features/session-history/components/PostureComparison.test.tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostureComparison } from './PostureComparison'
import type { ZoneDeviation } from '../types/session'

const z = (deviated_pct: number, avg = 18): ZoneDeviation => ({
  deviated_pct,
  minutes_in_deviation: 5,
  avg_angle_deg: avg,
  peak_angle_deg: avg + 8,
  longest_streak_min: 2,
  episodes: 3,
})

describe('PostureComparison', () => {
  it('rotula la sesión según la desviación dominante', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        thresholdDeg={20}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    expect(screen.getByText('Encorvado hacia adelante')).toBeTruthy()
    expect(screen.getByText('Postura correcta')).toBeTruthy()
  })

  it('ordena el checklist peor primero y marca zonas en rango', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        thresholdDeg={20}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Cuello')).toBeTruthy()
    expect(within(items[2]).getByText('Espalda baja')).toBeTruthy()
    expect(within(items[2]).getByText(/En rango/)).toBeTruthy()
  })

  it('sin calibración muestra aviso y omite el checklist', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(0, 0), dorsal: z(0, 0), lumbar: z(0, 0) }}
        thresholdDeg={20}
        calibrated={false}
        adequatePct={80}
        dominantDeviation={null}
      />,
    )
    expect(screen.getByText(/Calibra el chaleco/)).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
