import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { requestPasswordReset } from '../services/authService'

/**
 * HU-27 — pantalla de recuperación de contraseña.
 *
 * El backend responde el mismo mensaje haya o no cuenta asociada (AC2), por
 * lo que aquí solo necesitamos disparar la solicitud y mostrar el aviso
 * genérico de éxito. Si el correo era válido, el sistema enviará un enlace
 * con TTL de 1 h (AC3) — la entrega real queda como hook para el servicio
 * de email externo.
 */

// Textura de ruido sutil para dar materialidad al panel de marca. Mismo patrón
// que el login para que ambas pantallas se sientan hermanas. Sin eventos de
// puntero.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const ease = [0.16, 1, 0.3, 1] as const

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_minmax(0,560px)]">
      {/* ── Panel de marca: profundidad real (gradiente ambiental + ruido) ── */}
      <section className="relative hidden overflow-hidden bg-moss-deep text-cream-bone lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16">
        {/* Resplandor ambiental tintado en el propio verde + acento terracota */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(60% 55% at 18% 12%, rgba(77,107,85,0.55) 0%, transparent 60%), radial-gradient(50% 50% at 92% 88%, rgba(200,98,60,0.20) 0%, transparent 55%)',
          }}
        />
        {/* Cuadrícula muy tenue para estructura */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(244,239,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(244,239,230,0.04) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />
        {/* Grano */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{ backgroundImage: NOISE }}
        />

        <header className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cream-bone/10 ring-1 ring-cream-bone/15">
            <Brandmark />
          </div>
          <span className="text-lg font-semibold tracking-tight">SitRight</span>
        </header>

        <motion.div
          className="relative max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight xl:text-[52px]">
            Recupera tu acceso a SitRight.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-cream-bone/70">
            Introduce el correo con el que te registraste. Te enviaremos un
            enlace de recuperación válido por una hora.
          </p>
        </motion.div>

        <p className="relative font-mono text-[11px] uppercase tracking-[0.16em] text-cream-bone/40">
          SitRight · Lima · 2026
        </p>
      </section>

      {/* ── Panel de formulario ── */}
      <section className="flex items-center justify-center bg-cream px-6 py-12 sm:px-10">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          {/* Marca en móvil (el panel de marca se oculta) */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-deep text-cream-bone">
              <Brandmark />
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink">SitRight</span>
          </div>

          {sent ? (
            <div>
              <p className="text-[13px] font-medium text-moss">Recuperación</p>
              <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
                Te enviamos las instrucciones por correo
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                Si el correo está registrado, recibirás un enlace de
                recuperación en los próximos minutos. El enlace caduca en 1
                hora.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-block text-[14px] font-medium text-moss hover:text-moss-deep"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[13px] font-medium text-moss">Recuperación</p>
              <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
                Olvidé mi contraseña
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                Introduce el correo con el que te registraste y te enviaremos un
                enlace para restablecerla.
              </p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink">
                    Correo registrado
                  </label>
                  <input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@correo.com"
                    className="w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15"
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex w-full items-center justify-between gap-2 rounded-xl bg-moss py-3 pl-5 pr-3 text-[15px] font-semibold text-cream-bone shadow-sm transition-all hover:bg-moss-deep active:scale-[0.99] disabled:opacity-60"
                >
                  <span>{submitting ? 'Enviando…' : 'Enviar instrucciones'}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream-bone/15 transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                </button>
              </form>

              <p className="mt-8 text-center text-[14px] text-ink-soft">
                <Link to="/login" className="font-medium text-moss hover:text-moss-deep">
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </section>
    </div>
  )
}
