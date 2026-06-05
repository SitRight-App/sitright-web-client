import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { useAuth } from '../context/AuthContext'

// Textura de ruido sutil para dar materialidad al panel de marca (sin esto la
// superficie se ve plana). Capa fija, sin eventos de puntero. Mismo patrón que
// el login para que ambas pantallas se sientan hermanas.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const ease = [0.16, 1, 0.3, 1] as const

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
            Comienza a moverte bien desde el primer día.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-cream-bone/70">
            Tres datos para abrir tu acceso. En pocos minutos vincularás tu
            chaleco y calibrarás tu postura de referencia.
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

          <p className="text-[13px] font-medium text-moss">Crear acceso</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Una cuenta, una columna
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            Tres datos para empezar. Podrás completar tu perfil en cualquier
            momento.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium text-ink">
                Nombre completo
              </label>
              <input
                id="name"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15"
              />
            </div>

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
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-ink">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15"
              />
              <p className="mt-1.5 text-[13px] text-ink-faint">Mínimo 8 caracteres</p>
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
              className="group flex w-full items-center justify-between gap-2 rounded-xl bg-moss py-3 pl-5 pr-3 text-[15px] font-semibold text-cream-bone shadow-sm transition hover:bg-moss-deep active:scale-[0.97] disabled:opacity-60"
            >
              <span>{submitting ? 'Creando…' : 'Crear cuenta'}</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream-bone/15 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-ink-soft">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-moss hover:text-moss-deep">
              Iniciar sesión
            </Link>
          </p>
        </motion.div>
      </section>
    </div>
  )
}
