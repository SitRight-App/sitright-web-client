import { useQuery } from '@tanstack/react-query'
import { getSessionReadings } from '../services/sessionService'

/**
 * Recupera las lecturas de una sesión por su `session_id` (clave estable).
 *
 * Antes se pedían por rango horario (`/readings/recent?since&until`), lo que
 * fallaba por desajustes de formato/zona horaria entre `started_at` de la
 * sesión y el `timestamp` de las lecturas. Ahora el backend las agrupa por
 * `session_id` (ADR-006), así que la timeline y las estadísticas del reporte
 * siempre cuadran con el resumen.
 */
export function useSessionReadings(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'readings'],
    queryFn: () => getSessionReadings(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 60_000,
  })
}
