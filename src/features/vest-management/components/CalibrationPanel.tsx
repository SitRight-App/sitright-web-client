import { useRef, useState } from 'react'
import {
  getLatestRawReading,
  type LatestRawReading,
  type SensorTriple,
} from '@/features/posture-visualization/services/postureService'
import { useToast } from '@/shared/ui/toast'
import { useCalibrateVest } from '../hooks/useMyVest'

interface Props {
  vestId: string
  isCalibrated: boolean
  /** Fecha de la última calibración exitosa (ISO-8601), si existe. */
  calibratedAt?: string | null
}

const calibratedAtFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const CALIBRATION_SECONDS = 5
const SAMPLE_INTERVAL_MS = 500
// Si la magnitud del vector de aceleración varía más que esto
// entre la primera y la última muestra, asumimos movimiento significativo y
// cancelamos la calibración. ~0.5 g cubre cabeceo notable sin disparar con
// micro-oscilaciones normales.
const MOVEMENT_THRESHOLD_G = 0.5

type Phase = 'idle' | 'sampling' | 'submitting'

function averageTriples(samples: SensorTriple[]): SensorTriple {
  const n = samples.length || 1
  return {
    ax: samples.reduce((acc, s) => acc + s.ax, 0) / n,
    ay: samples.reduce((acc, s) => acc + s.ay, 0) / n,
    az: samples.reduce((acc, s) => acc + s.az, 0) / n,
  }
}

function magnitude(t: SensorTriple): number {
  return Math.sqrt(t.ax * t.ax + t.ay * t.ay + t.az * t.az)
}

function maxMagnitudeDeltaG(samples: LatestRawReading[]): number {
  if (samples.length < 2) return 0
  let maxDelta = 0
  for (const sensor of ['cervical', 'dorsal', 'lumbar'] as const) {
    const mags = samples.map((s) => magnitude(s[sensor]))
    const delta = Math.max(...mags) - Math.min(...mags)
    if (delta > maxDelta) maxDelta = delta
  }
  return maxDelta
}

export function CalibrationPanel({ vestId, isCalibrated, calibratedAt }: Props) {
  const calibrate = useCalibrateVest(vestId)
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(CALIBRATION_SECONDS)
  const samplingTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)

  function cleanupTimers() {
    if (samplingTimerRef.current !== null) {
      window.clearInterval(samplingTimerRef.current)
      samplingTimerRef.current = null
    }
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }

  async function handleCalibrate() {
    if (phase !== 'idle') return
    setPhase('sampling')
    setCountdown(CALIBRATION_SECONDS)

    const samples: LatestRawReading[] = []

    // Sampling: durante 5 segundos, intentar leer la última lectura cada 500 ms.
    // Si la lectura cambia, la añadimos. Esto cubre tanto el flujo de demo
    // (1 lectura cada 5 s = 1 sample) como un futuro modo de calibración del
    // firmware que envíe a mayor frecuencia.
    const seenIds = new Set<string>()

    async function takeSample() {
      try {
        const r = await getLatestRawReading()
        if (r && !seenIds.has(r.id)) {
          seenIds.add(r.id)
          samples.push(r)
        }
      } catch {
        /* lectura fallida — la ignoramos y reintentamos en el próximo tick */
      }
    }

    await takeSample()

    samplingTimerRef.current = window.setInterval(takeSample, SAMPLE_INTERVAL_MS)
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1))
    }, 1000)

    await new Promise((resolve) => window.setTimeout(resolve, CALIBRATION_SECONDS * 1000))

    cleanupTimers()
    await takeSample() // última muestra fuera del intervalo

    if (samples.length === 0) {
      toast.error(
        'No llegan datos del chaleco.',
        'Revisa que esté encendido antes de calibrar.',
      )
      setPhase('idle')
      return
    }

    // Detectar movimiento significativo
    const delta = maxMagnitudeDeltaG(samples)
    if (delta > MOVEMENT_THRESHOLD_G) {
      toast.error(
        'Movimiento detectado durante la calibración.',
        'Mantén la posición estable e intenta nuevamente.',
      )
      setPhase('idle')
      return
    }

    setPhase('submitting')
    try {
      await calibrate.mutateAsync({
        cervical: averageTriples(samples.map((s) => s.cervical)),
        dorsal: averageTriples(samples.map((s) => s.dorsal)),
        lumbar: averageTriples(samples.map((s) => s.lumbar)),
      })
      toast.success(
        'Calibración completada.',
        `Tu referencia postural quedó registrada (${samples.length} muestra${samples.length === 1 ? '' : 's'}).`,
      )
    } catch (err) {
      toast.error(
        'No se pudo guardar la calibración.',
        err instanceof Error ? err.message : 'Error desconocido',
      )
    } finally {
      setPhase('idle')
      setCountdown(CALIBRATION_SECONDS)
    }
  }

  return (
    <div>
      <div className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium">
        <span
          className={`h-1.5 w-1.5 rounded-full ${isCalibrated ? 'bg-moss' : 'bg-terracotta'}`}
        />
        <span className={isCalibrated ? 'text-moss' : 'text-terracotta-deep'}>
          {isCalibrated ? 'Calibrado' : 'Sin calibrar'}
        </span>
      </div>

      {isCalibrated && calibratedAt && (
        <p className="mb-4 text-[13px] text-ink-faint">
          Última calibración: {calibratedAtFmt.format(new Date(calibratedAt))}
        </p>
      )}

      <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">
        Siéntate bien erguido y quédate quieto {CALIBRATION_SECONDS} segundos. Guardaremos
        esa postura como tu referencia.
      </p>

      {phase === 'sampling' && (
        <p className="mt-3 text-[14px] font-semibold text-terracotta-deep">
          Mantén la posición… {countdown}s
        </p>
      )}

      <button
        type="button"
        onClick={handleCalibrate}
        disabled={phase !== 'idle'}
        className="mt-6 inline-flex items-center gap-3 bg-moss-deep px-6 py-3.5 text-[14px] font-semibold text-cream transition-colors hover:bg-ink disabled:opacity-60"
      >
        <span>
          {phase === 'sampling'
            ? 'Calibrando…'
            : phase === 'submitting'
              ? 'Guardando…'
              : isCalibrated
                ? 'Recalibrar ahora'
                : 'Calibrar ahora'}
        </span>
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}
