interface Props {
  onDismiss: () => void
}

export function BreakReminder({ onDismiss }: Props) {
  return (
    <div className="flex items-start gap-4 border-l-2 border-moss bg-moss/10 px-5 py-4">
      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-moss">
        Pausa
      </span>
      <div className="flex-1">
        <p className="font-serif text-lg leading-tight text-moss">
          Tiempo de pausa activa.
        </p>
        <p className="mt-1 text-[13px] text-ink-soft">
          Llevas 60 minutos con el chaleco. Levántate, estírate 5 minutos y vuelve con más energía.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="font-mono text-xs uppercase tracking-[0.16em] text-moss hover:text-ink"
        aria-label="Cerrar recordatorio"
      >
        Cerrar ×
      </button>
    </div>
  )
}
