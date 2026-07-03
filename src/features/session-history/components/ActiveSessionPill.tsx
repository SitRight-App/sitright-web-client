import { Link } from 'react-router-dom'
import { formatDuration, useLiveDuration } from '../hooks/useLiveDuration'
import { useActiveSession } from '../hooks/useSessions'

/**
 * Pill del topbar que refleja el estado de la sesión actual.
 *
 * - Con sesión activa: fondo verde musgo + dot terracotta pulsando + cronómetro
 *   en vivo. Click navega al dashboard donde está el control de cerrar.
 * - Sin sesión activa: fondo sand claro + indicador estático. Click navega al
 *   dashboard donde se puede iniciar una.
 */
// Una jornada real no dura más de ~12 h. Si una sesión sigue "activa" más allá
// de eso, casi seguro quedó sin cerrar (el trabajador se fue) y un cronómetro en
// vivo engañaría. En ese caso la mostramos como "sin cerrar" y detenemos el
// conteo de horas.
const STALE_SESSION_MS = 12 * 60 * 60 * 1000

export function ActiveSessionPill() {
  const { data: active, isLoading } = useActiveSession()
  const liveMs = useLiveDuration(active?.started_at ?? null)
  const isStale = active != null && liveMs > STALE_SESSION_MS

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-sand/30 px-3.5 py-1.5 text-[12px] font-medium text-ink-soft">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
        Sin estado
      </span>
    )
  }

  if (isStale) {
    return (
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-amber"
        title="Esta sesión lleva demasiado tiempo abierta. Ciérrala desde el panel."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber" />
        Sesión sin cerrar
      </Link>
    )
  }

  if (active) {
    return (
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-full bg-moss-deep px-3.5 py-1.5 text-[12px] font-medium text-cream transition-opacity hover:opacity-90"
        title={`Sesión activa desde ${new Date(active.started_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta" />
        Sesión · {formatDuration(liveMs)}
      </Link>
    )
  }

  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 rounded-full border border-sand bg-cream-bone px-3.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
      Sin sesión activa
    </Link>
  )
}
