import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setSubmitting(true)
    try {
      await register({ email, password, name })
      navigate('/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message.includes('409') ? 'Este correo ya está registrado.' : message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,800px)_1fr]">
      <section className="relative hidden flex-col overflow-hidden bg-moss-deep p-14 text-cream lg:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(at 20% 80%, rgba(200,98,60,0.15) 0%, transparent 55%), radial-gradient(at 80% 20%, rgba(77,107,85,0.30) 0%, transparent 50%)',
          }}
        />
        <header className="relative flex items-center gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-cream/80">
            <Brandmark />
          </div>
          <div className="font-serif text-[22px] tracking-wide">SitRight</div>
        </header>

        <div className="relative mb-auto mt-32">
          <h1 className="font-serif text-[88px] font-light leading-[0.92] tracking-[-0.035em]">
            Comienza
            <br />
            <em className="font-light text-terracotta">a moverte bien.</em>
          </h1>
          <p className="mt-9 max-w-[460px] font-serif text-lg font-light leading-relaxed text-sand-light">
            Tu columna ya está llevando la contabilidad. Sumá tu cuenta y empezá a verla en
            tiempo real: tres datos para abrir el acceso, y en pocos minutos vincularás tu
            chaleco y calibrarás tu postura de referencia.
          </p>
        </div>
      </section>

      <section className="flex flex-col bg-cream p-14">
        <header className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          <span>ES · Lima</span>
          <span>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="border-b border-ink pb-0.5 text-ink">
              Iniciar sesión
            </Link>
          </span>
        </header>

        <div className="my-auto max-w-[420px]">
          <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.20em] text-terracotta">
            Crear acceso
          </div>
          <h2 className="mb-3 font-serif text-[48px] font-semibold leading-[0.95] tracking-tight text-ink">
            Una cuenta,
            <br />
            una columna.
          </h2>
          <p className="mb-10 max-w-[380px] text-[15px] text-ink-soft">
            Tres datos para empezar. Podrás completar tu perfil en cualquier momento.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                <span className="mr-2 text-terracotta">01</span> Nombre completo
              </label>
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[17px] text-ink focus:border-terracotta focus:outline-none"
              />
            </div>
            <div className="mb-5">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                <span className="mr-2 text-terracotta">02</span> Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[17px] text-ink focus:border-terracotta focus:outline-none"
              />
            </div>
            <div className="mb-5">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                <span className="mr-2 text-terracotta">03</span> Contraseña
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[17px] text-ink focus:border-terracotta focus:outline-none"
              />
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                Mínimo 8 caracteres
              </p>
            </div>

            {error && (
              <p className="mt-2 border-l-2 border-terracotta bg-terracotta/10 px-3 py-2 text-xs text-terracotta-deep">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 flex w-full items-center justify-between bg-moss-deep px-7 py-5 text-[14px] font-medium uppercase tracking-[0.05em] text-cream transition-colors hover:bg-ink disabled:opacity-60"
            >
              <span>{submitting ? 'Creando…' : 'Crear cuenta'}</span>
              <span aria-hidden className="text-base">→</span>
            </button>
          </form>
        </div>

      </section>
    </div>
  )
}
