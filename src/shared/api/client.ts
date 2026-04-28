const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API ${response.status}: ${error}`)
  }
  return response.json() as Promise<T>
}
