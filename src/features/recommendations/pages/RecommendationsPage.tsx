import { useMemo, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import {
  useAllRecommendations,
  useAppliedRecommendations,
  useMarkRecommendationApplied,
  useUnmarkRecommendationApplied,
} from '../hooks/useRecommendations'
import { RecommendationIcon } from '../components/RecommendationIcon'
import type {
  Recommendation,
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
  lumbar: 'bg-terracotta/[0.12] text-terracotta-deep border border-terracotta/30',
  cervical: 'bg-terracotta-soft/20 text-terracotta-deep border border-terracotta-soft',
  general: 'bg-moss/10 text-moss border border-moss/25',
}

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
})

interface DecoratedRecommendation extends Recommendation {
  applied: boolean
  appliedAt: string | null
}

function decorate(
  catalog: Recommendation[],
  appliedIds: Set<string>,
  appliedAtMap: Map<string, string>,
): DecoratedRecommendation[] {
  return catalog.map((r) => ({
    ...r,
    applied: appliedIds.has(r.id),
    appliedAt: appliedAtMap.get(r.id) ?? null,
  }))
}

function countByCategory(
  entries: DecoratedRecommendation[],
): Record<CategoryFilter, number> {
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
  const catalog = useAllRecommendations()
  const applied = useAppliedRecommendations()
  const mark = useMarkRecommendationApplied()
  const unmark = useUnmarkRecommendationApplied()

  const [category, setCategory] = useState<CategoryFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const allEntries = useMemo<DecoratedRecommendation[]>(() => {
    const appliedIds = new Set((applied.data ?? []).map((a) => a.recommendation_id))
    const appliedAtMap = new Map<string, string>()
    for (const a of applied.data ?? []) {
      appliedAtMap.set(a.recommendation_id, a.applied_at)
    }
    return decorate(catalog.data ?? [], appliedIds, appliedAtMap)
  }, [catalog.data, applied.data])

  const featured = useMemo(
    () => allEntries.find((r) => r.is_featured) ?? null,
    [allEntries],
  )

  const gridEntries = useMemo(
    () => allEntries.filter((r) => !r.is_featured),
    [allEntries],
  )

  const counts = useMemo(() => countByCategory(gridEntries), [gridEntries])
  const appliedCount = useMemo(() => gridEntries.filter((r) => r.applied).length, [
    gridEntries,
  ])

  const filtered = useMemo(() => {
    return gridEntries.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false
      if (status === 'applied' && !entry.applied) return false
      if (status === 'pending' && entry.applied) return false
      return true
    })
  }, [gridEntries, category, status])

  const handleToggle = (entry: DecoratedRecommendation) => {
    if (mark.isPending || unmark.isPending) return
    if (entry.applied) {
      unmark.mutate(entry.id)
    } else {
      mark.mutate(entry.id)
    }
  }

  const isLoading = catalog.isLoading || applied.isLoading
  const isError = catalog.isError

  return (
    <div>
      {/* Encabezado de sección: un único título display en font-semibold */}
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
        <div>
          <p className="label-mono">Recomendaciones</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight text-ink sm:text-[40px]">
            Pequeños gestos, columnas más sanas.
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            Aplicadas hoy
          </p>
          <div className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
            {appliedCount}{' '}
            <span className="text-ink-faint">/ {gridEntries.length}</span>
          </div>
        </div>
      </div>

      {isError && (
        <div className="mb-6 rounded-xl border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo obtener el catálogo de recomendaciones. Verifica que el backend esté disponible.
        </div>
      )}

      {isLoading && (
        <>
          <section className="mb-9 grid grid-cols-1 overflow-hidden rounded-xl border border-sand bg-cream-bone lg:grid-cols-[1.3fr_1fr]">
            <div className="bg-moss-deep p-8 lg:p-10">
              <Skeleton width="60%" height={12} className="bg-cream-bone/15" />
              <Skeleton width="80%" height={48} className="mt-5 bg-cream-bone/15" />
              <Skeleton width="60%" height={48} className="mt-2 bg-cream-bone/15" />
              <Skeleton width="100%" height={56} className="mt-6 bg-cream-bone/15" />
            </div>
            <div className="bg-cream-deep p-8 lg:p-10">
              <SkeletonTextLine width="40%" />
              <div className="mt-4 space-y-3.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height={36} />
                ))}
              </div>
            </div>
          </section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="min-h-[360px]">
                <div className="mb-6 flex items-start justify-between">
                  <SkeletonTextLine width={48} />
                  <Skeleton width={64} height={16} pill />
                </div>
                <Skeleton width={80} height={80} circle className="mb-5" />
                <Skeleton width="80%" height={24} />
                <Skeleton width="60%" height={24} className="mt-2" />
                <Skeleton width="100%" height={36} className="mt-3" />
              </SkeletonCard>
            ))}
          </div>
        </>
      )}

      {featured && (
        <FeaturedHero
          featured={featured}
          onMark={() => mark.mutate(featured.id)}
          onUnmark={() => unmark.mutate(featured.id)}
          isMutating={mark.isPending || unmark.isPending}
        />
      )}

      {gridEntries.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <span className="mr-1 label-mono">Categoría</span>
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                category === cat
                  ? 'border-moss bg-moss text-cream-bone'
                  : 'border-sand bg-cream-bone text-ink-soft hover:border-moss hover:text-ink'
              }`}
            >
              {CATEGORY_LABELS[cat]} · {counts[cat]}
            </button>
          ))}
          <span className="ml-4 mr-1 label-mono">Estado</span>
          {(['pending', 'applied'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(status === s ? 'all' : s)}
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                status === s
                  ? 'border-moss bg-moss text-cream-bone'
                  : 'border-sand bg-cream-bone text-ink-soft hover:border-moss hover:text-ink'
              }`}
            >
              {s === 'pending'
                ? `Pendientes · ${gridEntries.length - appliedCount}`
                : `Aplicadas · ${appliedCount}`}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <RecommendationCard
            key={entry.id}
            entry={entry}
            onToggle={() => handleToggle(entry)}
            disabled={mark.isPending || unmark.isPending}
          />
        ))}
        {!isLoading && filtered.length === 0 && !isError && (
          <div className="editorial-card col-span-full p-10 text-center sm:p-14">
            <p className="label-mono">Sin resultados</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
              No hay recomendaciones en este filtro.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Ajustá los filtros de categoría o estado.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface FeaturedHeroProps {
  featured: DecoratedRecommendation
  onMark: () => void
  onUnmark: () => void
  isMutating: boolean
}

function FeaturedHero({ featured, onMark, onUnmark, isMutating }: FeaturedHeroProps) {
  const titleEmphasis = featured.featured_title_emphasis ?? ''
  const titleMain = featured.title.replace(titleEmphasis, '').trim()

  return (
    <section className="mb-9 grid grid-cols-1 overflow-hidden rounded-xl border border-sand bg-cream-bone lg:grid-cols-[1.3fr_1fr]">
      {/* Panel de marca: verde plano sin blobs decorativos */}
      <div className="bg-moss-deep p-8 text-cream-bone lg:p-10">
        {featured.featured_tagline && (
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-cream-bone/60">
            {featured.featured_tagline}
          </p>
        )}
        <h2 className="mb-5 text-[34px] font-semibold leading-tight tracking-tight sm:text-[44px]">
          {titleMain || featured.title}
          {titleEmphasis && (
            <>
              {' '}
              <span className="text-terracotta-soft">{titleEmphasis}</span>
            </>
          )}
        </h2>
        {featured.featured_body && (
          <p className="mb-8 max-w-[460px] text-[15px] leading-relaxed text-cream-bone/75">
            {featured.featured_body}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {featured.applied ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-xl border border-cream-bone/25 bg-cream-bone/10 px-5 py-3 text-[15px] font-semibold text-cream-bone">
                ✓ Aplicada{featured.appliedAt && ` · ${timeFmt.format(new Date(featured.appliedAt))}`}
              </span>
              <button
                type="button"
                onClick={onUnmark}
                disabled={isMutating}
                className="inline-flex items-center gap-2 rounded-xl border border-cream-bone/30 bg-transparent px-5 py-3 text-[15px] font-semibold text-cream-bone transition-all hover:border-cream-bone active:scale-[0.99] disabled:opacity-50"
              >
                Desmarcar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onMark}
              disabled={isMutating}
              className="inline-flex items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-[15px] font-semibold text-cream-bone transition-all hover:bg-terracotta-deep active:scale-[0.99] disabled:opacity-50"
            >
              {isMutating ? 'Marcando…' : 'Marcar como aplicada'}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-cream-deep p-8 lg:p-10">
        <p className="mb-5 label-mono">
          Pasos · ≈ {featured.steps.length * 22} segundos
        </p>
        <ol className="space-y-0">
          {featured.steps.map((step, i) => (
            <li
              key={i}
              className={`grid grid-cols-[32px_1fr] gap-4 py-4 ${
                i < featured.steps.length - 1 ? 'border-b border-sand' : ''
              }`}
            >
              <span className="font-mono text-[15px] font-semibold tabular-nums leading-snug text-terracotta-deep">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-[14px] leading-relaxed text-ink">{step.body}</p>
                <span className="mt-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  {step.meta}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

interface CardProps {
  entry: DecoratedRecommendation
  onToggle: () => void
  disabled: boolean
}

function RecommendationCard({ entry, onToggle, disabled }: CardProps) {
  const category = entry.category as RecommendationCategory
  const isApplied = entry.applied
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`group relative flex min-h-[360px] flex-col rounded-xl border p-7 text-left transition-all hover:-translate-y-0.5 hover:border-moss disabled:opacity-60 ${
        isApplied
          ? 'border-moss/30 bg-moss/[0.05]'
          : 'border-sand bg-cream-bone'
      }`}
    >
      <div className="mb-6 flex items-start justify-end">
        <span
          className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
            isApplied
              ? 'border border-moss/30 bg-moss/15 text-moss'
              : TAG_STYLES[category] ?? TAG_STYLES.general
          }`}
        >
          {isApplied ? 'Aplicada hoy' : CATEGORY_LABELS[category] ?? 'General'}
        </span>
      </div>

      <div
        className={`mb-5 grid h-16 w-16 place-items-center rounded-xl border ${
          isApplied
            ? 'border-moss/25 bg-moss/[0.08] text-moss'
            : 'border-sand bg-cream text-moss'
        }`}
      >
        <RecommendationIcon icon={entry.icon} />
      </div>

      <h3 className="mb-2.5 text-[22px] font-semibold leading-tight tracking-tight text-ink">
        {entry.title}
      </h3>
      <p className="mb-auto text-[14px] leading-relaxed text-ink-soft">{entry.description}</p>

      <div className="mt-5 flex items-center justify-between border-t border-sand pt-4 font-mono text-[11px] text-ink-soft">
        <span>
          {isApplied && entry.appliedAt
            ? `Aplicada · ${timeFmt.format(new Date(entry.appliedAt))}`
            : entry.frequency_label}
        </span>
        {isApplied ? (
          <Check className="h-4 w-4 text-moss" strokeWidth={1.5} />
        ) : (
          <ArrowRight
            className="h-4 w-4 text-ink transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        )}
      </div>
    </button>
  )
}
