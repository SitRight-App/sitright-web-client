import { afterEach, describe, expect, it, vi } from 'vitest'
import { notifyEvent } from './notifyEvent'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('notifyEvent', () => {
  it('hace POST a /users/me/notifications con el type dado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await notifyEvent('bad_posture_alert')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/users/me/notifications')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ type: 'bad_posture_alert' })
  })

  it('también soporta el type break_reminder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await notifyEvent('break_reminder')

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ type: 'break_reminder' })
  })
})
