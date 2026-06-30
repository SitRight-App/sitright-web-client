// src/features/session-history/components/ZoneDetailList.tsx
import type { SpineZone, ZoneDeviation } from '../types/session'
import { ZONE_LABELS, ZONE_ORDER, toneFor } from '../lib/zoneTone'
import { METRIC_LABELS, streakLabel } from '../lib/sessionCopy'

export function ZoneDetailList({ zones }: { zones: Record<SpineZone, ZoneDeviation> }) {
  const ordered = ZONE_ORDER.map((z) => ({ z, d: zones[z] })).sort(
    (a, b) => b.d.deviated_pct - a.d.deviated_pct,
  )
  return (
    <ul className="mt-5 space-y-2.5">
      {ordered.map(({ z, d }) => {
        const tone = toneFor(d.deviated_pct)
        const ok = tone === 'ok'
        return (
          <li
            key={z}
            className={`rounded-lg border px-4 py-3 ${ok ? 'border-sand bg-cream-bone' : 'border-terracotta/30 bg-terracotta/[0.06]'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[16px] font-semibold text-ink">{ZONE_LABELS[z]}</span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${ok ? 'bg-moss/12 text-moss' : 'bg-terracotta/15 text-terracotta-deep'}`}
              >
                {ok ? 'En rango' : 'Atención'}
              </span>
            </div>
            {ok ? (
              <p className="mt-1 text-[13px] text-ink-soft">Se mantuvo dentro de lo recomendado.</p>
            ) : (
              <dl className="mt-2 grid grid-cols-1 gap-1 text-[13px] text-ink-soft sm:grid-cols-2">
                <div className="flex justify-between gap-3 sm:block">
                  <dt>{METRIC_LABELS.deviatedPct}</dt>
                  <dd className="font-medium text-ink">{Math.round(d.deviated_pct)}%</dd>
                </div>
                <div className="flex justify-between gap-3 sm:block">
                  <dt>{METRIC_LABELS.avgAngle}</dt>
                  <dd className="font-medium text-ink">{Math.round(d.avg_angle_deg)}°</dd>
                </div>
                <div className="flex justify-between gap-3 sm:col-span-2 sm:block">
                  <dt>{METRIC_LABELS.longestStreak}</dt>
                  <dd className="font-medium text-ink">{streakLabel(d.longest_streak_min)}</dd>
                </div>
              </dl>
            )}
          </li>
        )
      })}
    </ul>
  )
}
