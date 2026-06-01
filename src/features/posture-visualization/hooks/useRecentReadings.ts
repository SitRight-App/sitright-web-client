import { useQuery } from '@tanstack/react-query'
import { getRecentReadings } from '../services/postureService'

interface Options {
  /** Cantidad máxima de lecturas a recibir. Por defecto 60. */
  limit?: number
  /** Ventana temporal en minutos. Si está presente, filtra a las últimas N min. */
  minutes?: number
  /** Intervalo de refetch en milisegundos. Default 5000 (5 s) para alinear con la frecuencia del chaleco. */
  refetchInterval?: number
  /** Si es false, no consulta. Útil cuando el usuario aún no tiene un chaleco vinculado. */
  enabled?: boolean
}

export function useRecentReadings({
  limit = 60,
  minutes,
  refetchInterval = 5_000,
  enabled = true,
}: Options = {}) {
  return useQuery({
    queryKey: ['readings', 'recent', { limit, minutes }],
    queryFn: () => getRecentReadings({ limit, minutes }),
    refetchInterval,
    refetchOnWindowFocus: true,
    enabled,
  })
}
