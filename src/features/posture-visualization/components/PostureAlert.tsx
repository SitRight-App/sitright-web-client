interface Props {
  onDismiss: () => void
}

export function PostureAlert({ onDismiss }: Props) {
  return (
    <div className="flex items-start gap-4 border-l-2 border-terracotta bg-terracotta/10 px-5 py-4">
      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-terracotta-deep">
        Alerta
      </span>
      <div className="flex-1">
        <p className="font-serif text-lg leading-tight text-terracotta-deep">
          Llevas más de 5 minutos en postura inadecuada.
        </p>
        <p className="mt-1 text-[13px] text-ink-soft">
          Corrige tu postura ahora. Puedes apoyarte en las recomendaciones de abajo.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="font-mono text-xs uppercase tracking-[0.16em] text-terracotta-deep hover:text-ink"
        aria-label="Cerrar alerta"
      >
        Cerrar ×
      </button>
    </div>
  )
}
