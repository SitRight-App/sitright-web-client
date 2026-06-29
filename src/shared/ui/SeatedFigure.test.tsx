// src/shared/ui/SeatedFigure.test.tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeatedFigure } from './SeatedFigure'

const ok = { tone: 'ok' as const }

describe('SeatedFigure lean', () => {
  it('rota el torso cuando lean != 0', () => {
    const { container } = render(
      <SeatedFigure cervical={ok} dorsal={ok} lumbar={ok} lean={12} />,
    )
    const g = container.querySelector('[data-figure-lean]')
    expect(g?.getAttribute('transform')).toBe('rotate(12 100 200)')
  })

  it('por defecto no inclina (rotate 0)', () => {
    const { container } = render(
      <SeatedFigure cervical={ok} dorsal={ok} lumbar={ok} />,
    )
    const g = container.querySelector('[data-figure-lean]')
    expect(g?.getAttribute('transform')).toBe('rotate(0 100 200)')
  })
})
