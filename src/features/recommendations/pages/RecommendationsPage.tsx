import { useMemo, useState } from 'react'
import {
  FEATURED_RECOMMENDATION,
  RECOMMENDATION_CATALOG,
} from '../data/catalog'
import { RecommendationIcon } from '../components/RecommendationIcon'
import type {
  RecommendationCatalogEntry,
  RecommendationCategory,
} from '../types/recommendation'

type CategoryFilter = 'all' | RecommendationCategory
type StatusFilter = 'all' | 'pending' | 'applied'

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'Todas',
  lumbar: 'Lumbar',
  cervical: 'Cervical',
  general: 'Generales',
}

const TAG_STYLES: Record<RecommendationCategory, string> = {
  lumbar:
    'bg-terracotta/[0.12] text-terracotta-deep border border-terracotta/30',
  cervical:
    'bg-terracotta-soft/20 text-terracotta-deep border border-terracotta-soft',
  general:
    'bg-moss/10 text-moss border border-moss/25',
}

function countByCategory(entries: RecommendationCatalogEntry[]) {
  const counts: Record<CategoryFilter, number> = {
    all: entries.length,
    lumbar: 0,
    cervical: 0,
    general: 0,
  }
  for (const entry of entries) {
    counts[entry.category]++
  }
  return counts
}

export function RecommendationsPage() {
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const counts = useMemo(() => countByCategory(RECOMMENDATION_CATALOG), [])
  const appliedNow = useMemo(
    () => RECOMMENDATION_CATALOG.filter((r) => !r.applied).length,
    [],
  )

  const filtered = useMemo(() => {
    return RECOMMENDATION_CATALOG.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false
      if (status === 'applied' && !entry.applied) return false
      if (status === 'pending' && entry.applied) return false
      return true
    })
  }, [category, status])

  return (
    <div>
      <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Panel <span className="text-terracotta">›</span> Recomendaciones
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
        <h1 className="font-serif text-[44px] font-normal leading-none tracking-[-0.025em] text-ink">
          Pequeños gestos,
          <br />
          <em className="italic font-normal text-moss">columnas más sanas.</em>
        </h1>
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Recomendaciones aplicables ahora
          <div className="mt-1.5 font-serif text-3xl tracking-tight text-ink normal-case">
            {appliedNow} <span className="text-ink-faint">/ {RECOMMENDATION_CATALOG.length}</span>
          </div>
        </div>
      </div>

      {/* Hero — recomendación del día */}
      <section className="mb-9 grid grid-cols-1 overflow-hidden rounded-md border border-sand bg-cream lg:grid-cols-[1.3fr_1fr]">
        <div
          className="relative p-9 lg:p-10 text-cream"
          style={{
            backgroundColor: 'rgb(var(--color-moss-deep))',
            backgroundImage:
              'radial-gradient(at 100% 0%, rgba(200,98,60,0.18), transparent 60%), radial-gradient(at 0% 100%, rgba(77,107,85,0.30), transparent 50%)',
          }}
        >
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.20em] text-terracotta-soft">
            <span className="inline-block h-px w-7 bg-terracotta-soft" />
            {FEATURED_RECOMMENDATION.tagline}
          </div>
          <h2 className="mb-5 font-serif text-[52px] font-light leading-[0.98] tracking-[-0.03em]">
            {FEATURED_RECOMMENDATION.title}
            <br />
            <em className="italic font-light text-terracotta-soft">
              {FEATURED_RECOMMENDATION.titleEmphasis}
            </em>
          </h2>
          <p className="mb-7 max-w-[460px] font-serif text-[15px] font-light leading-relaxed text-cream/80">
            {FEATURED_RECOMMENDATION.body}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2.5 border border-terracotta bg-terracotta px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cream transition-colors hover:bg-terracotta-deep"
            >
              Marcar como aplicada
              <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2.5 border border-cream/30 bg-transparent px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cream transition-colors hover:border-cream"
            >
              Posponer 30 min
            </button>
          </div>
        </div>

        <div className="bg-cream-deep p-9 lg:p-10">
          <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Pasos · ≈ 90 segundos
          </div>
          <ol className="space-y-0">
            {FEATURED_RECOMMENDATION.steps.map((step, i) => (
              <li
                key={step.number}
                className={`grid grid-cols-[36px_1fr] gap-3.5 py-3.5 ${
                  i < FEATURED_RECOMMENDATION.steps.length - 1
                    ? 'border-b border-dashed border-sand'
                    : ''
                }`}
              >
                <span className="font-serif text-[22px] leading-none text-terracotta-deep">
                  {step.number}
                </span>
                <div>
                  <p className="text-[13px] leading-snug text-ink">{step.body}</p>
                  <em className="mt-1 block font-mono text-[10px] uppercase tracking-[0.10em] text-ink-faint not-italic">
                    {step.meta}
                  </em>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Filter row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Categoría
        </span>
        {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-full border px-4 py-2 text-xs transition-colors ${
              category === cat
                ? 'border-ink bg-ink text-cream'
                : 'border-sand bg-transparent text-ink hover:border-ink'
            }`}
          >
            {CATEGORY_LABELS[cat]} · {counts[cat]}
          </button>
        ))}

        <span className="ml-4 mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Estado
        </span>
        {(['pending', 'applied'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? 'all' : s)}
            className={`rounded-full border px-4 py-2 text-xs transition-colors ${
              status === s
                ? 'border-ink bg-ink text-cream'
                : 'border-sand bg-transparent text-ink hover:border-ink'
            }`}
          >
            {s === 'pending' ? 'Pendientes' : 'Aplicadas'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <RecommendationCard key={entry.id} entry={entry} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full border border-dashed border-sand p-10 text-center">
            <p className="font-serif text-2xl tracking-tight text-ink">
              No hay recomendaciones para este filtro.
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Ajustá los filtros de categoría o estado.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface CardProps {
  entry: RecommendationCatalogEntry
}

function RecommendationCard({ entry }: CardProps) {
  const isApplied = !!entry.applied
  return (
    <article
      className={`group relative flex min-h-[360px] cursor-pointer flex-col rounded-md border p-6 transition-all hover:-translate-y-0.5 hover:border-ink ${
        isApplied
          ? 'border-dashed border-sand bg-moss/[0.05]'
          : 'border-sand bg-cream-bone'
      }`}
    >
      <div className="mb-6 flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {entry.number}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${TAG_STYLES[entry.category]}`}
        >
          {isApplied ? 'Aplicada hoy' : CATEGORY_LABELS[entry.category]}
        </span>
      </div>

      <div
        className={`mb-5 grid h-20 w-20 place-items-center rounded-full border border-sand ${
          isApplied ? 'bg-moss/[0.08] text-moss' : 'bg-cream text-moss'
        }`}
      >
        <RecommendationIcon icon={entry.icon} />
      </div>

      <h3 className="mb-2.5 font-serif text-[24px] font-normal leading-tight tracking-[-0.02em] text-ink">
        {entry.title}
      </h3>
      <p className="mb-auto text-[13px] leading-relaxed text-ink-soft">{entry.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-sand pt-4 font-mono text-[11px] text-ink-soft">
        <span>{entry.frequencyLabel}</span>
        <span
          className={`text-base transition-transform group-hover:translate-x-1 ${
            isApplied ? 'text-moss' : 'text-ink'
          }`}
        >
          {isApplied ? '✓' : '→'}
        </span>
      </div>
    </article>
  )
}
