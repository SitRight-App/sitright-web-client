import type { LatestReading, PostureClass } from '../types/posture'
import {
  POSTURE_BG,
  POSTURE_HEADLINES,
  POSTURE_LABELS,
  isDeviation,
} from '../types/posture'
import { parseServerDate } from '@/shared/lib/parseServerDate'
import { ConfidenceBar } from './ConfidenceBar'

interface Props {
  reading: LatestReading | null
  isLoading: boolean
}

function timeSince(isoString: string): string {
  const diff = Math.floor((Date.now() - parseServerDate(isoString).getTime()) / 1000)
  if (diff < 5) return 'ahora mismo'
  if (diff < 60) return `hace ${diff}s`
  return `hace ${Math.floor(diff / 60)}m`
}

export function PostureIndicator({ reading, isLoading }: Props) {
  const cls: PostureClass = reading?.posture_class ?? 'indeterminate'
  const headline = POSTURE_HEADLINES[cls]
  const sub = POSTURE_LABELS[cls]
  const isWarn = isDeviation(cls)

  const tone = isWarn
    ? 'bg-terracotta text-cream border-terracotta-deep'
    : 'bg-moss-deep text-cream border-moss-deep'

  return (
    <div className={`relative flex h-full flex-col rounded-[4px] border p-7 ${tone}`}>
      <span className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-[0.16em] text-cream/55">
        № 01
      </span>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sand/80">
        Postura actual
      </p>
      <div className="mt-4 flex-1">
        <h2 className="font-serif text-[32px] leading-tight tracking-tight">
          {headline.split(' ').slice(0, 1).join(' ')}{' '}
          <em className="italic">
            {headline.split(' ').slice(1).join(' ')}
          </em>
        </h2>
        <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-cream/75">
          {sub}.{' '}
          {reading
            ? `Última lectura ${timeSince(reading.timestamp)}.`
            : isLoading
              ? 'Conectando con el chaleco.'
              : 'Sin lecturas todavía.'}
        </p>
      </div>

      {reading && (
        <div className="mt-6 border-t border-cream/15 pt-4">
          <ConfidenceBar value={reading.confidence} accent={POSTURE_BG[cls]} />
        </div>
      )}
    </div>
  )
}
