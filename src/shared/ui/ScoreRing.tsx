interface ScoreRingProps {
  /** 0-100, o null si no hay dato. */
  value: number | null
  size?: number
  thickness?: number
  caption?: string
}

/** Color del anillo según el nivel de postura correcta. */
function ringColorVar(value: number | null): string {
  if (value == null) return '--color-ink-faint'
  if (value >= 70) return '--color-moss'
  if (value >= 50) return '--color-amber'
  return '--color-terracotta'
}

/**
 * Anillo de score (donut SVG): muestra el % de postura correcta como arco
 * coloreado por nivel (verde ≥70, ámbar 50-69, terracota <50) con el número
 * grande al centro. Pieza protagonista del encabezado del reporte.
 */
export function ScoreRing({ value, size = 184, thickness = 16, caption = 'Postura correcta' }: ScoreRingProps) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  const colorVar = ringColorVar(value)
  const center = size / 2

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgb(var(--color-sand))"
          strokeWidth={thickness}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={`rgb(var(${colorVar}))`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="text-[46px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: `rgb(var(${colorVar}))` }}
        >
          {value == null ? '—' : `${Math.round(pct)}%`}
        </span>
        <span className="mt-1.5 text-[12px] font-medium text-ink-soft">{caption}</span>
      </div>
    </div>
  )
}
