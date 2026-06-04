import { Link } from 'react-router-dom'
import { Skeleton, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { useSessions } from '../hooks/useSessions'
import type { PostureSession } from '../types/session'

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function StatusPill({ status }: { status: PostureSession['status'] }) {
  const isActive = status === 'active'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
        isActive
          ? 'bg-moss/10 text-moss'
          : 'bg-sand/30 text-ink-soft'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-moss' : 'bg-ink-faint'}`}
      />
      {isActive ? 'Activa' : 'Cerrada'}
    </span>
  )
}

export function HistoryListPage() {
  const { data: sessions, isLoading, isError } = useSessions({ limit: 50 })

  const closed = sessions?.filter((s) => s.summary) ?? []
  const avgAdequate = closed.length
    ? Math.round(
        closed.reduce((acc, s) => acc + (s.summary?.adequate_percentage ?? 0), 0) /
          closed.length,
      )
    : null
  const totalMinutes = closed.reduce((acc, s) => acc + (s.summary?.total_minutes ?? 0), 0)

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-8 border-b border-sand pb-6">
        <div>
          <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Panel <span className="text-terracotta">›</span> Historial
          </div>
          <h1 className="font-serif text-[64px] font-semibold leading-[0.95] tracking-[-0.03em] text-ink">
            Sesiones
            <br />
            <em className="font-normal italic text-moss">guardadas.</em>
          </h1>
          <Link
            to="/history/weekly"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-moss underline-offset-2 hover:underline"
          >
            Ver evolución semanal
          </Link>
        </div>

        {sessions && sessions.length > 0 && (
          <div className="flex items-end gap-9 border-l border-sand pl-9">
            <div>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                Sesiones
              </p>
              <p className="font-serif text-[44px] font-semibold leading-none tracking-tight">
                {sessions.length}
              </p>
            </div>
            {avgAdequate !== null && (
              <div>
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                  Adecuada prom.
                </p>
                <p className="font-serif text-[44px] font-semibold leading-none tracking-tight">
                  {avgAdequate}
                  <small className="ml-1 text-lg text-ink-soft">%</small>
                </p>
              </div>
            )}
            <div>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                Tiempo total
              </p>
              <p className="font-serif text-[44px] font-semibold leading-none tracking-tight">
                {Math.round(totalMinutes / 60)}
                <small className="ml-1 text-lg text-ink-soft">h</small>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-9">
        {/* HU-09 AC2 — resumen diario con datos insuficientes (<30 min) */}
        {!isLoading && closed.length > 0 && totalMinutes < 30 && (
          <div className="mb-6 border-l-2 border-sand bg-sand/15 px-4 py-3 text-sm text-ink-soft">
            <strong className="font-serif text-ink">No hay datos suficientes para generar el resumen.</strong>{' '}
            Usa el chaleco al menos 30 minutos en el día para ver tu jornada postural completa.
          </div>
        )}

        {isError && (
          <div className="border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
            No se pudo obtener el historial.
          </div>
        )}

        {isLoading && (
          <div>
            <div className="grid grid-cols-[1fr_120px_120px_120px_120px_24px] gap-5 border-b border-sand px-6 pb-3.5 font-mono text-[9px] uppercase tracking-[0.20em] text-ink-faint">
              <span>Inicio</span>
              <span>Duración</span>
              <span>Lecturas</span>
              <span>Adecuada</span>
              <span>Estado</span>
              <span />
            </div>
            <div className="mt-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_120px_120px_120px_120px_24px] items-center gap-5 border-b border-sand px-6 py-5"
                >
                  <SkeletonTextLine width="60%" />
                  <SkeletonTextLine width="50%" />
                  <SkeletonTextLine width="40%" />
                  <SkeletonTextLine width="40%" />
                  <Skeleton width={72} height={20} pill />
                  <SkeletonTextLine width={12} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && sessions && sessions.length === 0 && (
          <div className="border border-dashed border-sand p-12 text-center">
            <p className="font-serif text-[28px] tracking-tight text-ink">
              Aún no hay sesiones.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Inicia una desde el chaleco para verla aquí.
            </p>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div>
            <div className="grid grid-cols-[1fr_120px_120px_120px_120px_24px] gap-5 border-b border-sand px-6 pb-3.5 font-mono text-[9px] uppercase tracking-[0.20em] text-ink-faint">
              <span>Inicio</span>
              <span>Duración</span>
              <span>Lecturas</span>
              <span>Adecuada</span>
              <span>Estado</span>
              <span />
            </div>
            <div className="mt-1.5">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/history/${s.id}`}
                  className="group grid grid-cols-[1fr_120px_120px_120px_120px_24px] items-center gap-5 border-b border-sand px-6 py-5 transition-colors hover:bg-cream-bone/60"
                >
                  <span className="font-serif text-base text-ink">
                    {dateFmt.format(new Date(s.started_at))}
                  </span>
                  <span className="font-mono text-xs text-ink-soft">
                    {s.duration_minutes !== null
                      ? `${Math.round(s.duration_minutes)} min`
                      : '—'}
                  </span>
                  <span className="font-mono text-xs text-ink-soft">{s.reading_count}</span>
                  <span className="font-serif text-lg text-ink">
                    {s.summary ? `${Math.round(s.summary.adequate_percentage)}%` : '—'}
                  </span>
                  <span>
                    <StatusPill status={s.status} />
                  </span>
                  <span className="text-right font-mono text-base text-ink-faint transition-colors group-hover:text-terracotta">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
