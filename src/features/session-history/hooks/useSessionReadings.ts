import { useQuery } from '@tanstack/react-query'
import { getSessionReadings } from '../services/sessionService'

/**
 * Recupera las lecturas de una sesión por su `session_id` (clave estable).
 *
 * El backend las agrupa por `session_id` (ADR-006), lo que evita los desajustes
 * de formato/zona horaria entre `started_at` de la sesión y el `timestamp` de
 * las lecturas, de modo que la timeline y las estadísticas del reporte siempre
 * cuadran con el resumen.
 */
export function useSessionReadings(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'readings'],
    queryFn: () => getSessionReadings(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 60_000,
  })
}
