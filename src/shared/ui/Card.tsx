interface Props {
  title: string
  value: string
  subtitle?: string
  num?: string
  tone?: 'default' | 'dark' | 'alert'
}

export function StatCard({ title, value, subtitle, num, tone = 'default' }: Props) {
  const palette = {
    default: 'bg-cream-bone border border-sand text-ink',
    dark: 'bg-moss-deep border border-moss-deep text-cream',
    alert: 'bg-terracotta border border-terracotta-deep text-cream',
  }[tone]

  const labelColor = tone === 'default' ? 'text-ink-soft' : 'text-sand'

  return (
    <div className={`relative rounded-[4px] px-6 py-5 ${palette}`}>
      {num && <span className="num-tag absolute right-4 top-4">{num}</span>}
      <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${labelColor}`}>
        {title}
      </p>
      <p className="mt-3 font-serif text-3xl leading-none tracking-tight">{value}</p>
      {subtitle && (
        <p className={`mt-2 text-xs ${tone === 'default' ? 'text-ink-soft' : 'text-cream/70'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
