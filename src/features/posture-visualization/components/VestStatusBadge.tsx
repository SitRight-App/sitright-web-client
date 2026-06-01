import type { VestStatus } from '../hooks/useVestStatus'

interface Props {
  status: VestStatus
  batteryPercent?: number
}

interface StatusConfig {
  /** Texto principal del pill. */
  label: string
  /** Color del punto indicador. */
  dot: string
  /** Color del texto del pill. */
  text: string
  /** Hint que se muestra debajo del badge (HU-06 AC3 / HU-07 AC2). */
  hint?: string
  /** Color del hint cuando hay que destacar (p. ej. amarillo de batería baja). */
  hintTone?: string
}

const CONFIG: Record<VestStatus, StatusConfig> = {
  connected: { label: 'Conectado', dot: 'bg-moss', text: 'text-moss' },
  // HU-07 AC2 — batería baja: AC pide amarillo + 'conectar cargador'.
  // Usamos sand-light (el amarillo más cercano de la paleta editorial).
  battery_low: {
    label: 'Batería baja, conectar cargador',
    dot: 'bg-sand-light',
    text: 'text-ink-soft',
    hintTone: 'text-ink-soft',
  },
  // HU-06 AC3 — 'Chaleco sin conexión' + sugerencia de verificar WiFi.
  disconnected: {
    label: 'Chaleco sin conexión',
    dot: 'bg-ink-faint',
    text: 'text-ink-soft',
    hint: 'Verifica la conexión WiFi del chaleco',
  },
  loading: {
    label: 'Buscando chaleco',
    dot: 'bg-sand',
    text: 'text-ink-faint',
  },
}

export function VestStatusBadge({ status, batteryPercent }: Props) {
  const cfg = CONFIG[status]
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-2 rounded-full border border-sand bg-cream-bone px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${cfg.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        <span>{cfg.label}</span>
        {status === 'connected' && batteryPercent !== undefined && (
          <span className="text-ink-faint">· {batteryPercent}%</span>
        )}
      </span>
      {cfg.hint && (
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.12em] ${cfg.hintTone ?? 'text-ink-faint'}`}
        >
          {cfg.hint}
        </span>
      )}
    </div>
  )
}
