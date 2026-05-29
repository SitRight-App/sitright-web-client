import { useMemo, useState } from 'react'
import { useAllRecommendations } from '../hooks/useRecommendations'
import { RecommendationIcon } from '../components/RecommendationIcon'
import type {
  Recommendation,
  RecommendationCategory,
} from '../types/recommendation'

type CategoryFilter = 'all' | RecommendationCategory

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'Todas',
  lumbar: 'Lumbar',
  cervical: 'Cervical',
  general: 'Generales',
}

const TAG_STYLES: Record<RecommendationCategory, string> = {
  lumbar: 'bg-terracotta/[0.12] text-terracotta-deep border border-terracotta/30',
  cervical: 'bg-terracotta-soft/20 text-terracotta-deep border border-terracotta-soft',
  general: 'bg-moss/10 text-moss border border-moss/25',
}

function countByCategory(entries: Recommendation[]): Record<CategoryFilter, number> {
  const counts: Record<CategoryFilter, number> = {
    all: entries.length,
    lumbar: 0,
    cervical: 0,
    general: 0,
  }
  for (const entry of entries) {
    if (entry.category in counts) {
      counts[entry.category as RecommendationCategory]++
    }
  }
  return counts
}

export function RecommendationsPage() {
  const { data, isLoading, isError } = useAllRecommendations()
  const [category, setCategory] = useState<CategoryFilter>('all')

  const allEntries = data ?? []

  const featured = useMemo(
    () => allEntries.find((r) => r.is_featured) ?? null,
    [allEntries],
  )

  const gridEntries = useMemo(
    () => allEntries.filter((r) => !r.is_featured),
    [allEntries],
  )

  const counts = useMemo(() => countByCategory(gridEntries), [gridEntries])

  const filtered = useMemo(() => {
    if (category === 'all') return gridEntries
    return gridEntries.filter((entry) => entry.category === category)
  }, [gridEntries, category])

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
          Catálogo de recomendaciones
          <div className="mt-1.5 font-serif text-3xl normal-case tracking-tight text-ink">
            {gridEntries.length} <span className="text-ink-faint">disponibles</span>
          </div>
        </div>
      </div>

      {isError && (
        <div className="mb-6 border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo obtener el catálogo de recomendaciones. Verifica que el backend esté disponible.
        </div>
      )}

      {isLoading && (
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">
          Cargando catálogo…
        </p>
      )}

      {/* Hero — featured recommendation */}
      {featured && <FeaturedHero featured={featured} />}

      {/* Filter row */}
      {gridEntries.length > 0 && (
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
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <RecommendationCard key={entry.id} entry={entry} />
        ))}
        {!isLoading && filtered.length === 0 && !isError && (
          <div className="col-span-full border border-dashed border-sand p-10 text-center">
            <p className="font-serif text-2xl tracking-tight text-ink">
              No hay recomendaciones en este filtro.
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Ajustá los filtros de categoría.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface FeaturedHeroProps {
  featured: Recommendation
}

function FeaturedHero({ featured }: FeaturedHeroProps) {
  const titleEmphasis = featured.featured_title_emphasis ?? ''
  const titleMain = featured.title.replace(titleEmphasis, '').trim()

  return (
    <section className="mb-9 grid grid-cols-1 overflow-hidden rounded-md border border-sand bg-cream lg:grid-cols-[1.3fr_1fr]">
      <div
        className="relative p-9 lg:p-10 text-cream"
        style={{
          backgroundColor: 'rgb(var(--color-moss-deep))',
          backgroundImage:
            'radial-gradient(at 100% 0%, rgba(200,98,60,0.18), transparent 60%), radial-gradient(at 0% 100%, rgba(77,107,85,0.30), transparent 50%)',
        }}
      >
        {featured.featured_tagline && (
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.20em] text-terracotta-soft">
            <span className="inline-block h-px w-7 bg-terracotta-soft" />
            {featured.featured_tagline}
          </div>
        )}
        <h2 className="mb-5 font-serif text-[52px] font-light leading-[0.98] tracking-[-0.03em]">
          {titleMain || featured.title}
          {titleEmphasis && (
            <>
              <br />
              <em className="italic font-light text-terracotta-soft">{titleEmphasis}</em>
            </>
          )}
        </h2>
        {featured.featured_body && (
          <p className="mb-7 max-w-[460px] font-serif text-[15px] font-light leading-relaxed text-cream/80">
            {featured.featured_body}
          </p>
        )}
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
          Pasos · ≈ {featured.steps.length * 22} segundos
        </div>
        <ol className="space-y-0">
          {featured.steps.map((step, i) => (
            <li
              key={i}
              className={`grid grid-cols-[36px_1fr] gap-3.5 py-3.5 ${
                i < featured.steps.length - 1
                  ? 'border-b border-dashed border-sand'
                  : ''
              }`}
            >
              <span className="font-serif text-[22px] leading-none text-terracotta-deep">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-[13px] leading-snug text-ink">{step.body}</p>
                <em className="mt-1 block font-mono text-[10px] uppercase not-italic tracking-[0.10em] text-ink-faint">
                  {step.meta}
                </em>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

interface CardProps {
  entry: Recommendation
}

function RecommendationCard({ entry }: CardProps) {
  const category = entry.category as RecommendationCategory
  return (
    <article className="group relative flex min-h-[360px] cursor-pointer flex-col rounded-md border border-sand bg-cream-bone p-6 transition-all hover:-translate-y-0.5 hover:border-ink">
      <div className="mb-6 flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {entry.number}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${TAG_STYLES[category] ?? TAG_STYLES.general}`}
        >
          {CATEGORY_LABELS[category] ?? 'General'}
        </span>
      </div>

      <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border border-sand bg-cream text-moss">
        <RecommendationIcon icon={entry.icon} />
      </div>

      <h3 className="mb-2.5 font-serif text-[24px] font-normal leading-tight tracking-[-0.02em] text-ink">
        {entry.title}
      </h3>
      <p className="mb-auto text-[13px] leading-relaxed text-ink-soft">{entry.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-sand pt-4 font-mono text-[11px] text-ink-soft">
        <span>{entry.frequency_label}</span>
        <span className="text-base text-ink transition-transform group-hover:translate-x-1">→</span>
      </div>
    </article>
  )
}
