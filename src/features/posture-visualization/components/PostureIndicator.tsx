import type { LatestReading, PostureClass } from '../types/posture'
import {
  POSTURE_BORDER_COLORS,
  POSTURE_COLORS,
  POSTURE_LABELS,
  POSTURE_TEXT_COLORS,
} from '../types/posture'
import { ConfidenceBar } from './ConfidenceBar'

interface Props {
  reading: LatestReading | null
  isLoading: boolean
}

function timeSince(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 5) return 'ahora mismo'
  if (diff < 60) return `hace ${diff}s`
  return `hace ${Math.floor(diff / 60)}m`
}

export function PostureIndicator({ reading, isLoading }: Props) {
  const cls: PostureClass = reading?.posture_class ?? 'indeterminate'
  const dotColor = POSTURE_COLORS[cls]
  const textColor = POSTURE_TEXT_COLORS[cls]
  const borderColor = POSTURE_BORDER_COLORS[cls]
  const label = POSTURE_LABELS[cls]

  return (
    <div className={`rounded-2xl border-2 ${borderColor} bg-white p-8 shadow-sm`}>
      <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Estado actual
      </p>

      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <div className={`h-20 w-20 rounded-full ${dotColor} opacity-20`} />
          <div
            className={`absolute inset-0 m-auto h-12 w-12 rounded-full ${dotColor} ${
              cls !== 'indeterminate' ? 'animate-pulse' : ''
            }`}
          />
        </div>

        <div className="flex-1">
          <p className={`text-2xl font-bold ${textColor}`}>{label}</p>

          {reading && (
            <p className="mt-1 text-sm text-slate-400">
              {timeSince(reading.timestamp)}
            </p>
          )}

          {isLoading && !reading && (
            <p className="mt-1 text-sm text-slate-400">Conectando...</p>
          )}
        </div>
      </div>

      {reading && (
        <div className="mt-6">
          <ConfidenceBar value={reading.confidence} postureClass={cls} />
        </div>
      )}
    </div>
  )
}
