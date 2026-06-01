import { useMemo } from 'react'
import { useToast } from '@/shared/ui/toast/ToastProvider'
import { useSnoozedRecommendations } from '../hooks/useSnoozedRecommendations'
import type { Recommendation } from '../types/recommendation'

interface Props {
  recommendations: Recommendation[]
  postureClass: string
}

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
})

export function RecommendationsCard({ recommendations, postureClass }: Props) {
  const isGood = postureClass === 'adequate'
  const { snooze, isSnoozed, snoozedUntil } = useSnoozedRecommendations()
  const toast = useToast()

  const visible = useMemo(
    () => recommendations.filter((r) => !isSnoozed(r.id)),
    [recommendations, isSnoozed],
  )
  const snoozedItems = useMemo(
    () => recommendations.filter((r) => isSnoozed(r.id)),
    [recommendations, isSnoozed],
  )

  const handleSnooze = (rec: Recommendation) => {
    snooze(rec.id)
    const until = snoozedUntil(rec.id) ?? new Date(Date.now() + 30 * 60 * 1000)
    toast.info('Recomendación pospuesta 30 min', `Volverá a aparecer ${timeFmt.format(until)}`)
  }

  return (
    <div className="relative editorial-card p-7">
      <span className="num-tag absolute right-5 top-5">№ 07</span>
      <p className="label-mono">
        {isGood ? 'Mantén el ritmo' : 'Recomendaciones ergonómicas'}
      </p>
      <h3 className="mt-2 font-serif text-2xl tracking-tight text-ink">
        {isGood ? 'Estás bien sentado.' : 'Pequeños ajustes ahora.'}
      </h3>

      <div className="mt-5 space-y-4">
        {visible.map((rec, i) => (
          <div
            key={rec.id}
            className="grid grid-cols-[28px_1fr] gap-4 border-b border-dashed border-sand pb-4 last:border-0 last:pb-0"
          >
            <span
              className={`font-mono text-[11px] tracking-[0.10em] ${
                isGood ? 'text-moss' : 'text-terracotta'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="font-serif text-base text-ink">{rec.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                {rec.description}
              </p>
              {!isGood && (
                <button
                  type="button"
                  onClick={() => handleSnooze(rec)}
                  className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                >
                  Posponer 30 min
                </button>
              )}
            </div>
          </div>
        ))}

        {visible.length === 0 && !isGood && (
          <p className="text-[13px] italic text-ink-soft">
            Todas las recomendaciones están pospuestas. Volverán a aparecer pronto.
          </p>
        )}
      </div>

      {snoozedItems.length > 0 && (
        <p className="mt-5 border-t border-dashed border-sand pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          {snoozedItems.length} pospuesta{snoozedItems.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
