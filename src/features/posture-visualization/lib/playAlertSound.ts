/**
 * US008 — reproduce un aviso sonoro insistente (~7 s) cuando se activa la
 * alerta de postura prolongada: 15 repeticiones de un doble-beep (880/660 Hz)
 * con onda cuadrada, a modo de alarma, con la Web Audio API (sin
 * archivo de audio), para que sea difícil de ignorar. Nunca lanza: si
 * `AudioContext` no está disponible (jsdom en tests o navegadores viejos)
 * simplemente no hace nada.
 */

type AudioContextCtor = typeof AudioContext

interface WindowWithWebkitAudio {
  webkitAudioContext?: AudioContextCtor
}

export function playAlertSound(): void {
  try {
    const Ctx: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as WindowWithWebkitAudio).webkitAudioContext

    if (!Ctx) return

    const ctx = new Ctx()
    const start = ctx.currentTime

    // Patrón insistente: repeticiones de un doble-beep (agudo-grave), tipo
    // alarma. Se construye por repetición para que se note bien.
    const CYCLES = 15
    const CYCLE_DUR = 0.48
    const tones: { freq: number; at: number; dur: number }[] = []
    for (let i = 0; i < CYCLES; i++) {
      const base = i * CYCLE_DUR
      tones.push({ freq: 880, at: base, dur: 0.14 })
      tones.push({ freq: 660, at: base + 0.18, dur: 0.14 })
    }

    let lastOsc: OscillatorNode | null = null
    for (const t of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      // 'square' es la más chillona/penetrante (timbre de alarma).
      osc.type = 'square'
      const t0 = start + t.at
      osc.frequency.setValueAtTime(t.freq, t0)
      // Envolvente rápida (evita "clicks") con pico alto para que se oiga fuerte.
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.5, t0 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + t.dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + t.dur)
      lastOsc = osc
    }

    // Cierra el contexto cuando termina el último tono.
    if (lastOsc) {
      lastOsc.onended = () => {
        void ctx.close()
      }
    }
  } catch {
    // No-op: el sonido es una mejora, nunca debe romper la app.
  }
}
