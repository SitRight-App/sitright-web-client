/**
 * HU-10 — Recomendaciones según tipo de desviación
 *   Happy  : forward_slouch → muestra recomendaciones numeradas
 *   Happy  : adequate → muestra mensaje de buen desempeño
 *   Unhappy: lista vacía → no renderiza nada
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecommendationsCard } from './RecommendationsCard'
import type { Recommendation } from '../types/recommendation'

vi.mock('@/features/iam/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}))

vi.mock('@/shared/ui/toast/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    push: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

function makeRec(overrides: Partial<Recommendation>): Recommendation {
  return {
    id: 'test-rec',
    number: '№ 99',
    title: 'placeholder',
    description: 'placeholder',
    category: 'general',
    icon: 'pause',
    frequency_label: 'placeholder',
    posture_classes: ['forward_slouch'],
    is_featured: false,
    featured_tagline: null,
    featured_title_emphasis: null,
    featured_body: null,
    steps: [],
    ...overrides,
  }
}

const FORWARD_SLOUCH_RECS: Recommendation[] = [
  makeRec({
    id: 'r1',
    title: 'Ajusta la altura del monitor',
    description: 'Sube el monitor a la altura de los ojos.',
    icon: 'monitor',
  }),
  makeRec({
    id: 'r2',
    title: 'Ejercicios de extensión cervical',
    description: 'Inclina la cabeza hacia atrás.',
    icon: 'cervical-retract',
    category: 'cervical',
  }),
]

const ADEQUATE_RECS: Recommendation[] = [
  makeRec({
    id: 'r3',
    title: '¡Excelente postura!',
    description: 'Mantén esta posición.',
    posture_classes: ['adequate'],
  }),
]

describe('RecommendationsCard — HU-10', () => {
  // Happy: forward_slouch → muestra recomendaciones de encorvamiento
  it('muestra recomendaciones numeradas para forward_slouch', () => {
    render(<RecommendationsCard recommendations={FORWARD_SLOUCH_RECS} postureClass="forward_slouch" />)
    expect(screen.getByText(/ajusta la altura del monitor/i)).toBeInTheDocument()
    expect(screen.getByText(/ejercicios de extensión cervical/i)).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
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
