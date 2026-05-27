import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateMe } from '../services/authService'

function FormField({
  num,
  label,
  children,
}: {
  num: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        <span className="mr-2 text-terracotta">{num}</span>
        {label}
      </label>
      {children}
    </div>
  )
}

const fieldInput =
  'w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[15px] text-ink placeholder:italic placeholder:text-ink-faint focus:border-terracotta focus:outline-none'

export function SettingsPage() {
  const { user, setUser, logout } = useAuth()
  const [name, setName] = useState('')
  const [weight, setWeight] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [alertThreshold, setAlertThreshold] = useState<number>(30)
  const [language, setLanguage] = useState('es')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setWeight(user.anthropometric_data.weight_kg?.toString() ?? '')
    setHeight(user.anthropometric_data.height_cm?.toString() ?? '')
    setEmailNotifications(user.preferences.email_notifications)
    setAlertThreshold(user.preferences.alert_threshold_minutes)
    setLanguage(user.preferences.language)
  }, [user])

  if (!user) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      const updated = await updateMe({
        name: name.trim() || undefined,
        weight_kg: weight ? Number(weight) : undefined,
        height_cm: height ? Number(height) : undefined,
        email_notifications: emailNotifications,
        alert_threshold_minutes: alertThreshold,
        language,
      })
      setUser(updated)
      setMessage({ kind: 'ok', text: 'Cambios guardados.' })
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Error desconocido',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Panel <span className="text-terracotta">›</span> Configuración
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-sand pb-6">
        <div>
          <h1 className="font-serif text-[56px] font-normal leading-[0.95] tracking-[-0.03em] text-ink">
            Tu <em className="italic text-moss">perfil.</em>
          </h1>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Datos personales, antropometría y preferencias de notificación.
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft hover:text-terracotta"
        >
          Cerrar sesión →
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
        <section className="relative editorial-card p-7">
          <span className="num-tag absolute right-5 top-5">№ 01</span>
          <p className="label-mono">Perfil</p>
          <h2 className="mt-2 mb-5 font-serif text-2xl tracking-tight text-ink">
            Datos básicos.
          </h2>

          <div className="space-y-5">
            <FormField num="01" label="Nombre">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldInput}
              />
            </FormField>
            <FormField num="02" label="Correo">
              <input
                value={user.email}
                disabled
                className={`${fieldInput} border-ink-faint text-ink-soft`}
              />
            </FormField>
            <FormField num="03" label="Rol">
              <input
                value={user.role === 'admin' ? 'Administrador' : 'Trabajador'}
                disabled
                className={`${fieldInput} border-ink-faint text-ink-soft`}
              />
            </FormField>
          </div>
        </section>

        <section className="relative editorial-card p-7">
          <span className="num-tag absolute right-5 top-5">№ 02</span>
          <p className="label-mono">Antropometría</p>
          <h2 className="mt-2 mb-5 font-serif text-2xl tracking-tight text-ink">
            Para ajustar
            <br />
            la lectura.
          </h2>

          <div className="space-y-5">
            <FormField num="01" label="Peso (kg)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="ej. 72.5"
                className={fieldInput}
              />
            </FormField>
            <FormField num="02" label="Altura (cm)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="ej. 174"
                className={fieldInput}
              />
            </FormField>
          </div>
        </section>

        <section className="relative editorial-card p-7">
          <span className="num-tag absolute right-5 top-5">№ 03</span>
          <p className="label-mono">Preferencias</p>
          <h2 className="mt-2 mb-5 font-serif text-2xl tracking-tight text-ink">
            Cómo te avisamos.
          </h2>

          <div className="space-y-5">
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="mt-1 h-4 w-4 accent-ink"
              />
              <span>
                <span className="block font-serif text-base text-ink">
                  Notificaciones por correo
                </span>
                <span className="block text-xs text-ink-soft">
                  Recibe un resumen al final de cada jornada.
                </span>
              </span>
            </label>

            <FormField num="01" label="Alertar tras (min)">
              <input
                type="number"
                min="5"
                max="180"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className={fieldInput}
              />
            </FormField>

            <FormField num="02" label="Idioma">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`${fieldInput} appearance-none`}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </FormField>
          </div>
        </section>

        <div className="lg:col-span-3">
          {message && (
            <p
              className={`mb-4 border-l-2 px-3 py-2 text-xs ${
                message.kind === 'ok'
                  ? 'border-moss bg-moss/10 text-moss'
                  : 'border-terracotta bg-terracotta/10 text-terracotta-deep'
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-3 bg-moss-deep px-7 py-4 text-[13px] font-medium uppercase tracking-[0.05em] text-cream transition-colors hover:bg-ink disabled:opacity-60"
          >
            <span>{saving ? 'Guardando…' : 'Guardar cambios'}</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      </form>
    </div>
  )
}
