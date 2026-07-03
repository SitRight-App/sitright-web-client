import { useState, type FormEvent } from 'react'
import { useToast } from '@/shared/ui/toast'
import { useLinkVest } from '../hooks/useMyVest'
import type { LinkVestResponse } from '../types/vest'

// Validación cliente de formato MAC.
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/

export function LinkVestForm() {
  const linkMutation = useLinkVest()
  const toast = useToast()
  const [macAddress, setMacAddress] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [macError, setMacError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<LinkVestResponse | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMacError(null)

    const normalized = macAddress.toUpperCase().trim()
    if (!MAC_REGEX.test(normalized)) {
      // Texto literal del mensaje de error.
      setMacError('El identificador no es una dirección MAC válida')
      return
    }

    try {
      const response = await linkMutation.mutateAsync({
        mac_address: normalized,
        pairing_code: pairingCode,
      })
      setCredentials(response)
      toast.success(
        'Chaleco vinculado.',
        'Guarda las credenciales MQTT que aparecen abajo.',
      )
    } catch (err) {
      toast.error(
        'No se pudo vincular el chaleco.',
        err instanceof Error ? err.message : 'Error desconocido',
      )
    }
  }

  if (credentials) {
    return (
      <div className="border border-moss/30 bg-moss/5 p-6">
        <div className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold text-moss">
          <span className="h-1.5 w-1.5 rounded-full bg-moss" />
          Chaleco vinculado
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-ink">
          Guarda estas credenciales.
        </h3>
        <p className="mt-2 text-[14px] text-ink-soft">
          Configúralas en el firmware de tu chaleco. La contraseña no se mostrará otra vez.
        </p>
        <dl className="mt-5 space-y-2 border-t border-dashed border-sand pt-5 font-mono text-[12px]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-faint uppercase tracking-[0.16em] text-[10px]">
              MQTT_USERNAME
            </dt>
            <dd className="text-ink">{credentials.mqtt_username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-faint uppercase tracking-[0.16em] text-[10px]">
              MQTT_PASSWORD
            </dt>
            <dd className="break-all text-right text-ink">{credentials.mqtt_password}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setCredentials(null)}
          className="mt-6 text-[14px] font-semibold text-moss hover:underline"
        >
          Entendido, cerrar →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-[14px] font-medium text-ink-soft">
          <span className="mr-2 text-terracotta">1.</span>Código del chaleco (MAC)
        </label>
        <input
          required
          placeholder="AA:BB:CC:11:22:33"
          value={macAddress}
          onChange={(e) => {
            setMacAddress(e.target.value)
            if (macError) setMacError(null)
          }}
          aria-invalid={macError !== null}
          className={`w-full border-0 border-b-[1.2px] bg-transparent py-2.5 font-mono text-[15px] text-ink placeholder:italic placeholder:text-ink-faint focus:outline-none ${
            macError
              ? 'border-terracotta focus:border-terracotta'
              : 'border-ink focus:border-terracotta'
          }`}
        />
        {macError && (
          <p className="mt-1.5 font-mono text-[11px] text-terracotta-deep">{macError}</p>
        )}
      </div>
      <div>
        <label className="mb-2 block text-[14px] font-medium text-ink-soft">
          <span className="mr-2 text-terracotta">2.</span>Código de vinculación
        </label>
        <input
          required
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value)}
          className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[17px] text-ink focus:border-terracotta focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={linkMutation.isPending}
        className="flex w-full items-center justify-between bg-moss-deep px-6 py-4 text-[15px] font-semibold text-cream transition-colors hover:bg-ink disabled:opacity-60"
      >
        <span>{linkMutation.isPending ? 'Vinculando…' : 'Vincular chaleco'}</span>
        <span aria-hidden>→</span>
      </button>
    </form>
  )
}
