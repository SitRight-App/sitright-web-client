interface ScoreRingProps {
  /** 0-100, o null si no hay dato. */
  value: number | null
  size?: number
  thickness?: number
  /** Texto bajo el número. null o vacío → sin caption (modo compacto). */
  caption?: string | null
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
 * al centro. Tamaño grande en el encabezado del reporte; pequeño (sin caption)
 * como indicador por fila en el historial.
 */
export function ScoreRing({ value, size = 184, thickness, caption = 'Postura correcta' }: ScoreRingProps) {
  const stroke = thickness ?? (size > 90 ? 16 : Math.max(4, Math.round(size * 0.11)))
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  const colorVar = ringColorVar(value)
  const center = size / 2
  const numberFs = Math.round(size * (size > 90 ? 0.25 : 0.3))

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgb(var(--color-sand))"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={`rgb(var(${colorVar}))`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-semibold leading-none tracking-tight tabular-nums"
          style={{ fontSize: numberFs, color: `rgb(var(${colorVar}))` }}
        >
          {value == null ? '—' : `${Math.round(pct)}%`}
        </span>
        {caption && <span className="mt-1.5 text-[12px] font-medium text-ink-soft">{caption}</span>}
      </div>
    </div>
  )
}
