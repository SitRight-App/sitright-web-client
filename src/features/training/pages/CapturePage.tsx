import { useEffect, useState } from 'react'
import { apiErrorMessage } from '@/shared/api/client'
import { useToast } from '@/shared/ui/toast'
import {
  type CaptureStats,
  type SampleIn,
  downloadDataset,
  getCaptureStats,
  getLatestRaw,
  saveSamples,
  tripleToArray,
} from '../services/trainingService'

const RECORD_SECONDS = 30
const POLL_MS = 400

const LABELS: { key: string; title: string; hint: string }[] = [
  { key: 'neutral', title: 'Neutra (referencia)', hint: 'Sentado erguido y relajado' },
  { key: 'adequate', title: 'Adecuada', hint: 'Postura correcta de trabajo' },
  { key: 'forward_slouch', title: 'Encorvado', hint: 'Inclinado hacia adelante' },
  { key: 'excessive_recline', title: 'Reclinado', hint: 'Recostado hacia atrás' },
]

type Phase = 'idle' | 'recording' | 'saving'

export function CapturePage() {
  const toast = useToast()
  const [subject, setSubject] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(RECORD_SECONDS)
  const [count, setCount] = useState(0)
  const [stats, setStats] = useState<CaptureStats | null>(null)

  async function loadStats() {
    try {
      setStats(await getCaptureStats())
    } catch {
      /* no bloqueante */
    }
  }

  useEffect(() => {
    void loadStats()
  }, [])

  async function record(label: string) {
    if (phase !== 'idle') return
    if (!subject.trim()) {
      toast.error('Falta el sujeto.', 'Ingresá un identificador antes de grabar.')
      return
    }
    setPhase('recording')
    setActiveLabel(label)
    setCount(0)
    setCountdown(RECORD_SECONDS)

    const seen = new Set<string>()
    const collected: SampleIn[] = []

    async function poll() {
      try {
        const r = await getLatestRaw()
        if (r && !seen.has(r.id)) {
          seen.add(r.id)
          collected.push({
            subject: subject.trim(),
            label,
            cervical: tripleToArray(r.cervical),
            dorsal: tripleToArray(r.dorsal),
            lumbar: tripleToArray(r.lumbar),
          })
          setCount(collected.length)
        }
      } catch {
        /* lectura fallida — reintenta en el próximo tick */
      }
    }

    await poll()
    const pollTimer = window.setInterval(poll, POLL_MS)
    const cdTimer = window.setInterval(
      () => setCountdown((c) => Math.max(0, c - 1)),
      1000,
    )
    await new Promise((resolve) => window.setTimeout(resolve, RECORD_SECONDS * 1000))
    window.clearInterval(pollTimer)
    window.clearInterval(cdTimer)
    await poll()

    setPhase('saving')
    try {
      if (collected.length === 0) {
        toast.error('No llegaron lecturas.', 'Revisá que el chaleco esté encendido y enviando.')
      } else {
        const { saved } = await saveSamples(collected)
        toast.success(`Guardadas ${saved} muestras.`, `${label} · sujeto ${subject.trim()}`)
        await loadStats()
      }
    } catch (err) {
      toast.error('No se pudieron guardar las muestras.', apiErrorMessage(err))
    } finally {
      setPhase('idle')
      setActiveLabel(null)
    }
  }

  async function handleDownload() {
    try {
      await downloadDataset()
    } catch (err) {
      toast.error('No se pudo descargar el dataset.', apiErrorMessage(err))
    }
  }

  const busy = phase !== 'idle'

  return (
    <div>
      <div className="pb-6">
        <p className="text-[14px] text-ink-soft">Modo investigación</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Captura de datos</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Registro etiquetado de posturas para construir el dataset del modelo. Ingresá un
          identificador de participante, pedile que mantenga cada postura y grabá {RECORD_SECONDS} s.
          Esta sección solo es visible para cuentas administradoras.
        </p>
      </div>

      <div className="editorial-card p-6">
        <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-ink-faint">
          Participante
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={busy}
          placeholder="p. ej. P01"
          className="w-full max-w-xs rounded-lg border border-sand bg-cream-bone px-3 py-2.5 text-[15px] text-ink outline-none focus:border-moss disabled:opacity-60"
        />

        {phase === 'recording' && (
          <p className="mt-4 text-[14px] font-semibold text-terracotta-deep">
            Grabando «{activeLabel}»… {countdown}s · {count} muestras
          </p>
        )}
        {phase === 'saving' && (
          <p className="mt-4 text-[14px] font-semibold text-ink-soft">Guardando…</p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LABELS.map(({ key, title, hint }) => (
            <button
              key={key}
              type="button"
              onClick={() => record(key)}
              disabled={busy}
              className="flex flex-col items-start rounded-lg border border-sand bg-cream-bone px-4 py-3 text-left transition-colors hover:border-moss disabled:opacity-50"
            >
              <span className="text-[15px] font-semibold text-ink">{title}</span>
              <span className="mt-0.5 text-[12px] text-ink-soft">{hint}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
          Nota: el chaleco envía cada 5 s, así que en {RECORD_SECONDS} s se juntan pocas muestras.
          Para capturar más rápido, bajá temporalmente el intervalo del firmware y volvé a subirlo al terminar.
        </p>
      </div>

      <div className="editorial-card mt-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label-mono">Dataset acumulado</p>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg border border-ink bg-transparent px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            Descargar CSV
          </button>
        </div>
        <p className="mt-3 text-[28px] font-semibold leading-none tabular-nums text-ink">
          {stats?.total ?? 0}
          <span className="ml-2 text-[14px] font-normal text-ink-soft">muestras</span>
        </p>
        {stats && Object.keys(stats.by_label).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(stats.by_label).map(([label, n]) => (
              <span
                key={label}
                className="rounded-full border border-sand bg-cream-bone px-3 py-1 text-[12px] text-ink-soft"
              >
                {label}: <span className="font-semibold text-ink tabular-nums">{n}</span>
              </span>
            ))}
          </div>
        )}
        {stats && Object.keys(stats.by_subject).length > 0 && (
          <p className="mt-3 text-[12px] text-ink-faint">
            Participantes: {Object.keys(stats.by_subject).length}
          </p>
        )}
      </div>
    </div>
  )
}
