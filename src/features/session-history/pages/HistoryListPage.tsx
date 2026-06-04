import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { useSessions } from '../hooks/useSessions'
import type { PostureSession } from '../types/session'

/** Bloque de métrica del encabezado: número grande en mono tabular sobre tarjeta. */
function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sand bg-cream-bone px-5 py-3.5">
      <p className="label-mono text-ink-faint">{label}</p>
      <p className="mt-1.5 font-mono text-[28px] font-semibold leading-none tabular-nums tracking-tight text-ink">
        {value}
      </p>
    </div>
  )
}

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
      {/* Encabezado: título limpio + acceso a evolución semanal */}
      <div className="flex flex-wrap items-end justify-between gap-6 pb-6">
        <div>
          <p className="text-[14px] text-ink-soft">Historial</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Sesiones guardadas
          </h1>
          <Link
            to="/history/weekly"
            className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-moss transition-colors hover:text-moss-deep"
          >
            Ver evolución semanal
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>

        {sessions && sessions.length > 0 && (
          <div className="flex items-stretch gap-5">
            <StatBlock label="Sesiones" value={String(sessions.length)} />
            {avgAdequate !== null && (
              <StatBlock label="Adecuada prom." value={`${avgAdequate}%`} />
            )}
            <StatBlock label="Tiempo total" value={`${Math.round(totalMinutes / 60)} h`} />
          </div>
        )}
      </div>

      <div className="mt-8">
        {/* HU-09 AC2 — resumen diario con datos insuficientes (<30 min) */}
        {!isLoading && closed.length > 0 && totalMinutes < 30 && (
          <div className="mb-6 rounded-lg border border-sand bg-cream-deep px-4 py-3 text-[14px] text-ink-soft">
            <strong className="font-semibold text-ink">No hay datos suficientes para generar el resumen.</strong>{' '}
            Usa el chaleco al menos 30 minutos en el día para ver tu jornada postural completa.
          </div>
        )}

        {isError && (
          <div className="mb-6 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep">
            No se pudo obtener el historial.
          </div>
        )}

        {isLoading && (
          <div className="overflow-hidden rounded-xl border border-sand bg-cream-bone">
            <div className="grid grid-cols-[1fr_120px_120px_120px_120px_24px] gap-5 border-b border-sand bg-cream-deep px-6 py-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              <span>Inicio</span>
              <span className="text-right">Duración</span>
              <span className="text-right">Lecturas</span>
              <span className="text-right">Adecuada</span>
              <span>Estado</span>
              <span />
            </div>
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_120px_120px_120px_120px_24px] items-center gap-5 border-b border-sand-light px-6 py-4 last:border-b-0"
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
          <div className="editorial-card p-12 text-center sm:p-14">
            <p className="text-2xl font-semibold tracking-tight text-ink">
              Aún no hay sesiones.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Inicia una desde el chaleco para verla aquí.
            </p>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-sand bg-cream-bone">
            <div className="grid grid-cols-[1fr_120px_120px_120px_120px_24px] gap-5 border-b border-sand bg-cream-deep px-6 py-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              <span>Inicio</span>
              <span className="text-right">Duración</span>
              <span className="text-right">Lecturas</span>
              <span className="text-right">Adecuada</span>
              <span>Estado</span>
              <span />
            </div>
            <div>
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/history/${s.id}`}
                  className="group grid grid-cols-[1fr_120px_120px_120px_120px_24px] items-center gap-5 border-b border-sand-light px-6 py-4 transition-colors last:border-b-0 hover:bg-cream-deep"
                >
                  <span className="text-[15px] font-medium text-ink">
                    {dateFmt.format(new Date(s.started_at))}
                  </span>
                  <span className="text-right font-mono text-[13px] tabular-nums text-ink-soft">
                    {s.duration_minutes !== null
                      ? `${Math.round(s.duration_minutes)} min`
                      : '—'}
                  </span>
                  <span className="text-right font-mono text-[13px] tabular-nums text-ink-soft">
                    {s.reading_count}
                  </span>
                  <span className="text-right font-mono text-[15px] font-semibold tabular-nums text-ink">
                    {s.summary ? `${Math.round(s.summary.adequate_percentage)}%` : '—'}
                  </span>
                  <span>
                    <StatusPill status={s.status} />
                  </span>
                  <span className="flex justify-end text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-moss">
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
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
