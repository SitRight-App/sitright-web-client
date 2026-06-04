import { useState, type FormEvent } from 'react'
import { Activity, History, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { useAuth } from '../context/AuthContext'

interface LocationState {
  from?: { pathname: string }
}

const VALUE_POINTS = [
  { Icon: Activity, text: 'Lectura de tu postura en tiempo real desde el chaleco.' },
  { Icon: Sparkles, text: 'Recomendaciones ergonómicas cuando te desvías.' },
  { Icon: History, text: 'Historial y evolución de cada jornada sentado.' },
]

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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Panel de marca — propuesta de valor concreta, no editorial */}
      <section className="relative hidden flex-col justify-between bg-moss-deep p-12 text-cream lg:flex xl:p-16">
        <header className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-cream/10">
            <Brandmark />
          </div>
          <span className="text-lg font-semibold tracking-tight">SitRight</span>
        </header>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            Tu postura, medida mientras trabajas.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-cream/70">
            El chaleco inteligente lee tu columna durante la jornada y el panel te
            devuelve, en vivo, qué corregir antes de que aparezca el dolor.
          </p>

          <ul className="mt-10 space-y-5">
            {VALUE_POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cream/10">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <span className="text-[14px] leading-relaxed text-cream/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/45">
          SitRight · Lima · 2026
        </p>
      </section>

      {/* Panel de formulario */}
      <section className="flex flex-col bg-cream px-6 py-10 sm:px-12 lg:px-16">
        <header className="flex items-center justify-end text-[14px] text-ink-soft">
          <span>
            ¿Aún no tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-moss hover:text-moss-deep">
              Crear acceso
            </Link>
          </span>
        </header>

        <div className="my-auto w-full max-w-[400px] py-10 sm:mx-auto">
          {/* Marca visible en móvil, donde el panel de marca se oculta */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-moss-deep text-cream">
              <Brandmark />
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink">SitRight</span>
          </div>

          <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Inicia sesión
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Ingresa con tu correo. Tu sesión seguirá activa en este navegador
            durante 12 horas.
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@correo.com"
                className="w-full rounded-lg border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
              />
            </div>

            <div className="mb-2">
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="block text-[13px] font-medium text-ink">
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[13px] text-ink-soft hover:text-moss"
                >
                  Olvidé mi contraseña
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-moss px-6 py-3.5 text-[15px] font-semibold text-cream-bone transition-colors hover:bg-moss-deep disabled:opacity-60"
            >
              <span>{submitting ? 'Verificando…' : 'Acceder al panel'}</span>
              {!submitting && (
                <span aria-hidden className="text-base">
                  →
                </span>
              )}
            </button>
          </form>

          <DemoCredentialsHint
            onUse={(creds) => {
              setEmail(creds.email)
              setPassword(creds.password)
            }}
          />
        </div>
      </section>
    </div>
  )
}

interface DemoCreds {
  label: string
  email: string
  password: string
}

const DEMO_CREDS: DemoCreds[] = [
  { label: 'Trabajador', email: 'demo@sitright.app', password: 'Demo1234!' },
  { label: 'Administrador', email: 'admin@sitright.app', password: 'Admin1234!' },
]

function DemoCredentialsHint({ onUse }: { onUse: (creds: DemoCreds) => void }) {
  return (
    <div className="mt-8 border-t border-sand pt-6">
      <p className="mb-3 text-[13px] font-medium text-ink-soft">¿Solo quieres probar?</p>
      <div className="flex flex-wrap gap-2.5">
        {DEMO_CREDS.map((c) => (
          <button
            key={c.email}
            type="button"
            onClick={() => onUse(c)}
            className="inline-flex items-center gap-2 rounded-lg border border-sand bg-cream-bone px-3.5 py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-moss hover:text-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            Entrar como {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
