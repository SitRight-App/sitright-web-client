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

  // HU-07 AC2 — el AC pide 'Batería baja, conectar cargador' destacado en
  // tono amarillo (sand-light en la paleta editorial).
  it('muestra "Batería baja, conectar cargador" cuando status es battery_low', () => {
    render(<VestStatusBadge status="battery_low" batteryPercent={5} />)
    expect(screen.getByText(/batería baja, conectar cargador/i)).toBeInTheDocument()
  })

  // HU-06 AC3 — chaleco desconectado: texto literal 'Chaleco sin conexión'
  // y hint en el title (tooltip nativo del navegador) que sugiere verificar
  // la conexión WiFi del chaleco.
  it('muestra "Chaleco sin conexión" con tooltip de WiFi cuando status es disconnected', () => {
    render(<VestStatusBadge status="disconnected" />)
    const badge = screen.getByText(/chaleco sin conexión/i).closest('span')
    expect(badge).toBeInTheDocument()
    // El hint vive en title="...", expuesto a screen readers y al navegador.
    expect(badge?.parentElement?.getAttribute('title')).toMatch(/verifica la conexión wifi/i)
  })
})
