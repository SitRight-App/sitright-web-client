import type { Recommendation } from '../types/recommendation'

interface Props {
  recommendations: Recommendation[]
  postureClass: string
}

export function RecommendationsCard({ recommendations, postureClass }: Props) {
  if (postureClass === 'adequate') {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-600">
          Recomendaciones
        </p>
        {recommendations.map((rec, i) => (
          <div key={i} className="flex gap-3">
            <span className="mt-0.5 text-green-500">✓</span>
            <div>
              <p className="font-medium text-green-800">{rec.title}</p>
              <p className="mt-0.5 text-sm text-green-700">{rec.description}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Recomendaciones ergonómicas
      </p>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-slate-800">{rec.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{rec.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
