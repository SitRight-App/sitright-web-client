import { useEffect, useState, type FormEvent } from 'react'
import { LogOut } from 'lucide-react'
import { apiErrorMessage } from '@/shared/api/client'
import { useToast } from '@/shared/ui/toast'
import { useAuth } from '../context/AuthContext'
import { changeMyPassword, updateMe } from '../services/authService'

function FormField({
  label,
  children,
}: {
  // `num` se acepta en la firma por compatibilidad con las llamadas
  // existentes, pero no se renderiza como adorno numérico.
  num?: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  )
}

// Input canónico: label arriba (en FormField) + caja redondeada con foco moss.
const fieldInput =
  'w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint transition-colors focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15'

export function SettingsPage() {
  const { user, setUser, logout } = useAuth()
  const [name, setName] = useState('')
  const [weight, setWeight] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [alertThreshold, setAlertThreshold] = useState<number>(30)
  const [breakReminder, setBreakReminder] = useState<number>(60)
  const [language, setLanguage] = useState('es')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setWeight(user.anthropometric_data.weight_kg?.toString() ?? '')
    setHeight(user.anthropometric_data.height_cm?.toString() ?? '')
    setEmailNotifications(user.preferences.email_notifications)
    setAlertThreshold(user.preferences.alert_threshold_minutes)
    setBreakReminder(user.preferences.break_reminder_minutes ?? 60)
    setLanguage(user.preferences.language)
  }, [user])

  if (!user) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const updated = await updateMe({
        name: name.trim() || undefined,
        weight_kg: weight ? Number(weight) : undefined,
        height_cm: height ? Number(height) : undefined,
        email_notifications: emailNotifications,
        alert_threshold_minutes: alertThreshold,
        break_reminder_minutes: breakReminder,
        language,
      })
      setUser(updated)
      toast.success('Cambios guardados.', 'Tu perfil quedó actualizado.')
    } catch (err) {
      toast.error('No se pudieron guardar los cambios.', apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-sand pb-4">
        <div>
          <p className="label-mono">Configuración</p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
            Tu <span className="text-moss">perfil</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-xl border border-terracotta/40 bg-terracotta/10 px-4 py-2.5 text-[14px] font-medium text-terracotta-deep transition-colors hover:bg-terracotta/15 active:scale-[0.97]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <section className="rounded-xl border border-sand bg-cream-bone p-5">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Datos básicos
          </h2>

          <div className="space-y-4">
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
                className={`${fieldInput} cursor-not-allowed bg-cream text-ink-soft`}
              />
            </FormField>
            <FormField num="03" label="Rol">
              <input
                value={user.role === 'admin' ? 'Administrador' : 'Trabajador'}
                disabled
                className={`${fieldInput} cursor-not-allowed bg-cream text-ink-soft`}
              />
            </FormField>
          </div>
        </section>

        <section className="rounded-xl border border-sand bg-cream-bone p-5">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Antropometría
          </h2>

          <div className="space-y-4">
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

        <section className="rounded-xl border border-sand bg-cream-bone p-5">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Cómo te avisamos
          </h2>

          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-sand bg-cream px-4 py-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-moss"
              />
              <span>
                <span className="block text-[15px] font-medium text-ink">
                  Notificaciones por correo
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
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

            <FormField num="02" label="Pausa activa cada (min)">
              <input
                type="number"
                min="15"
                max="240"
                value={breakReminder}
                onChange={(e) => setBreakReminder(Number(e.target.value))}
                className={fieldInput}
              />
            </FormField>

            <FormField num="03" label="Idioma">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={fieldInput}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </FormField>
          </div>
        </section>

        <div className="flex justify-end lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-moss px-6 py-3 text-[15px] font-semibold text-cream-bone shadow-sm transition hover:bg-moss-deep active:scale-[0.97] disabled:opacity-60"
          >
            <span>{saving ? 'Guardando…' : 'Guardar cambios'}</span>
          </button>
        </div>
      </form>

      <ChangePasswordPanel />
    </div>
  )
}

function ChangePasswordPanel() {
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8) {
      toast.error(
        'Contraseña inválida',
        'La nueva contraseña debe tener al menos 8 caracteres.',
      )
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden', 'Vuelve a escribir la nueva.')
      return
    }
    setSubmitting(true)
    try {
      await changeMyPassword(currentPassword, newPassword)
      toast.success(
        'Contraseña actualizada',
        'Usa la nueva en tu próximo inicio de sesión.',
      )
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error('No se pudo cambiar la contraseña', apiErrorMessage(err, 'Reintenta en unos segundos'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className="mt-4 rounded-xl border border-sand bg-cream-bone p-5">
        <div className="mb-4 border-b border-sand pb-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Cambiar contraseña
          </h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          Usa al menos 8 caracteres en la nueva contraseña.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FormField num="01" label="Contraseña actual">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={fieldInput}
          />
        </FormField>
        <FormField num="02" label="Nueva contraseña">
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={fieldInput}
          />
        </FormField>
        <FormField num="03" label="Repetir nueva">
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={fieldInput}
          />
        </FormField>
        </div>
      </section>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-xl bg-moss px-6 py-3 text-[15px] font-semibold text-cream-bone shadow-sm transition hover:bg-moss-deep active:scale-[0.97] disabled:opacity-60"
        >
          {submitting ? 'Cambiando…' : 'Actualizar contraseña'}
        </button>
      </div>
    </form>
  )
}

