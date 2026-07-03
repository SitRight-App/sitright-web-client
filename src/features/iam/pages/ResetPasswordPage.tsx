import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { useToast } from '@/shared/ui/toast'
import { resetPassword } from '../services/authService'

/**
 * Pantalla del paso 2: el usuario llega desde el enlace del correo
 * (`/reset-password?token=...`), elige una nueva contraseña y la confirma.
 * Sin token, o si el backend rechaza el token (inválido/expirado), se muestra
 * el estado de "enlace inválido" con acceso a pedir uno nuevo.
 */

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const ease = [0.16, 1, 0.3, 1] as const

function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-moss-deep text-cream-bone lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60% 55% at 18% 12%, rgba(77,107,85,0.55) 0%, transparent 60%), radial-gradient(50% 50% at 92% 88%, rgba(200,98,60,0.20) 0%, transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(244,239,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(244,239,230,0.04) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />
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
          Elige tu nueva contraseña.
        </h1>
        <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-cream-bone/70">
          Ya casi está. Define una contraseña nueva y vuelve a entrar a SitRight.
        </p>
      </motion.div>
      <p className="relative font-mono text-[11px] uppercase tracking-[0.16em] text-cream-bone/40">
        SitRight · Lima · 2026
      </p>
    </section>
  )
}

function InvalidLink() {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_minmax(0,560px)]">
      <BrandPanel />
      <section className="flex items-center justify-center bg-cream px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <p className="text-[13px] font-medium text-terracotta-deep">Recuperación</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Este enlace no es válido o expiró
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            Los enlaces de recuperación caducan en 1 hora y solo se pueden usar una vez.
            Solicita uno nuevo para continuar.
          </p>
          <Link
            to="/forgot-password"
            className="mt-8 inline-block text-[14px] font-medium text-moss hover:text-moss-deep"
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      </section>
    </div>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkInvalid, setLinkInvalid] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      toast.success('Tu contraseña se actualizó', 'Ya puedes iniciar sesión.')
      navigate('/login')
    } catch {
      setLinkInvalid(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token || linkInvalid) {
    return <InvalidLink />
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_minmax(0,560px)]">
      <BrandPanel />
      <section className="flex items-center justify-center bg-cream px-6 py-12 sm:px-10">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-deep text-cream-bone">
              <Brandmark />
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink">SitRight</span>
          </div>

          <p className="text-[13px] font-medium text-moss">Recuperación</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Nueva contraseña
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            Elige una contraseña segura y confírmala.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-ink">
                Nueva contraseña
              </label>
              <input
                id="password"
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Al menos 8 caracteres"
                className="w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-[13px] font-medium text-ink">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
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
              className="group flex w-full items-center justify-between gap-2 rounded-xl bg-moss py-3 pl-5 pr-3 text-[15px] font-semibold text-cream-bone shadow-sm transition hover:bg-moss-deep active:scale-[0.97] disabled:opacity-60"
            >
              <span>{submitting ? 'Guardando…' : 'Guardar contraseña'}</span>
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
        </motion.div>
      </section>
    </div>
  )
}
