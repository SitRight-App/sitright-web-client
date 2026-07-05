import { useEffect, useState } from 'react'
import { useCurrentPosture } from '@/features/posture-visualization/hooks/useCurrentPosture'
import type { PostureClass } from '@/features/posture-visualization/types/posture'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { useToast } from '@/shared/ui/toast/ToastProvider'
import { parseServerDate } from '@/shared/lib/parseServerDate'
import { CalibrationPanel } from '../components/CalibrationPanel'
import { LinkVestForm } from '../components/LinkVestForm'
import { VestIllustration } from '../components/VestIllustration'
import { useMyVest, useUnlinkVest } from '../hooks/useMyVest'
import type { VestDevice } from '../types/vest'

const longDateFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function secondsSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - parseServerDate(iso).getTime()) / 1000))
}

function batteryHoursRemaining(percent: number): number {
  // Suposición: autonomía ~8 h al 100 %, lineal.
  return Math.max(0, Math.round((percent / 100) * 8))
}

export function VestManagementPage() {
  const { data: vest, isLoading, isError } = useMyVest()

  return (
    <div>
      {/* Encabezado delgado, alineado con el canon del dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <p className="text-[14px] text-ink-soft">Configuración del chaleco</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {vest ? 'Tu chaleco está vinculado' : 'Aún no hay chaleco vinculado'}
          </h1>
        </div>

        {vest && <VestStatusHeadPill vest={vest} />}
      </div>

      {isError && (
        <div className="mb-4 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep">
          No se pudo consultar el estado del chaleco.
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard>
            <SkeletonTextLine width="50%" />
            <Skeleton width="80%" height={32} className="mt-4" />
            <Skeleton width={220} height={220} className="mx-auto mt-8" circle />
            <div className="mt-6 grid grid-cols-4 gap-4 border-t border-sand pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <SkeletonTextLine width="60%" />
                  <Skeleton width="80%" height={18} className="mt-2" />
                </div>
              ))}
            </div>
          </SkeletonCard>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i}>
                <SkeletonTextLine width="40%" />
                <Skeleton width="70%" height={24} className="mt-3" />
                <Skeleton width="100%" height={60} className="mt-4" />
              </SkeletonCard>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !vest && <UnlinkedState />}
      {vest && <LinkedState vest={vest} />}
    </div>
  )
}

interface PropsWithVest {
  vest: VestDevice
}

function VestStatusHeadPill({ vest }: PropsWithVest) {
  const { data: latest } = useCurrentPosture()
  const isOurReading = latest?.vest_id === vest.id
  const secondsAgo =
    isOurReading && latest?.timestamp ? secondsSince(latest.timestamp) : null
  const isConnected = secondsAgo !== null && secondsAgo <= 30

  // Estado más preciso: "nunca tuvo lectura" vs "lectura antigua" vs "live".
  let label: string
  if (isConnected) {
    label = `Conectado · ${secondsAgo} s desde la última lectura`
  } else if (!isOurReading) {
    // Aún no llegó la primera lectura de este chaleco.
    label = !vest.is_calibrated
      ? 'Vinculado · sin calibrar'
      : 'Esperando primera lectura'
  } else {
    label = 'Sin actividad reciente'
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-medium ${
        isConnected
          ? 'border-moss/25 bg-moss/10 text-moss'
          : 'border-sand bg-cream-deep text-ink-soft'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-moss' : 'bg-ink-faint'}`} />
      {label}
    </span>
  )
}

function UnlinkedState() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="editorial-card p-8">
        <p className="label-mono">Estado</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-ink">
          Aún no hay chaleco vinculado
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Pide el código de vinculación a tu administrador. Lo necesitarás junto con la MAC
          impresa en la etiqueta interna del chaleco.
        </p>
      </div>

      <div className="editorial-card p-8">
        <p className="label-mono">Vinculación</p>
        <h2 className="mt-2 mb-6 text-2xl font-semibold tracking-tight text-ink">
          Registrar mi chaleco
        </h2>
        <LinkVestForm />
      </div>
    </div>
  )
}

function LinkedState({ vest }: PropsWithVest) {
  const { data: latest } = useCurrentPosture()
  // Ignoramos lecturas que no son de este chaleco (ver nota en VestStatusHeadPill).
  const ours = latest?.vest_id === vest.id ? latest : null
  // "Conectado" = hay una lectura nuestra reciente. Solo entonces conocemos el
  // estado actual de la batería, así que solo entonces la mostramos.
  const isConnected = ours?.timestamp ? secondsSince(ours.timestamp) <= 30 : false
  const warningSensor = ours?.posture_class ? sensorFromPosture(ours.posture_class) : null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProductSheet vest={vest} warningSensor={warningSensor} />
      <div className="flex flex-col gap-4">
        {isConnected && ours && <BatteryPanel percent={ours.battery_percent} />}
        <CalibrationCard vest={vest} />
        <UnlinkCard vest={vest} />
      </div>
    </div>
  )
}

function sensorFromPosture(cls: PostureClass): 'cervical' | 'dorsal' | 'lumbar' | null {
  switch (cls) {
    case 'forward_slouch':
      return 'cervical'
    case 'excessive_recline':
      return 'lumbar'
    default:
      return null
  }
}

interface ProductSheetProps extends PropsWithVest {
  warningSensor: 'cervical' | 'dorsal' | 'lumbar' | null
}

function ProductSheet({ vest, warningSensor }: ProductSheetProps) {
  return (
    <section className="editorial-card flex flex-col bg-cream-deep p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="label-mono">Chaleco vinculado</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-ink">
            SitRight Vest
          </h2>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium text-ink-faint">Código (MAC)</p>
          <div className="mt-1 font-mono text-[14px] font-medium tracking-[0.04em] text-ink">
            {vest.mac_address}
          </div>
        </div>
      </div>

      <div className="grid flex-1 place-items-center">
        <VestIllustration warningSensor={warningSensor} />
      </div>

      <p className="mt-6 border-t border-sand pt-5 text-center text-[14px] leading-relaxed text-ink-soft">
        Tres sensores en la espalda (cervical, dorsal y lumbar) miden tu postura
        mientras trabajas y te avisan cuando te desvías.
      </p>
    </section>
  )
}

function BatteryPanel({ percent }: { percent: number }) {
  // Solo se renderiza cuando hay lectura en vivo (ver LinkedState), así que el
  // % es el estado real y actual de la batería del chaleco.
  const hoursLeft = batteryHoursRemaining(percent)
  const headline =
    percent >= 50 ? `Resistirá ${hoursLeft} h más` : percent >= 20 ? 'Carga moderada' : 'Carga baja'

  return (
    <section className="rounded-xl border border-moss-deep bg-moss-deep p-7 text-cream-bone">
      <p className="text-[13px] font-medium text-cream-bone/70">Batería del chaleco</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">{headline}</h3>

      <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-5">
        <div className="text-[64px] font-semibold leading-none tracking-tight tabular-nums">
          {percent}
          <small className="ml-1 text-2xl font-medium text-cream-bone/65">%</small>
        </div>
        <div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-cream-bone/15">
            <div
              className="h-full rounded-full bg-terracotta-soft"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="font-mono text-[11px] tracking-[0.08em] text-cream-bone/75">
            ≈ {hoursLeft} h restantes
          </div>
        </div>
      </div>
    </section>
  )
}

function CalibrationCard({ vest }: PropsWithVest) {
  const stepsTotal = 3
  const stepsDone = vest.is_calibrated ? stepsTotal : 0
  const progressPercent = (stepsDone / stepsTotal) * 100

  return (
    <section className="editorial-card bg-cream-deep p-7">
      <p className="label-mono">Calibración de referencia</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {vest.is_calibrated ? 'Postura neutra capturada' : 'Recalibrar postura neutra'}
      </h3>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
        Guardamos tu postura erguida como referencia. Así el chaleco sabe cuándo te
        desvías. Repítela si cambias de silla.
      </p>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-moss/15">
        <div
          className="h-full rounded-full bg-moss transition"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <CalibStep
          n="01"
          title="Sentado erguido"
          meta={vest.is_calibrated ? 'capturado' : '5 segundos'}
          done={vest.is_calibrated}
        />
        <CalibStep
          n="02"
          title="Espalda contra respaldo"
          meta="10 segundos"
          done={vest.is_calibrated}
        />
        <CalibStep
          n="03"
          title="Mirada al horizonte"
          meta="10 segundos"
          done={vest.is_calibrated}
        />
      </div>

      <div className="mt-5 border-t border-sand pt-5">
        <CalibrationPanel
          vestId={vest.id}
          isCalibrated={vest.is_calibrated}
          calibratedAt={vest.calibrated_at}
        />
      </div>
    </section>
  )
}

interface CalibStepProps {
  n: string
  title: string
  meta: string
  done: boolean
}

function CalibStep({ n, title, meta, done }: CalibStepProps) {
  return (
    <div
      className={`rounded-lg border p-3.5 ${
        done ? 'border-moss bg-moss text-cream-bone' : 'border-sand bg-cream-bone text-ink'
      }`}
    >
      <p
        className={`mb-1.5 text-[12px] font-medium ${
          done ? 'text-cream-bone/70' : 'text-ink-faint'
        }`}
      >
        Paso {n} {done && '· ✓'}
      </p>
      <p className="text-[15px] font-medium leading-tight">{title}</p>
      <p className={`mt-1 text-[13px] ${done ? 'text-cream-bone/70' : 'text-ink-soft'}`}>
        {meta}
      </p>
    </div>
  )
}

function UnlinkCard({ vest }: PropsWithVest) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const unlink = useUnlinkVest(vest.id)
  const toast = useToast()

  const handleConfirm = () => {
    unlink.mutate(undefined, {
      onSuccess: () => {
        toast.success('Chaleco desvinculado', 'Ya no recibirás datos de este chaleco.')
        setConfirmOpen(false)
      },
      onError: (err) => {
        toast.error(
          'No se pudo desvincular',
          err instanceof Error ? err.message : 'Reintenta en unos segundos',
        )
      },
    })
  }

  return (
    <section className="editorial-card p-7">
      <p className="label-mono">Zona de riesgo</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Desvincular el chaleco</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Si lo desvinculas, dejará de medir y tendrás que registrarlo otra vez. Tus
        sesiones guardadas no se borran.
      </p>
      {vest.linked_at && (
        <p className="mt-3 text-[12px] text-ink-faint">
          Vinculado el {longDateFmt.format(parseServerDate(vest.linked_at))}
        </p>
      )}

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="mt-5 rounded-xl border border-terracotta/50 bg-cream-bone px-4 py-2.5 text-[14px] font-medium text-terracotta-deep transition-colors hover:border-terracotta hover:text-terracotta"
      >
        Desvincular chaleco
      </button>

      {confirmOpen && (
        <UnlinkConfirmDialog
          mac={vest.mac_address}
          isPending={unlink.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </section>
  )
}

interface UnlinkConfirmDialogProps {
  mac: string
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

function UnlinkConfirmDialog({ mac, isPending, onCancel, onConfirm }: UnlinkConfirmDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, isPending])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlink-title"
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6 backdrop-blur-[2px]"
      onClick={() => !isPending && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] overflow-hidden rounded-xl border border-sand bg-cream-bone shadow-xl"
      >
        <div className="border-b border-sand bg-cream px-6 py-5">
          <p className="label-mono">Cuidado</p>
          <h3 id="unlink-title" className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            ¿Desvincular este chaleco?
          </h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            El chaleco{' '}
            <span className="font-mono text-[13px] tracking-[0.04em] text-ink">{mac}</span>{' '}
            dejará de enviarte lecturas y deberás vincularlo de nuevo para usarlo. Tus sesiones
            históricas se mantienen intactas.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-sand bg-cream-deep px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-sand bg-cream-bone px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-xl bg-terracotta px-5 py-2.5 text-[14px] font-semibold text-cream-bone transition hover:bg-terracotta-deep active:scale-[0.97] disabled:opacity-50"
          >
            {isPending ? 'Desvinculando…' : 'Sí, desvincular'}
          </button>
        </div>
      </div>
    </div>
  )
}

