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
  /** Texto largo expuesto vía `title` (tooltip nativo) para no recargar el pill. */
  tooltip?: string
}

const CONFIG: Record<VestStatus, StatusConfig> = {
  connected: { label: 'Conectado', dot: 'bg-moss', text: 'text-moss' },
  // HU-07 AC2 — batería baja: AC pide amarillo + 'conectar cargador'.
  // Usamos sand-light (el amarillo más cercano de la paleta editorial).
  battery_low: {
    label: 'Batería baja, conectar cargador',
    dot: 'bg-sand-light',
    text: 'text-ink-soft',
  },
  // HU-06 AC3 — 'Chaleco sin conexión'. El hint de WiFi vive en el tooltip.
  disconnected: {
    label: 'Chaleco sin conexión',
    dot: 'bg-ink-faint',
    text: 'text-ink-soft',
    tooltip: 'Verifica la conexión WiFi del chaleco',
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
    <span
      title={cfg.tooltip}
      className={`inline-flex items-center gap-2 rounded-full border border-sand bg-cream-bone px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
      {status === 'connected' && batteryPercent !== undefined && (
        <span className="text-ink-faint">· {batteryPercent}%</span>
      )}
    </span>
  )
}
