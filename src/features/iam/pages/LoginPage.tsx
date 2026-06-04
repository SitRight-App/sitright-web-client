import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Activity, ArrowRight, History, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { useAuth } from '../context/AuthContext'

interface LocationState {
  from?: { pathname: string }
}

const VALUE_POINTS = [
  { Icon: Activity, text: 'Lee tu postura en tiempo real desde el chaleco.' },
  { Icon: Sparkles, text: 'Te avisa con ajustes ergonómicos cuando te desvías.' },
  { Icon: History, text: 'Guarda el historial y la evolución de cada jornada.' },
]

// Textura de ruido sutil para dar materialidad al panel de marca (sin esto la
// superficie se ve plana). Capa fija, sin eventos de puntero.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const ease = [0.16, 1, 0.3, 1] as const

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
        {/* Marca de agua: la propia columna-S, sangrando por el borde inferior */}
        <svg
          aria-hidden
          viewBox="0 0 48 48"
          className="pointer-events-none absolute -bottom-24 -right-16 h-[640px] w-[640px] text-cream-bone/[0.05]"
          fill="none"
        >
          <path
            d="M29 13 C 20.5 16, 20.5 22, 24 24.5 C 27.5 27, 27.5 33, 19 36"
            stroke="currentColor"
            strokeWidth={3.2}
            strokeLinecap="round"
          />
          <circle cx="29" cy="13" r="2.7" fill="currentColor" />
          <circle cx="24" cy="24.5" r="2.7" fill="currentColor" />
          <circle cx="19" cy="36" r="2.7" fill="currentColor" />
        </svg>

        <header className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-cream-bone/10 ring-1 ring-cream-bone/15">
            <Brandmark size={24} />
          </div>
          <span className="text-lg font-semibold tracking-tight">SitRight</span>
        </header>

        <motion.div
          className="relative max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-cream-bone/10 px-3 py-1 text-[12px] font-medium text-cream-bone/80 ring-1 ring-cream-bone/15">
            <span className="h-1.5 w-1.5 rounded-full bg-moss-soft" />
            Monitoreo postural en vivo
          </span>
          <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight xl:text-[56px]">
            Tu columna lleva la cuenta. Nosotros te la mostramos.
          </h1>
          <p className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-cream-bone/70">
            El chaleco inteligente mide tu postura durante la jornada y el panel
            te dice qué corregir, antes de que aparezca el dolor.
          </p>

          <ul className="mt-10 space-y-4">
            {VALUE_POINTS.map(({ Icon, text }, i) => (
              <motion.li
                key={text}
                className="flex items-center gap-3 text-[13px] text-cream-bone/80"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease, delay: 0.5 + i * 0.09 }}
              >
                <Icon className="h-4 w-4 shrink-0 text-moss-soft" strokeWidth={1.6} />
                {text}
              </motion.li>
            ))}
          </ul>
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

          <p className="text-[13px] font-medium text-moss">Panel SitRight</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Inicia sesión
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            Ingresa con tu correo. La sesión sigue activa en este navegador
            durante 12 horas.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div>
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
                className="w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="block text-[13px] font-medium text-ink">
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[13px] text-ink-soft transition-colors hover:text-moss"
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
              <span>{submitting ? 'Verificando…' : 'Acceder al panel'}</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream-bone/15 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </button>
          </form>

          <DemoCredentialsHint
            onUse={(creds) => {
              setEmail(creds.email)
              setPassword(creds.password)
            }}
          />

          <p className="mt-8 text-center text-[14px] text-ink-soft">
            ¿Aún no tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-moss hover:text-moss-deep">
              Crear acceso
            </Link>
          </p>
        </motion.div>
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
      <div className="grid grid-cols-2 gap-2.5">
        {DEMO_CREDS.map((c) => (
          <button
            key={c.email}
            type="button"
            onClick={() => onUse(c)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sand bg-cream-bone px-3.5 py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-moss hover:text-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
