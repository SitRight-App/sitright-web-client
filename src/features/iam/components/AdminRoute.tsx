import { useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useToast } from '@/shared/ui/toast'
import { useAuth } from '../context/AuthContext'

/**
 * US022 — protege las rutas de administrador. Se usa DENTRO de <ProtectedRoute>
 * (el usuario ya está autenticado), así que aquí solo se valida el rol. Un
 * usuario sin rol admin que entra directo a la URL es redirigido al dashboard
 * y ve un aviso de permisos (defensa en profundidad: el backend igual responde 403).
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error('No tienes permisos para acceder a esta sección')
    }
  }, [user, isAdmin, toast])

  if (user && !isAdmin) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
