/**
 * Parsea una marca de tiempo enviada por el backend. Todas están en UTC, pero
 * algunas (como `started_at` de la sesión) llegan sin el indicador de zona, y el
 * navegador las interpretaría como hora local: en Perú (UTC-5) quedarían unas 5
 * horas en el futuro, lo que da duraciones negativas. Si falta la zona, se asume
 * UTC; si ya la trae (por ejemplo, `+00:00` en las lecturas), se respeta.
 */
export function parseServerDate(iso: string): Date {
  const hasTimezone = /([Zz]|[+-]\d{2}:?\d{2})$/.test(iso)
  return new Date(hasTimezone ? iso : `${iso}Z`)
}
