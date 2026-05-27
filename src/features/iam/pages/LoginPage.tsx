import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { useAuth } from '../context/AuthContext'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email, password })
      const to = (location.state as LocationState | null)?.from?.pathname ?? '/'
      navigate(to, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message.includes('401') ? 'Credenciales inválidas' : message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,800px)_1fr]">
      {/* editorial column */}
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
          <h1 className="font-serif text-[96px] font-light leading-[0.92] tracking-[-0.035em]">
            Siéntate
            <br />
            <em className="not-italic font-light text-terracotta" style={{ fontStyle: 'italic' }}>
              como debe ser.
            </em>
          </h1>
          <p className="mt-9 max-w-[460px] font-serif text-lg font-light leading-relaxed text-sand-light">
            Pasas más horas sentado que durmiendo. Y mientras el cuerpo se acostumbra al hábito,
            tu columna lleva una contabilidad silenciosa de cada hora frente a la pantalla.
            SitRight observa esa contabilidad, la traduce en datos y te devuelve la postura
            antes de que el dolor lo haga por ti.
          </p>
        </div>
      </section>

      {/* form column */}
      <section className="flex flex-col bg-cream p-14">
        <header className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          <span>ES · Lima</span>
          <span>
            ¿Aún no tienes cuenta?{' '}
            <Link to="/register" className="border-b border-ink pb-0.5 text-ink">
              Crear acceso
            </Link>
          </span>
        </header>

        <div className="my-auto max-w-[420px]">
          <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.20em] text-terracotta">
            Inicio de sesión
          </div>
          <h2 className="mb-3 font-serif text-[56px] font-normal leading-[0.95] tracking-tight text-ink">
            Bienvenido
            <br />
            de vuelta.
          </h2>
          <p className="mb-12 max-w-[380px] text-[15px] text-ink-soft">
            Ingresa con tu correo institucional o personal. Tu sesión permanecerá activa en este
            navegador durante 12 horas.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                <span className="mr-2 text-terracotta">01</span>
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@correo.com"
                className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[17px] text-ink placeholder:italic placeholder:text-ink-faint focus:border-terracotta focus:outline-none"
              />
            </div>

            <div className="mb-5">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                <span className="mr-2 text-terracotta">02</span>
                Contraseña
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[17px] text-ink placeholder:italic placeholder:text-ink-faint focus:border-terracotta focus:outline-none"
              />
            </div>

            {error && (
              <p className="mt-2 border-l-2 border-terracotta bg-terracotta/10 px-3 py-2 text-xs text-terracotta-deep">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-9 flex w-full items-center justify-between bg-moss-deep px-7 py-5 text-[14px] font-medium uppercase tracking-[0.05em] text-cream transition-colors hover:bg-ink disabled:opacity-60"
            >
              <span>{submitting ? 'Verificando…' : 'Acceder al panel'}</span>
              <span aria-hidden className="text-base">→</span>
            </button>
          </form>

          <p className="mt-7 text-center text-[13px] text-ink-soft">
            ¿Eres administrador?{' '}
            <a href="#" className="border-b border-ink text-ink">
              Acceso restringido
            </a>
          </p>
        </div>

      </section>
    </div>
  )
}
