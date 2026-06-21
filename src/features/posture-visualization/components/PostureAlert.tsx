interface Props {
  onDismiss: () => void
}

export function PostureAlert({ onDismiss }: Props) {
  return (
    <div className="flex items-start gap-4 border-l-2 border-terracotta bg-terracotta/10 px-5 py-4">
      <span className="mt-0.5 text-[14px] font-semibold text-terracotta-deep">Atención</span>
      <div className="flex-1">
        <p className="text-lg font-semibold leading-tight text-terracotta-deep">
          Llevas más de 5 minutos en mala postura.
        </p>
        <p className="mt-1 text-[14px] text-ink-soft">
          Corrige tu postura ahora. Abajo tienes recomendaciones.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[13px] font-medium text-terracotta-deep hover:text-ink"
        aria-label="Cerrar aviso"
      >
        Cerrar ×
      </button>
    </div>
  )
}
