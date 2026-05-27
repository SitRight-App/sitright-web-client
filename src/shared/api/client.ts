const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'

const ACCESS_KEY = 'sitright.access_token'
const REFRESH_KEY = 'sitright.refresh_token'

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  setAccess(access: string): void {
    localStorage.setItem(ACCESS_KEY, access)
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean
}

type RefreshFn = (refreshToken: string) => Promise<{ access_token: string; refresh_token: string }>

let refreshFn: RefreshFn | null = null
let onUnauthorized: (() => void) | null = null

export function configureAuth(opts: { refresh?: RefreshFn; onUnauthorized?: () => void }): void {
  if (opts.refresh) refreshFn = opts.refresh
  if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized
}

let inflightRefresh: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (!refreshFn) return null
  const refresh = tokenStorage.getRefresh()
  if (!refresh) return null
  if (inflightRefresh) return inflightRefresh
  inflightRefresh = (async () => {
    try {
      const tokens = await refreshFn!(refresh)
      tokenStorage.setTokens(tokens.access_token, tokens.refresh_token)
      return tokens.access_token
    } catch {
      tokenStorage.clear()
      onUnauthorized?.()
      return null
    } finally {
      inflightRefresh = null
    }
  })()
  return inflightRefresh
}

async function doFetch(path: string, options: ApiOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`
  }
  const { skipAuth: _skipAuth, ...rest } = options
  return fetch(`${BASE_URL}${path}`, { ...rest, headers })
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.skipAuth ? null : tokenStorage.getAccess()
  let response = await doFetch(path, options, token)

  if (response.status === 401 && !options.skipAuth) {
    const newToken = await tryRefresh()
    if (newToken) {
      response = await doFetch(path, options, newToken)
    } else {
      onUnauthorized?.()
    }
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API ${response.status}: ${error}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}
