/**
 * HU-06 — Dashboard de postura en tiempo real
 *   Happy  : postura adecuada → indicador verde + "Postura correcta"
 *   Happy  : forward_slouch → indicador rojo + "Encorvamiento frontal"
 *   Unhappy: sin datos + cargando → "Conectando..."
 *   Unhappy: null reading (chaleco desconectado) → "Sin datos"
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostureIndicator } from './PostureIndicator'
import type { LatestReading } from '../types/posture'

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

describe('PostureIndicator — HU-06', () => {
  // Happy: postura adecuada muestra texto correcto
  it('muestra "Postura correcta" cuando la postura es adequate', () => {
    render(<PostureIndicator reading={makeReading()} isLoading={false} />)
    expect(screen.getByText(/postura correcta/i)).toBeInTheDocument()
  })

  // Happy: forward_slouch muestra tipo de desviación
  it('muestra "Encorvamiento frontal" cuando la postura es forward_slouch', () => {
    render(<PostureIndicator reading={makeReading({ posture_class: 'forward_slouch' })} isLoading={false} />)
    expect(screen.getByText(/encorvamiento frontal/i)).toBeInTheDocument()
  })

  // Happy: excessive_recline muestra tipo de desviación
  it('muestra "Reclinación excesiva" cuando la postura es excessive_recline', () => {
    render(<PostureIndicator reading={makeReading({ posture_class: 'excessive_recline' })} isLoading={false} />)
    expect(screen.getByText(/reclinación excesiva/i)).toBeInTheDocument()
  })

  // Unhappy: sin datos + cargando → texto de carga
  it('muestra "Conectando..." cuando no hay datos y está cargando', () => {
    render(<PostureIndicator reading={null} isLoading={true} />)
    expect(screen.getByText(/conectando/i)).toBeInTheDocument()
  })

  // Unhappy: null reading sin carga → estado sin datos
  it('muestra "Sin datos" cuando no hay lectura y no está cargando', () => {
    render(<PostureIndicator reading={null} isLoading={false} />)
    expect(screen.getByText(/sin datos/i)).toBeInTheDocument()
  })
})
