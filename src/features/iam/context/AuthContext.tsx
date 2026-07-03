import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { configureAuth, tokenStorage } from '@/shared/api/client'
import { useToast } from '@/shared/ui/toast'
import {
  getMe,
  login as loginApi,
  logout as logoutApi,
  refresh as refreshApi,
  register as registerApi,
} from '../services/authService'
import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (body: LoginRequest) => Promise<void>
  register: (body: RegisterRequest) => Promise<void>
  logout: () => void
  setUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Auto-logout por inactividad tras 30 min.
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const inactivityTimerRef = useRef<number | null>(null)
  const toast = useToast()

  const expireSession = useCallback(() => {
    // Avisar al usuario y descartar tokens.
    toast.info('Tu sesión ha expirado por inactividad', 'Vuelve a iniciar sesión.')
    logoutApi().catch(() => {})
    tokenStorage.clear()
    setUser(null)
  }, [toast])

  const resetInactivity = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current)
    }
    inactivityTimerRef.current = window.setTimeout(expireSession, INACTIVITY_TIMEOUT_MS)
  }, [expireSession])

  useEffect(() => {
    configureAuth({
      refresh: refreshApi,
      onUnauthorized: () => {
        tokenStorage.clear()
        setUser(null)
      },
    })
  }, [])

  // Escucha de actividad: cualquier interacción reinicia el contador.
  // Si el usuario está null no hay contador activo.
  useEffect(() => {
    if (!user) {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      return
    }
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ]
    resetInactivity()
    for (const evt of events) {
      window.addEventListener(evt, resetInactivity, { passive: true })
    }
    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, resetInactivity)
      }
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }
  }, [user, resetInactivity])

  useEffect(() => {
    const access = tokenStorage.getAccess()
    if (!access) {
      setIsLoading(false)
      return
    }
    getMe()
      .then(setUser)
      .catch(() => {
        tokenStorage.clear()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async login(body) {
        const tokens = await loginApi(body)
        tokenStorage.setTokens(tokens.access_token, tokens.refresh_token)
        const me = await getMe()
        setUser(me)
      },
      async register(body) {
        await registerApi(body)
        const tokens = await loginApi({ email: body.email, password: body.password })
        tokenStorage.setTokens(tokens.access_token, tokens.refresh_token)
        const me = await getMe()
        setUser(me)
      },
      logout() {
        // Avisamos al backend para que quede en logs antes de descartar
        // tokens. No bloqueamos la UI si la llamada falla.
        logoutApi().catch(() => {})
        tokenStorage.clear()
        setUser(null)
      },
      setUser,
    }),
    [user, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
