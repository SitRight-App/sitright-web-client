import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { configureAuth, tokenStorage } from '@/shared/api/client'
import {
  getMe,
  login as loginApi,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    configureAuth({
      refresh: refreshApi,
      onUnauthorized: () => {
        tokenStorage.clear()
        setUser(null)
      },
    })
  }, [])

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
