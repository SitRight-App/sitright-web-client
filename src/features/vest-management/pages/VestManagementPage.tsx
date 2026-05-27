import { CalibrationPanel } from '../components/CalibrationPanel'
import { LinkVestForm } from '../components/LinkVestForm'
import { useMyVest } from '../hooks/useMyVest'

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-sand pl-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
      <p className="mt-1 font-serif text-lg text-ink">{value}</p>
    </div>
  )
}

export function VestManagementPage() {
  const { data: vest, isLoading, isError } = useMyVest()

  return (
    <div>
      <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Panel <span className="text-terracotta">›</span> Chaleco
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-sand pb-6">
        <h1 className="font-serif text-[56px] font-normal leading-[0.95] tracking-[-0.03em] text-ink">
          Mi <em className="italic text-moss">chaleco.</em>
        </h1>

        {vest && (
          <span className="inline-flex items-center gap-2.5 rounded-full border border-moss/25 bg-moss/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-moss">
            <span className="h-2 w-2 rounded-full bg-moss" />
            {vest.is_calibrated ? 'Operativo · calibrado' : 'Vinculado · sin calibrar'}
          </span>
        )}
      </div>

      {isError && (
        <p className="mt-6 border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo consultar el estado del chaleco.
        </p>
      )}

      {isLoading && (
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">
          Cargando…
        </p>
      )}

      {!isLoading && !vest && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div
            className="relative editorial-card p-9"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(74,82,73,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(74,82,73,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <span className="num-tag absolute right-5 top-5">№ 01</span>
            <p className="label-mono">Estado</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-ink">
              Aún no hay
              <br />
              <em className="italic text-terracotta">chaleco vinculado.</em>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
              Pide el código de vinculación a tu administrador. Lo necesitarás junto con la MAC
              impresa en la etiqueta interna del chaleco.
            </p>
          </div>

          <div className="relative editorial-card p-9">
            <span className="num-tag absolute right-5 top-5">№ 02</span>
            <p className="label-mono">Vinculación</p>
            <h2 className="mt-3 mb-6 font-serif text-3xl tracking-tight text-ink">
              Registrar mi chaleco.
            </h2>
            <LinkVestForm />
          </div>
        </div>
      )}

      {vest && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div
            className="relative editorial-card overflow-hidden p-9"
            style={{
              backgroundImage:
                'radial-gradient(at 100% 0%, rgba(200,98,60,0.05), transparent 50%), radial-gradient(at 0% 100%, rgba(45,74,54,0.05), transparent 50%), linear-gradient(to right, rgba(74,82,73,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(74,82,73,0.04) 1px, transparent 1px)',
              backgroundSize: 'auto, auto, 24px 24px, 24px 24px',
            }}
          >
            <span className="num-tag absolute right-5 top-5">№ 01</span>
            <p className="label-mono">Ficha del dispositivo</p>
            <h2 className="mt-3 font-serif text-3xl tracking-tight text-ink">
              SitRight Vest <em className="italic text-moss">v1</em>
            </h2>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
              Serial: {vest.mac_address}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <Spec label="Firmware" value={vest.firmware_version ?? '—'} />
              <Spec
                label="Batería"
                value={vest.battery_level !== null ? `${vest.battery_level}%` : '—'}
              />
              <Spec
                label="Vinculado el"
                value={vest.linked_at ? dateFmt.format(new Date(vest.linked_at)) : '—'}
              />
              <Spec
                label="Estado"
                value={vest.is_active ? 'Activo' : 'Pausado'}
              />
            </div>
          </div>

          <div className="relative editorial-card p-9">
            <span className="num-tag absolute right-5 top-5">№ 02</span>
            <p className="label-mono">Calibración</p>
            <h2 className="mt-3 mb-5 font-serif text-3xl tracking-tight text-ink">
              Postura de referencia.
            </h2>
            <CalibrationPanel vestId={vest.id} isCalibrated={vest.is_calibrated} />
          </div>
        </div>
      )}
    </div>
  )
}
