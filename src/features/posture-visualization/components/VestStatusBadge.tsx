import type { VestStatus } from '../hooks/useVestStatus'

interface Props {
  status: VestStatus
  batteryPercent?: number
}

const CONFIG: Record<VestStatus, { label: string; dot: string; text: string }> = {
  connected: { label: 'Conectado', dot: 'bg-moss', text: 'text-moss' },
  battery_low: {
    label: 'Batería baja',
    dot: 'bg-terracotta',
    text: 'text-terracotta-deep',
  },
  disconnected: {
    label: 'Sin conexión',
    dot: 'bg-ink-faint',
    text: 'text-ink-soft',
  },
  loading: {
    label: 'Buscando chaleco',
    dot: 'bg-sand',
    text: 'text-ink-faint',
  },
}

export function VestStatusBadge({ status, batteryPercent }: Props) {
  const { label, dot, text } = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-sand bg-cream-bone px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
      {status === 'connected' && batteryPercent !== undefined && (
        <span className="text-ink-faint">· {batteryPercent}%</span>
      )}
    </span>
  )
}
