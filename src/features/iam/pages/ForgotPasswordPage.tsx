import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_520px] bg-cream">
      <aside
        className="hidden bg-moss-deep p-12 text-cream lg:flex lg:flex-col lg:justify-between"
        style={{
          backgroundImage:
            'radial-gradient(at 100% 0%, rgba(200,98,60,0.20), transparent 60%)',
        }}
      >
        <h1 className="font-serif text-[44px] font-semibold leading-tight tracking-tight">
          Recupera tu acceso<br />
          <em className="italic text-terracotta-soft">a SitRight.</em>
        </h1>
        <p className="max-w-md font-serif text-[17px] leading-relaxed text-cream/70">
          Introduce el correo con el que te registraste. Te enviaremos un enlace
          de recuperación válido por una hora.
        </p>
      </aside>

      <main className="flex flex-col justify-center px-10 py-16">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            <Link to="/login" className="hover:text-ink">← Volver al login</Link>
          </div>

          {sent ? (
            <div>
              <h2 className="font-serif text-3xl tracking-tight text-ink">
                Te hemos enviado las instrucciones <em className="italic text-moss">por correo.</em>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Si el correo está registrado, recibirás un enlace de recuperación
                en los próximos minutos. El enlace caduca en 1 hora.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-moss hover:underline"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="font-serif text-3xl tracking-tight text-ink">
                Olvidé mi <em className="italic text-moss">contraseña.</em>
              </h2>

              <label className="mt-7 mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                <span className="mr-2 text-terracotta">01</span>Correo registrado
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@ejemplo.com"
                className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[15px] text-ink placeholder:italic placeholder:text-ink-faint focus:border-terracotta focus:outline-none"
              />

              {error && (
                <p className="mt-3 text-xs text-terracotta-deep">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-8 w-full bg-moss-deep px-6 py-4 text-[13px] font-medium uppercase tracking-[0.05em] text-cream transition-colors hover:bg-ink disabled:opacity-60"
              >
                {submitting ? 'Enviando…' : 'Enviar instrucciones'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
