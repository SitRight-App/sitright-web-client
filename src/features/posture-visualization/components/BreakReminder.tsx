interface Props {
  onDismiss: () => void
}

export function BreakReminder({ onDismiss }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <span className="mt-0.5 text-lg">🧘</span>
      <div className="flex-1">
        <p className="font-semibold text-blue-700">Tiempo de pausa activa</p>
        <p className="mt-0.5 text-sm text-blue-600">
          Llevas 60 minutos usando el chaleco. Levántate, estírate 5 minutos y vuelve con más energía.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Cerrar recordatorio"
      >
        ✕
      </button>
    </div>
  )
}
