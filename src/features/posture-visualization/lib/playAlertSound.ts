/**
 * US008 — reproduce un beep corto (~0.2 s) cuando se activa la alerta de
 * postura prolongada. Se genera con la Web Audio API (sin archivo de audio)
 * para mantenerlo liviano. Nunca lanza: si `AudioContext` no está disponible
 * (p. ej. bajo jsdom en tests, o navegadores viejos) simplemente no hace nada.
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
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(660, ctx.currentTime)

    // Envolvente rápida de ganancia (sube y baja) para evitar un "click" al
    // inicio/fin y que el beep dure aproximadamente 0.2 s.
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start(now)
    oscillator.stop(now + 0.2)

    oscillator.onended = () => {
      void ctx.close()
    }
  } catch {
    // No-op: el sonido es una mejora, nunca debe romper la app.
  }
}
