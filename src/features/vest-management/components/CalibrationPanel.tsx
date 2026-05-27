import { useState } from 'react'
import { useCalibrateVest } from '../hooks/useMyVest'

interface Props {
  vestId: string
  isCalibrated: boolean
}

export function CalibrationPanel({ vestId, isCalibrated }: Props) {
  const calibrate = useCalibrateVest(vestId)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleCalibrate() {
    setError(null)
    setDone(false)
    try {
      const reference = { ax: 0, ay: 0, az: -1 }
      await calibrate.mutateAsync({
        cervical: reference,
        dorsal: reference,
        lumbar: reference,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <div>
      <div className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${isCalibrated ? 'bg-moss' : 'bg-terracotta'}`}
        />
        <span className={isCalibrated ? 'text-moss' : 'text-terracotta-deep'}>
          {isCalibrated ? 'Calibrado' : 'Sin calibrar'}
        </span>
      </div>

      <p className="max-w-md text-sm leading-relaxed text-ink-soft">
        Coloca el chaleco sobre el trabajador en posición erguida ideal antes de calibrar. La
        lectura actual quedará registrada como referencia para detectar desviaciones.
      </p>

      {error && (
        <p className="mt-4 border-l-2 border-terracotta bg-terracotta/10 px-3 py-2 text-xs text-terracotta-deep">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-4 border-l-2 border-moss bg-moss/10 px-3 py-2 text-xs text-moss">
          Calibración registrada correctamente.
        </p>
      )}

      <button
        type="button"
        onClick={handleCalibrate}
        disabled={calibrate.isPending}
        className="mt-6 inline-flex items-center gap-3 bg-moss-deep px-6 py-3.5 text-[13px] font-medium uppercase tracking-[0.05em] text-cream transition-colors hover:bg-ink disabled:opacity-60"
      >
        <span>{calibrate.isPending ? 'Calibrando…' : 'Calibrar ahora'}</span>
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}
