interface Props {
  onDismiss: () => void
}

export function PostureAlert({ onDismiss }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <span className="mt-0.5 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="font-semibold text-red-700">
          Llevas más de 5 minutos en postura inadecuada
        </p>
        <p className="mt-0.5 text-sm text-red-600">
          Corrige tu postura ahora. Puedes apoyarte en las recomendaciones de abajo.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors"
        aria-label="Cerrar alerta"
      >
        ✕
      </button>
    </div>
  )
}
