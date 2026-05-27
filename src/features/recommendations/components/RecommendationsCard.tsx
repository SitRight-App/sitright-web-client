import type { Recommendation } from '../types/recommendation'

interface Props {
  recommendations: Recommendation[]
  postureClass: string
}

export function RecommendationsCard({ recommendations, postureClass }: Props) {
  const isGood = postureClass === 'adequate'

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
        {recommendations.map((rec, i) => (
          <div
            key={i}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
