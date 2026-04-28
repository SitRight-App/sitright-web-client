import type { VestStatus } from '../hooks/useVestStatus'

interface Props {
  status: VestStatus
  batteryPercent?: number
}

const CONFIG: Record<VestStatus, { label: string; dot: string; text: string }> = {
  connected:    { label: 'Conectado',   dot: 'bg-green-400',  text: 'text-green-700' },
  battery_low:  { label: 'Batería baja — conectar cargador', dot: 'bg-amber-400', text: 'text-amber-700' },
  disconnected: { label: 'Chaleco sin conexión', dot: 'bg-slate-300', text: 'text-slate-500' },
  loading:      { label: 'Buscando chaleco...', dot: 'bg-slate-200', text: 'text-slate-400' },
}

export function VestStatusBadge({ status, batteryPercent }: Props) {
  const { label, dot, text } = CONFIG[status]

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
      <span className={`text-sm font-medium ${text}`}>
        {label}
        {status === 'connected' && batteryPercent !== undefined && (
          <span className="ml-1 text-slate-400">· {batteryPercent}%</span>
        )}
      </span>
    </div>
  )
}
