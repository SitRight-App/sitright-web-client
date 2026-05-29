import { useToast } from '@/shared/ui/toast'
import { useCalibrateVest } from '../hooks/useMyVest'

interface Props {
  vestId: string
  isCalibrated: boolean
}

export function CalibrationPanel({ vestId, isCalibrated }: Props) {
  const calibrate = useCalibrateVest(vestId)
  const toast = useToast()

  async function handleCalibrate() {
    try {
      const reference = { ax: 0, ay: 0, az: -1 }
      await calibrate.mutateAsync({
        cervical: reference,
        dorsal: reference,
        lumbar: reference,
      })
      toast.success('Calibración registrada.', 'Los sensores tomaron tu postura de referencia.')
    } catch (err) {
      toast.error(
        'No se pudo calibrar el chaleco.',
        err instanceof Error ? err.message : 'Error desconocido',
      )
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
