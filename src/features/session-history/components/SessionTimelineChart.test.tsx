// src/features/session-history/components/SessionTimelineChart.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SessionTimelineChart } from './SessionTimelineChart'
import type { PostureClass, TimelineReading } from '@/features/posture-visualization/types/posture'

const BASE = new Date('2026-06-30T09:00:00.000Z').getTime()
const MINUTE = 60_000

/** Genera una lectura por minuto (postura alterna para tener variedad de bloques). */
function makeReadings(count: number, kindAt: (i: number) => PostureClass = () => 'adequate'): TimelineReading[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r-${i}`,
    posture_class: kindAt(i),
    confidence: 0.9,
    timestamp: new Date(BASE + i * MINUTE).toISOString(),
  }))
}

describe('SessionTimelineChart — zoom (US010)', () => {
  it('sin zoom activo muestra la sesión completa y no el aviso de sesión corta si supera 30 min', () => {
    render(
      <SessionTimelineChart readings={makeReadings(40)} isLoading={false} isError={false} />,
    )
    expect(screen.queryByText(/Sesión corta/)).toBeNull()
    // Los controles de zoom deben existir para una sesión de 40 min (tercios).
    expect(screen.getByRole('group', { name: 'Zoom de la línea de tiempo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver todo' })).toBeTruthy()
  })

  it('activar un tramo reduce la ventana visible y lo refleja en el texto', () => {
    render(
      <SessionTimelineChart readings={makeReadings(30)} isLoading={false} isError={false} />,
    )
    // Sesión de 30 min < 60 min: se ofrecen tercios.
    const firstThird = screen.getByRole('button', { name: 'Inicio de la sesión' })
    fireEvent.click(firstThird)

    expect(firstThird).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Ver todo' })).toHaveAttribute('aria-pressed', 'false')
    // El resumen indica que se muestran menos minutos que el total registrado.
    expect(screen.getByText(/Mostrando 10 de 30 min/)).toBeTruthy()
  })

  it('"Ver todo" restaura la vista completa tras hacer zoom', () => {
    render(
      <SessionTimelineChart readings={makeReadings(30)} isLoading={false} isError={false} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tramo medio' }))
    expect(screen.getByText(/Mostrando 10 de 30 min/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ver todo' }))
    expect(screen.queryByText(/Mostrando/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Ver todo' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sesiones de una hora o más ofrecen franjas por hora de reloj', () => {
    render(
      <SessionTimelineChart readings={makeReadings(90)} isLoading={false} isError={false} />,
    )
    // 09:00–10:00, 10:00–11:00 (por hora de reloj UTC del timestamp base).
    const hourButtons = screen.getAllByRole('button').filter((b) => /–/.test(b.textContent ?? ''))
    expect(hourButtons.length).toBeGreaterThanOrEqual(2)

    fireEvent.click(hourButtons[0])
    expect(screen.getByText(/Mostrando \d+ de 90 min/)).toBeTruthy()
  })

  it('no ofrece controles de zoom cuando la sesión es demasiado breve para trocear', () => {
    render(
      <SessionTimelineChart readings={makeReadings(2)} isLoading={false} isError={false} />,
    )
    expect(screen.queryByRole('group', { name: 'Zoom de la línea de tiempo' })).toBeNull()
  })

  it('mantiene el aviso de sesión corta (<30 min) con el zoom disponible', () => {
    render(
      <SessionTimelineChart readings={makeReadings(15)} isLoading={false} isError={false} />,
    )
    expect(screen.getByText(/Sesión corta/)).toBeTruthy()
  })
})
