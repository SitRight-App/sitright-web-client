import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/shared/ui/toast/ToastProvider'
import { useSnoozedRecommendations } from '../hooks/useSnoozedRecommendations'
import type { Recommendation, RecommendationCategory } from '../types/recommendation'

interface Props {
  recommendations: Recommendation[]
  postureClass: string
  /**
   * Máximo de recomendaciones a mostrar. Si hay más, se muestra un enlace a la
   * página completa. En el dashboard se limita para que la lista no empuje el
   * resto del panel hacia abajo; sin límite muestra todas.
   */
  maxVisible?: number
}

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
})

// Zona de la columna afectada por cada desviación postural. Las recomendaciones
// de esa zona son las más relevantes para la postura actual.
const AFFECTED_ZONE: Record<string, RecommendationCategory> = {
  forward_slouch: 'cervical',
  excessive_recline: 'lumbar',
}

/**
 * Rango de prioridad (menor = se muestra primero). Ordena por: (1) destacadas,
 * (2) zona desviada actual, (3) otra zona específica antes que las generales,
 * (4) número de catálogo como desempate estable. Así, al recortar a `maxVisible`
 * en el dashboard, se conservan las recomendaciones más pertinentes, no las
 * primeras que devuelve el backend.
 */
function priorityRank(rec: Recommendation, affected: RecommendationCategory | undefined): number {
  let rank = 0
  if (!rec.is_featured) rank += 1000
  if (affected && rec.category === affected) rank += 0
  else if (rec.category !== 'general') rank += 100
  else rank += 200
  rank += Number(rec.number) || 0
  return rank
}

export function RecommendationsCard({ recommendations, postureClass, maxVisible }: Props) {
  const isGood = postureClass === 'adequate'
  const { snooze, isSnoozed, snoozedUntil } = useSnoozedRecommendations()
  const toast = useToast()

  const allVisible = useMemo(() => {
    const affected = AFFECTED_ZONE[postureClass]
    return recommendations
      .filter((r) => !isSnoozed(r.id))
      .sort((a, b) => priorityRank(a, affected) - priorityRank(b, affected))
  }, [recommendations, isSnoozed, postureClass])
  const visible = maxVisible ? allVisible.slice(0, maxVisible) : allVisible
  const hiddenCount = allVisible.length - visible.length
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
    <div className="editorial-card flex h-full flex-col p-6">
      <p className="label-mono">{isGood ? 'Sigue así' : 'Consejos para ti'}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">
        {isGood ? 'Vas muy bien hoy.' : 'Prueba estos ajustes ahora.'}
      </h3>

      <div className="mt-4 space-y-3.5">
        {visible.map((rec, i) => (
          <div
            key={rec.id}
            className="grid grid-cols-[28px_1fr] gap-4 border-b border-sand pb-4 last:border-0 last:pb-0"
          >
            <span
              className={`font-mono text-[12px] tabular-nums ${
                isGood ? 'text-moss' : 'text-terracotta-deep'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-base font-medium text-ink">{rec.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
                {rec.description}
              </p>
              {!isGood && (
                <button
                  type="button"
                  onClick={() => handleSnooze(rec)}
                  className="mt-2 text-[13px] font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                >
                  Posponer 30 min
                </button>
              )}
            </div>
          </div>
        ))}

        {visible.length === 0 && !isGood && (
          <p className="text-[14px] italic text-ink-soft">
            Todas las recomendaciones están pospuestas. Volverán a aparecer pronto.
          </p>
        )}
      </div>

      {hiddenCount > 0 && (
        <Link
          to="/recommendations"
          className="mt-4 inline-flex items-center gap-1.5 border-t border-sand pt-3 text-[14px] font-medium text-moss hover:text-moss-deep"
        >
          Ver todos los consejos ({allVisible.length}) →
        </Link>
      )}

      {snoozedItems.length > 0 && (
        <p className="mt-4 text-[13px] text-ink-faint">
          {snoozedItems.length} pospuesta{snoozedItems.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
