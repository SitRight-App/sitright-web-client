import { useEffect, useState } from 'react'

/**
 * Devuelve la duración en milisegundos desde `startedAt` hasta ahora, actualizada
 * cada `tickMs`. Útil para renderizar relojes en vivo de sesión activa sin
 * provocar refetches al backend.
 */
export function useLiveDuration(startedAt: string | null, tickMs = 1000): number {
  const compute = () => (startedAt ? Date.now() - new Date(startedAt).getTime() : 0)
  const [ms, setMs] = useState(compute)

  useEffect(() => {
    if (!startedAt) {
      setMs(0)
      return
    }
    setMs(compute())
    const handle = setInterval(() => setMs(compute()), tickMs)
    return () => clearInterval(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, tickMs])

  return ms
}

/** Formatea milisegundos como "Hh MMm SSs" según corresponda. */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0s'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }
  return `${seconds}s`
}
