import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPassword } from './authService'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('resetPassword', () => {
  it('hace POST a /auth/reset-password con token y new_password', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await resetPassword('tok-123', 'NuevaClave1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/auth/reset-password')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ token: 'tok-123', new_password: 'NuevaClave1' })
  })

  it('lanza cuando el backend responde 400', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'El enlace no es válido o expiró',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(resetPassword('malo', 'NuevaClave1')).rejects.toThrow(/400/)
  })
})
