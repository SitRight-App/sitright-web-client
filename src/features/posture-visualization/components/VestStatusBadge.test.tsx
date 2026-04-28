/**
 * HU-07 — Indicador de estado del chaleco
 *   Happy  : connected + 85% → muestra "Conectado" y "85%"
 *   Unhappy: battery_low → muestra advertencia de batería baja
 *   Unhappy: disconnected → muestra "Chaleco sin conexión"
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VestStatusBadge } from './VestStatusBadge'

describe('VestStatusBadge — HU-07', () => {
  // Happy: chaleco conectado con nivel de batería
  it('muestra "Conectado" y el porcentaje de batería', () => {
    render(<VestStatusBadge status="connected" batteryPercent={85} />)
    expect(screen.getByText(/conectado/i)).toBeInTheDocument()
    expect(screen.getByText(/85%/)).toBeInTheDocument()
  })

  // Unhappy: batería baja → advertencia específica
  it('muestra advertencia de batería baja cuando status es battery_low', () => {
    render(<VestStatusBadge status="battery_low" batteryPercent={5} />)
    expect(screen.getByText(/batería baja/i)).toBeInTheDocument()
    expect(screen.getByText(/cargador/i)).toBeInTheDocument()
  })

  // Unhappy: chaleco desconectado
  it('muestra "Chaleco sin conexión" cuando status es disconnected', () => {
    render(<VestStatusBadge status="disconnected" />)
    expect(screen.getByText(/chaleco sin conexión/i)).toBeInTheDocument()
  })
})
