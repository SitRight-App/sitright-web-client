/**
 * US029 — filtro de estado (Todos/Activos/Inactivos) en el listado de admin y
 * botón "Invitar al primer usuario" en el estado vacío.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminPage } from './AdminPage'

const useAllUsers = vi.fn()

vi.mock('../hooks/useAdmin', () => ({
  useAllUsers: (status?: string) => useAllUsers(status),
  useAdminStats: () => ({ data: undefined }),
  useDeactivateUser: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

describe('AdminPage — US029', () => {
  it('por defecto pide todos los usuarios (sin filtro de estado)', () => {
    useAllUsers.mockReturnValue({
      data: { total: 0, users: [] },
      isLoading: false,
      isError: false,
    })
    renderPage()
    expect(useAllUsers).toHaveBeenCalledWith(undefined)
  })

  it('cambiar el filtro a "Activos" refetch con status=active', () => {
    useAllUsers.mockReturnValue({
      data: { total: 0, users: [] },
      isLoading: false,
      isError: false,
    })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Activos' }))
    expect(useAllUsers).toHaveBeenLastCalledWith('active')
  })

  it('cambiar el filtro a "Inactivos" refetch con status=inactive', () => {
    useAllUsers.mockReturnValue({
      data: { total: 0, users: [] },
      isLoading: false,
      isError: false,
    })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Inactivos' }))
    expect(useAllUsers).toHaveBeenLastCalledWith('inactive')
  })

  it('sin usuarios (filtro Todos) muestra el botón para invitar al primer usuario', () => {
    useAllUsers.mockReturnValue({
      data: { total: 0, users: [] },
      isLoading: false,
      isError: false,
    })
    renderPage()

    const invite = screen.getByRole('link', { name: 'Invitar al primer usuario' })
    expect(invite).toHaveAttribute('href', '/register')
  })
})
