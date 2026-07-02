import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRoute } from './AdminRoute'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }))

const toastError = vi.fn()
vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ error: toastError, success: vi.fn(), info: vi.fn() }),
}))

function renderAt(role: string | undefined) {
  mockUseAuth.mockReturnValue({ user: role ? { role } : null })
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>Panel Admin</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRoute — US022', () => {
  beforeEach(() => {
    toastError.mockClear()
  })

  it('un admin ve el panel', () => {
    renderAt('admin')
    expect(screen.getByText('Panel Admin')).toBeInTheDocument()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un usuario regular es redirigido al dashboard y ve el aviso de permisos', () => {
    renderAt('worker')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Panel Admin')).not.toBeInTheDocument()
    expect(toastError).toHaveBeenCalledWith('No tienes permisos para acceder a esta sección')
  })
})
