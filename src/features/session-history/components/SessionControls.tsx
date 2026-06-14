import { Link } from 'react-router-dom'
import { useMyVest } from '@/features/vest-management/hooks/useMyVest'
import { Skeleton, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { formatDuration, useLiveDuration } from '../hooks/useLiveDuration'
import { useActiveSession, useCloseSession, useStartSession } from '../hooks/useSessions'

/**
 * Tarjeta de control de sesión para el dashboard.
 *
 * - Sin chaleco vinculado: estado vacío con CTA hacia /vest.
 * - Con chaleco pero sin sesión activa: botón "Iniciar sesión".
 * - Con sesión activa: cronómetro en vivo + "Cerrar sesión".
 */
// Una jornada real no supera ~12 h. Más allá, la sesión casi seguro quedó sin
// cerrar: dejamos de presentar el cronómetro como si la jornada siguiera en curso.
const STALE_SESSION_MS = 12 * 60 * 60 * 1000

export function SessionControls() {
  const { data: vest, isLoading: vestLoading } = useMyVest()
  const { data: active, isLoading: activeLoading } = useActiveSession()
  const startMutation = useStartSession()
  const closeMutation = useCloseSession()
  const liveMs = useLiveDuration(active?.started_at ?? null)

  const isLoading = vestLoading || activeLoading
  const isStale = active != null && liveMs > STALE_SESSION_MS

  const handleStart = () => {
    if (!vest) return
    startMutation.mutate({ vest_device_id: vest.id })
  }

  const handleClose = () => {
    if (!active) return
    closeMutation.mutate({ sessionId: active.id })
  }

  return (
    <div className="editorial-card flex flex-col p-5">
      <p className="label-mono">Control de sesión</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
        {isStale ? (
          <>
            Tu jornada quedó <span className="text-terracotta-deep">sin cerrar.</span>
          </>
        ) : active ? (
          <>
            Tu jornada está <span className="text-moss">en curso.</span>
          </>
        ) : (
          <>
            ¿Empiezas <span className="text-moss">a registrar</span>?
          </>
        )}
      </h2>

      {isLoading && (
        <div className="mt-4 space-y-3">
          <SkeletonTextLine width="80%" />
          <SkeletonTextLine width="60%" />
          <Skeleton width={160} height={44} className="mt-5" />
        </div>
      )}

      {!isLoading && !vest && <NoVestState />}

      {!isLoading && vest && !active && (
        <NoActiveSessionState
          onStart={handleStart}
          isPending={startMutation.isPending}
        />
      )}

      {!isLoading && active && (
        <ActiveSessionState
          startedAt={active.started_at}
          liveMs={liveMs}
          readingCount={active.reading_count}
          onClose={handleClose}
          isPending={closeMutation.isPending}
          isStale={isStale}
        />
      )}
    </div>
  )
}

function NoVestState() {
  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Aún no vinculaste un chaleco a tu cuenta. Vinculá uno desde el panel de Chaleco para
        habilitar el control de sesión.
      </p>
      <Link
        to="/vest"
        className="mt-5 inline-flex items-center gap-3 border border-ink bg-transparent px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-cream"
      >
        Ir al panel de Chaleco
        <span aria-hidden>→</span>
      </Link>
    </div>
  )
}

interface NoActiveProps {
  onStart: () => void
  isPending: boolean
}

function NoActiveSessionState({ onStart, isPending }: NoActiveProps) {
  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Tu chaleco está vinculado y listo. Iniciá una sesión para que las lecturas queden
        agrupadas en tu historial.
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={isPending}
        className="mt-5 inline-flex items-center gap-3 self-start bg-moss-deep px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-cream transition-colors hover:bg-ink active:scale-[0.98] disabled:opacity-60"
      >
        <span>{isPending ? 'Iniciando…' : 'Iniciar sesión'}</span>
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}

interface ActiveProps {
  startedAt: string
  liveMs: number
  readingCount: number
  onClose: () => void
  isPending: boolean
  isStale: boolean
}

function ActiveSessionState({
  startedAt,
  liveMs,
  readingCount,
  onClose,
  isPending,
  isStale,
}: ActiveProps) {
  const startedAtFmt = new Date(startedAt).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-4 border-t border-sand pt-4">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            {isStale ? 'Abierta hace' : 'Duración'}
          </p>
          <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink">
            {formatDuration(liveMs)}
          </p>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.10em] text-ink-soft">
            Inicio · {startedAtFmt}
          </p>
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Lecturas
          </p>
          <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink">
            {readingCount.toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {isStale && (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
          Esta sesión lleva más de 12 h abierta. Ciérrala para guardar el resumen
          de tu jornada.
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        disabled={isPending}
        className="mt-5 inline-flex items-center gap-3 self-start border border-terracotta bg-transparent px-6 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-terracotta-deep transition-colors hover:bg-terracotta hover:text-cream active:scale-[0.98] disabled:opacity-60"
      >
        <span>{isPending ? 'Cerrando…' : 'Cerrar sesión'}</span>
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}
