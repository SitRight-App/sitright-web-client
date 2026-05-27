interface Props {
  value: number
  accent?: string
}

export function ConfidenceBar({ value, accent }: Props) {
  const percent = Math.round(value * 100)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-cream/65">
        <span>Confianza ML</span>
        <span className="text-cream">{percent}%</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden bg-cream/10">
        <div
          className={`h-full transition-all duration-500 ${accent ?? 'bg-cream'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
