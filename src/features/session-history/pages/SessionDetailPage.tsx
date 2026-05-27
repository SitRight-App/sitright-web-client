import { Link, useParams } from 'react-router-dom'
import { useSession } from '../hooks/useSessions'

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const POSTURE_LABELS: Record<string, string> = {
  adequate: 'Adecuada',
  forward_head: 'Cabeza adelantada',
  rounded_shoulders: 'Hombros encorvados',
  slouching: 'Espalda encorvada',
  forward_slouch: 'Inclinación frontal',
  excessive_recline: 'Reclinación excesiva',
  lateral_tilt: 'Inclinación lateral',
  indeterminate: 'Indeterminada',
}

function Field({
  label,
  value,
  num,
}: {
  label: string
  value: string
  num?: string
}) {
  return (
    <div className="relative editorial-card p-6">
      {num && <span className="num-tag absolute right-4 top-4">{num}</span>}
      <p className="label-mono mb-3">{label}</p>
      <p className="font-serif text-[40px] leading-none tracking-tight text-ink">{value}</p>
    </div>
  )
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { data: session, isLoading, isError } = useSession(sessionId)

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">
        Cargando sesión…
      </p>
    )
  }

  if (isError || !session) {
    return (
      <div>
        <Link to="/history" className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
          ← Historial
        </Link>
        <p className="mt-5 border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo cargar la sesión.
        </p>
      </div>
    )
  }

  const summary = session.summary

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-8 border-b border-sand pb-6">
        <div>
          <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            <Link to="/history" className="hover:text-ink">
              Historial
            </Link>{' '}
            <span className="text-terracotta">›</span> Sesión
          </div>
          <h1 className="font-serif text-[56px] font-normal leading-[0.95] tracking-[-0.03em] text-ink">
            Sesión del {dateFmt.format(new Date(session.started_at))}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            {session.ended_at
              ? `Finalizó ${dateFmt.format(new Date(session.ended_at))}`
              : 'Sesión activa'}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          num="№ 01"
          label="Duración"
          value={
            session.duration_minutes !== null
              ? `${Math.round(session.duration_minutes)} min`
              : '—'
          }
        />
        <Field num="№ 02" label="Lecturas" value={String(session.reading_count)} />
        <Field
          num="№ 03"
          label="Postura adecuada"
          value={summary ? `${Math.round(summary.adequate_percentage)}%` : '—'}
        />
        <Field
          num="№ 04"
          label="Desviación dominante"
          value={
            summary?.dominant_deviation
              ? POSTURE_LABELS[summary.dominant_deviation] ?? summary.dominant_deviation
              : '—'
          }
        />
      </div>

      {summary && Object.keys(summary.counts_by_class).length > 0 && (
        <div className="relative mt-4 editorial-card p-7">
          <span className="num-tag absolute right-5 top-5">№ 05</span>
          <p className="label-mono">Distribución de posturas</p>
          <h3 className="mt-2 font-serif text-2xl tracking-tight text-ink">
            Lo que hizo tu columna
          </h3>
          <ul className="mt-5 space-y-3.5">
            {Object.entries(summary.counts_by_class).map(([cls, count]) => {
              const pct = summary.valid_readings
                ? Math.round((count / summary.valid_readings) * 100)
                : 0
              const adequate = cls === 'adequate'
              return (
                <li key={cls}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-serif text-base text-ink">
                      {POSTURE_LABELS[cls] ?? cls}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden bg-sand/40">
                    <div
                      className={`h-full ${adequate ? 'bg-moss' : 'bg-terracotta'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {session.note && (
        <div className="mt-4 editorial-card relative p-6">
          <span className="num-tag absolute right-5 top-5">№ 06</span>
          <p className="label-mono">Nota</p>
          <p className="mt-2 font-serif text-base italic leading-relaxed text-ink-soft">
            {session.note}
          </p>
        </div>
      )}
    </div>
  )
}
