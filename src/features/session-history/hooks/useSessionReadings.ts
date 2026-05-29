import { useQuery } from '@tanstack/react-query'
import { getRecentReadings } from '@/features/posture-visualization/services/postureService'

interface Args {
  startedAt: string | null | undefined
  endedAt: string | null | undefined
}

/**
 * Recupera todas las lecturas dentro del rango temporal de una sesión.
 *
 * Si la sesión sigue activa (`endedAt` null), usa "ahora" como límite superior.
 * El límite duro de 2000 lecturas alcanza para una jornada laboral completa de
 * ~9 h a una frecuencia de 5 segundos (≈ 6,500 lecturas teóricas, suficientes
 * para visualización de tendencias generales).
 */
export function useSessionReadings({ startedAt, endedAt }: Args) {
  const enabled = Boolean(startedAt)
  return useQuery({
    queryKey: ['readings', 'session-range', startedAt, endedAt],
    queryFn: () =>
      getRecentReadings({
        limit: 2000,
        since: startedAt!,
        until: endedAt ?? new Date().toISOString(),
      }),
    enabled,
    staleTime: 60_000,
  })
}
