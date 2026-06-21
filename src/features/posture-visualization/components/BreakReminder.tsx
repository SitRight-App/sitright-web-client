interface Props {
  onDismiss: () => void
}

export function BreakReminder({ onDismiss }: Props) {
  return (
    <div className="flex items-start gap-4 border-l-2 border-moss bg-moss/10 px-5 py-4">
      <span className="mt-0.5 text-[14px] font-semibold text-moss">Pausa</span>
      <div className="flex-1">
        <p className="text-lg font-semibold leading-tight text-moss">Tiempo de pausa activa.</p>
        <p className="mt-1 text-[14px] text-ink-soft">
          Llevas un buen rato sentado. Levántate y estírate unos minutos antes de continuar.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[13px] font-medium text-moss hover:text-ink"
        aria-label="Cerrar aviso"
      >
        Cerrar ×
      </button>
    </div>
  )
}
