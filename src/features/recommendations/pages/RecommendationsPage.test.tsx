/**
 * HU-13/US013 — el control para marcar una recomendación como hecha es un
 * checkbox real (no un botón), y el título de una recomendación aplicada se
 * muestra tachado (line-through).
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecommendationsPage } from './RecommendationsPage'
import type { Recommendation } from '../types/recommendation'

const mark = vi.fn()
const unmark = vi.fn()

const CATALOG: Recommendation[] = [
  {
    id: 'r1',
    number: '№ 01',
    title: 'Ajusta la altura del monitor',
    description: 'Sube el monitor a la altura de los ojos.',
    category: 'cervical',
    icon: 'monitor',
    frequency_label: 'diario',
    posture_classes: ['forward_slouch'],
    is_featured: false,
    featured_tagline: null,
    featured_title_emphasis: null,
    featured_body: null,
    steps: [],
  },
  {
    id: 'r2',
    number: '№ 02',
    title: 'Estira la zona lumbar',
    description: 'Levántate y estira la espalda baja.',
    category: 'lumbar',
    icon: 'lumbar-stretch',
    frequency_label: 'cada 2 horas',
    posture_classes: ['excessive_recline'],
    is_featured: false,
    featured_tagline: null,
    featured_title_emphasis: null,
    featured_body: null,
    steps: [],
  },
]

vi.mock('../hooks/useRecommendations', () => ({
  useAllRecommendations: () => ({ data: CATALOG, isLoading: false, isError: false }),
  useAppliedRecommendations: () => ({
    data: [{ recommendation_id: 'r1', applied_at: '2026-06-15T10:00:00.000Z' }],
    isLoading: false,
  }),
  useMarkRecommendationApplied: () => ({ mutate: mark, isPending: false }),
  useUnmarkRecommendationApplied: () => ({ mutate: unmark, isPending: false }),
}))

function expandHechas() {
  // Hay dos botones con texto "Hechas" (el chip de filtro de estado y el
  // desplegable de la sección); el desplegable es el único con aria-expanded.
  const toggle = screen
    .getAllByRole('button', { name: /Hechas/ })
    .find((b) => b.hasAttribute('aria-expanded'))
  if (!toggle) throw new Error('No se encontró el botón desplegable "Hechas"')
  fireEvent.click(toggle)
}

describe('RecommendationsPage — US013 checkbox + tachado', () => {
  it('una recomendación aplicada tiene el checkbox marcado y el título tachado', () => {
    render(<RecommendationsPage />)
    expandHechas()

    const checkbox = screen.getByRole('checkbox', {
      name: /marcar "ajusta la altura del monitor" como hecha/i,
    })
    expect(checkbox).toBeChecked()

    const title = screen.getByText('Ajusta la altura del monitor')
    expect(title.className).toMatch(/line-through/)
  })

  it('una recomendación pendiente tiene el checkbox sin marcar y sin tachado', () => {
    render(<RecommendationsPage />)

    const checkbox = screen.getByRole('checkbox', {
      name: /marcar "estira la zona lumbar" como hecha/i,
    })
    expect(checkbox).not.toBeChecked()

    const title = screen.getByText('Estira la zona lumbar')
    expect(title.className).not.toMatch(/line-through/)
  })

  it('desmarcar la recomendación aplicada llama a unmark con su id', () => {
    render(<RecommendationsPage />)
    expandHechas()
    const checkbox = screen.getByRole('checkbox', {
      name: /marcar "ajusta la altura del monitor" como hecha/i,
    })
    fireEvent.click(checkbox)
    expect(unmark).toHaveBeenCalledWith('r1')
  })

  it('marcar una recomendación pendiente llama a mark con su id', () => {
    render(<RecommendationsPage />)
    const checkbox = screen.getByRole('checkbox', {
      name: /marcar "estira la zona lumbar" como hecha/i,
    })
    fireEvent.click(checkbox)
    expect(mark).toHaveBeenCalledWith('r2')
  })
})
