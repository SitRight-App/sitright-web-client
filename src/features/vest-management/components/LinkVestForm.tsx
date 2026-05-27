import { useState, type FormEvent } from 'react'
import { useLinkVest } from '../hooks/useMyVest'
import type { LinkVestResponse } from '../types/vest'

export function LinkVestForm() {
  const linkMutation = useLinkVest()
  const [macAddress, setMacAddress] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [credentials, setCredentials] = useState<LinkVestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const response = await linkMutation.mutateAsync({
        mac_address: macAddress.toUpperCase(),
        pairing_code: pairingCode,
      })
      setCredentials(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
    }
  }

  if (credentials) {
    return (
      <div className="border border-moss/30 bg-moss/5 p-6">
        <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-moss">
          <span className="h-1.5 w-1.5 rounded-full bg-moss" />
          Chaleco vinculado
        </div>
        <h3 className="font-serif text-2xl tracking-tight text-ink">
          Guarda estas credenciales.
        </h3>
        <p className="mt-2 text-sm text-ink-soft">
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
          className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-moss hover:underline"
        >
          Entendido, cerrar →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          <span className="mr-2 text-terracotta">01</span>Dirección MAC del chaleco
        </label>
        <input
          required
          placeholder="AA:BB:CC:11:22:33"
          value={macAddress}
          onChange={(e) => setMacAddress(e.target.value)}
          className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 font-mono text-[15px] text-ink placeholder:italic placeholder:text-ink-faint focus:border-terracotta focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          <span className="mr-2 text-terracotta">02</span>Código de vinculación
        </label>
        <input
          required
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value)}
          className="w-full border-0 border-b-[1.2px] border-ink bg-transparent py-2.5 text-[17px] text-ink focus:border-terracotta focus:outline-none"
        />
      </div>
      {error && (
        <p className="border-l-2 border-terracotta bg-terracotta/10 px-3 py-2 text-xs text-terracotta-deep">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={linkMutation.isPending}
        className="flex w-full items-center justify-between bg-moss-deep px-6 py-4 text-[13px] font-medium uppercase tracking-[0.05em] text-cream transition-colors hover:bg-ink disabled:opacity-60"
      >
        <span>{linkMutation.isPending ? 'Vinculando…' : 'Vincular chaleco'}</span>
        <span aria-hidden>→</span>
      </button>
    </form>
  )
}
