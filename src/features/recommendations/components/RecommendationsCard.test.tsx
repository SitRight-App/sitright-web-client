/**
 * HU-10 — Recomendaciones según tipo de desviación
 *   Happy  : forward_slouch → muestra recomendaciones numeradas
 *   Happy  : adequate → muestra mensaje de buen desempeño
 *   Unhappy: lista vacía → no renderiza nada
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecommendationsCard } from './RecommendationsCard'
import type { Recommendation } from '../types/recommendation'

const FORWARD_SLOUCH_RECS: Recommendation[] = [
  { title: 'Ajusta la altura del monitor', description: 'Sube el monitor a la altura de los ojos.' },
  { title: 'Ejercicios de extensión cervical', description: 'Inclina la cabeza hacia atrás.' },
]

const ADEQUATE_RECS: Recommendation[] = [
  { title: '¡Excelente postura!', description: 'Mantén esta posición.' },
]

describe('RecommendationsCard — HU-10', () => {
  // Happy: forward_slouch → muestra recomendaciones de encorvamiento
  it('muestra recomendaciones numeradas para forward_slouch', () => {
    render(<RecommendationsCard recommendations={FORWARD_SLOUCH_RECS} postureClass="forward_slouch" />)
    expect(screen.getByText(/ajusta la altura del monitor/i)).toBeInTheDocument()
    expect(screen.getByText(/ejercicios de extensión cervical/i)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  // Happy: adequate → mensaje positivo
  it('muestra mensaje positivo cuando la postura es adecuada', () => {
    render(<RecommendationsCard recommendations={ADEQUATE_RECS} postureClass="adequate" />)
    expect(screen.getByText(/excelente postura/i)).toBeInTheDocument()
  })

  // Unhappy: sin recomendaciones → no renderiza items
  it('no muestra items cuando la lista está vacía', () => {
    render(<RecommendationsCard recommendations={[]} postureClass="forward_slouch" />)
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
