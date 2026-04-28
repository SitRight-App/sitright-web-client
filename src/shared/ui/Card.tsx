interface Props {
  title: string
  value: string
  subtitle?: string
}

export function StatCard({ title, value, subtitle }: Props) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  )
}
