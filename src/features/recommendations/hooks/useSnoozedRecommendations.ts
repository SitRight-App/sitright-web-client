import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/iam/context/AuthContext'

const STORAGE_PREFIX = 'sitright:snoozed-recs:'
const DEFAULT_DURATION_MS = 30 * 60 * 1000

interface SnoozeMap {
  [recommendationId: string]: number
}

function loadMap(userId: string | null): SnoozeMap {
  if (!userId || typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SnoozeMap
    const now = Date.now()
    const cleaned: SnoozeMap = {}
    for (const [id, until] of Object.entries(parsed)) {
      if (typeof until === 'number' && until > now) cleaned[id] = until
    }
    return cleaned
  } catch {
    return {}
  }
}

function persist(userId: string, map: SnoozeMap): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(map))
  } catch {
    /* localStorage no disponible o cuota llena */
  }
}

/**
 * Permite "posponer" una recomendación durante 30 min en el cliente.
 * El estado se persiste en localStorage por usuario y se purga al expirar.
 * No requiere endpoint backend.
 */
export function useSnoozedRecommendations() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [map, setMap] = useState<SnoozeMap>(() => loadMap(userId))

  // Recargar cuando cambia el usuario (logout/login).
  useEffect(() => {
    setMap(loadMap(userId))
  }, [userId])

  // Tick cada minuto para purgar entradas vencidas.
  useEffect(() => {
    const tick = window.setInterval(() => {
      setMap((prev) => {
        const now = Date.now()
        const next: SnoozeMap = {}
        let changed = false
        for (const [id, until] of Object.entries(prev)) {
          if (until > now) next[id] = until
          else changed = true
        }
        if (changed && userId) persist(userId, next)
        return changed ? next : prev
      })
    }, 60_000)
    return () => window.clearInterval(tick)
  }, [userId])

  const snooze = useCallback(
    (recommendationId: string, durationMs: number = DEFAULT_DURATION_MS) => {
      if (!userId) return
      setMap((prev) => {
        const next = { ...prev, [recommendationId]: Date.now() + durationMs }
        persist(userId, next)
        return next
      })
    },
    [userId],
  )

  const isSnoozed = useCallback(
    (recommendationId: string) => {
      const until = map[recommendationId]
      return typeof until === 'number' && until > Date.now()
    },
    [map],
  )

  const snoozedUntil = useCallback(
    (recommendationId: string): Date | null => {
      const until = map[recommendationId]
      if (typeof until !== 'number' || until <= Date.now()) return null
      return new Date(until)
    },
    [map],
  )

  return { snooze, isSnoozed, snoozedUntil }
}
