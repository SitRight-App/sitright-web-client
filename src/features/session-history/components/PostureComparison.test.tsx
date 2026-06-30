import { render, screen } from '@testing-library/react'
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
  it('rotula la sesión y muestra el verdicto', () => {
    render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    expect(screen.getByText('Encorvado hacia adelante')).toBeTruthy()
    expect(screen.getByText('Postura correcta')).toBeTruthy()
    expect(screen.getByText(/Mantuviste una postura correcta el 70%/)).toBeTruthy()
  })
  it('dibuja el ángulo en la figura de la sesión y el detalle por zona', () => {
    const { container } = render(
      <PostureComparison
        zones={{ cervical: z(41, 22), dorsal: z(12), lumbar: z(2, 0) }}
        calibrated
        adequatePct={70}
        dominantDeviation="forward_slouch"
      />,
    )
    // hay marcadores de ángulo (en ambas figuras: 0° en referencia, real en sesión)
    expect(container.querySelectorAll('[data-angle-marker]').length).toBeGreaterThan(0)
    expect(screen.getAllByText('22°')[0]).toBeTruthy()
    expect(screen.getAllByText(/Lo más que estuvo inclinada de corrido/)[0]).toBeTruthy()
  })
  it('sin calibración omite figuras-con-ángulo y detalle', () => {
    const { container } = render(
      <PostureComparison
        zones={{ cervical: z(0, 0), dorsal: z(0, 0), lumbar: z(0, 0) }}
        calibrated={false}
        adequatePct={80}
        dominantDeviation={null}
      />,
    )
    expect(screen.getByText(/Calibra el chaleco/)).toBeTruthy()
    expect(container.querySelectorAll('[data-angle-marker]')).toHaveLength(0)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
