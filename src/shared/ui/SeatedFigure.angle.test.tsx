// src/shared/ui/SeatedFigure.angle.test.tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeatedFigure } from './SeatedFigure'

const ok = { tone: 'ok' as const }

describe('SeatedFigure angleMarkers', () => {
  it('dibuja un marcador con la etiqueta de grados', () => {
    const { container, getByText } = render(
      <SeatedFigure
        cervical={ok}
        dorsal={ok}
        lumbar={ok}
        angleMarkers={{ cervical: { deg: 22, tone: 'marcada' } }}
      />,
    )
    expect(container.querySelectorAll('[data-angle-marker]')).toHaveLength(1)
    expect(getByText('22°')).toBeTruthy()
  })
  it('sin angleMarkers no agrega marcadores', () => {
    const { container } = render(<SeatedFigure cervical={ok} dorsal={ok} lumbar={ok} />)
    expect(container.querySelectorAll('[data-angle-marker]')).toHaveLength(0)
  })
})
