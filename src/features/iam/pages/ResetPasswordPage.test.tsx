import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'
import { resetPassword } from '../services/authService'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../services/authService', () => ({ resetPassword: vi.fn() }))

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ResetPasswordPage', () => {
  it('sin token muestra estado de enlace inválido con link a /forgot-password', () => {
    renderAt('/reset-password')
    expect(screen.getByText(/enlace no es válido|enlace inválido/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/nueva contraseña/i)).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: /solicitar.*nuevo|volver a solicitar|forgot/i })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('no llama al backend si las contraseñas no coinciden', () => {
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'OtraClave2' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('no llama al backend si la contraseña es muy corta', () => {
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'corta' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'corta' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    expect(screen.getByText(/8 caracteres/i)).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('éxito: llama a resetPassword y redirige a /login', async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce(undefined)
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('abc', 'ClaveLarga1'))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login'))
  })

  it('error del backend muestra estado de enlace inválido/expirado', async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(new Error('API 400: nope'))
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    expect(await screen.findByText(/enlace no es válido|expir/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /solicitar.*nuevo|volver a solicitar|forgot/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})
