import { useCurrentPosture } from '@/features/posture-visualization/hooks/useCurrentPosture'
import type { PostureClass } from '@/features/posture-visualization/types/posture'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { CalibrationPanel } from '../components/CalibrationPanel'
import { LinkVestForm } from '../components/LinkVestForm'
import { VestIllustration } from '../components/VestIllustration'
import { useMyVest } from '../hooks/useMyVest'
import type { VestDevice } from '../types/vest'

const longDateFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function secondsSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
}

function batteryHoursRemaining(percent: number): number {
  // Suposición: autonomía ~8 h al 100 %, lineal.
  return Math.max(0, Math.round((percent / 100) * 8))
}

export function VestManagementPage() {
  const { data: vest, isLoading, isError } = useMyVest()

  return (
    <div>
      <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Panel <span className="text-terracotta">›</span> Chaleco
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-8 border-b border-sand pb-6">
        <h1 className="font-serif text-[56px] font-normal leading-[0.95] tracking-[-0.03em] text-ink">
          {vest ? (
            <>
              Tu chaleco
              <br />
              <em className="italic text-moss">está vinculado.</em>
            </>
          ) : (
            <>
              Aún no hay
              <br />
              <em className="italic text-terracotta">chaleco vinculado.</em>
            </>
          )}
        </h1>

        {vest && <VestStatusHeadPill vest={vest} />}
      </div>

      {isError && (
        <p className="mt-6 border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo consultar el estado del chaleco.
        </p>
      )}

      {isLoading && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <SkeletonCard>
            <SkeletonTextLine width="50%" />
            <Skeleton width="80%" height={32} className="mt-4" />
            <Skeleton width={220} height={220} className="mx-auto mt-8" circle />
            <div className="mt-6 grid grid-cols-4 gap-4 border-t border-dashed border-sand pt-4">
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
  const secondsAgo = latest?.timestamp ? secondsSince(latest.timestamp) : null
  const isConnected = secondsAgo !== null && secondsAgo <= 30
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
        isConnected
          ? 'border-moss/25 bg-moss/10 text-moss'
          : 'border-sand bg-sand/20 text-ink-soft'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-moss' : 'bg-ink-faint'}`} />
      {isConnected
        ? `Conectado · ${secondsAgo} s desde la última lectura`
        : !vest.is_calibrated
          ? 'Vinculado · sin calibrar'
          : 'Sin actividad reciente'}
    </span>
  )
}

function UnlinkedState() {
  return (
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
  )
}

function LinkedState({ vest }: PropsWithVest) {
  const { data: latest } = useCurrentPosture()
  const warningSensor = latest?.posture_class
    ? sensorFromPosture(latest.posture_class)
    : null

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <ProductSheet vest={vest} warningSensor={warningSensor} />
      <div className="flex flex-col gap-4">
        <BatteryPanel vest={vest} />
        <SensorsPanel warningSensor={warningSensor} latestTimestamp={latest?.timestamp ?? null} />
        <CalibrationCard vest={vest} />
        <DeviceMetaPanel vest={vest} />
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
    <section
      className="relative overflow-hidden rounded-md border border-sand bg-cream-deep p-9"
      style={{
        backgroundImage:
          'radial-gradient(at 100% 0%, rgba(200,98,60,0.05), transparent 50%), radial-gradient(at 0% 100%, rgba(45,74,54,0.05), transparent 50%), linear-gradient(to right, rgba(74,82,73,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(74,82,73,0.04) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 24px 24px, 24px 24px',
      }}
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-2">Chaleco vinculado № 01</p>
          <h2 className="font-serif text-2xl leading-none tracking-tight text-ink">
            SitRight Vest · A1
          </h2>
        </div>
        <div className="text-right font-mono text-[11px] uppercase tracking-[0.10em] text-ink-soft">
          MAC
          <div className="mt-1 font-mono text-sm font-medium tracking-[0.08em] text-ink">
            {vest.mac_address}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px_1fr] items-center gap-4">
        <div className="flex flex-col gap-7">
          <Annotation
            label="Sensor 1 · cervical"
            name="MPU-6050"
            value="conectado · ID 7A"
            warn={warningSensor === 'cervical'}
          />
          <Annotation
            label="Sensor 2 · dorsal"
            name="MPU-6050"
            value="conectado · ID 7B"
            warn={warningSensor === 'dorsal'}
          />
          <Annotation
            label="Sensor 3 · lumbar"
            name="MPU-6050"
            value="conectado · ID 7C"
            warn={warningSensor === 'lumbar'}
          />
        </div>

        <VestIllustration warningSensor={warningSensor} />

        <div className="flex flex-col items-end gap-7 text-right">
          <Annotation
            label="Microcontrolador"
            name="ESP32 DevKit V1"
            value="WiFi · I2C · 240 MHz"
            align="right"
          />
          <Annotation
            label="Bus de datos"
            name="I²C · 400 kHz"
            value="3 esclavos · pull-up 4.7 kΩ"
            align="right"
          />
          <Annotation
            label="Batería"
            name="LiPo 1000 mAh"
            value="TP4056 · USB-C"
            align="right"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-6 border-t border-dashed border-sand pt-5">
        <Spec k="Frec. envío" v="5" suffix="s" />
        <Spec k="Lecturas / hora" v="720" />
        <Spec k="Rango IMU" v="±16" suffix="g" />
        <Spec k="Autonomía" v="~ 8" suffix="h" />
      </div>
    </section>
  )
}

interface AnnotationProps {
  label: string
  name: string
  value: string
  warn?: boolean
  align?: 'left' | 'right'
}

function Annotation({ label, name, value, warn = false, align = 'left' }: AnnotationProps) {
  const borderColor = warn ? 'border-terracotta' : 'border-moss'
  return (
    <div
      className={`max-w-[200px] py-1 ${
        align === 'right' ? `border-r ${borderColor} pr-3.5` : `border-l ${borderColor} pl-3.5`
      }`}
    >
      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
      <p className="mb-1 font-serif text-[17px] leading-tight text-ink">{name}</p>
      <p className="font-mono text-[10px] tracking-[0.04em] text-ink-soft">{value}</p>
    </div>
  )
}

interface SpecProps {
  k: string
  v: string
  suffix?: string
}

function Spec({ k, v, suffix }: SpecProps) {
  return (
    <div>
      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">{k}</p>
      <p className="font-serif text-lg text-ink">
        {v}
        {suffix && <small className="ml-1 text-[11px] text-ink-soft">{suffix}</small>}
      </p>
    </div>
  )
}

function BatteryPanel({ vest }: PropsWithVest) {
  const percent = vest.battery_level ?? 0
  const hoursLeft = batteryHoursRemaining(percent)
  const headline =
    percent >= 50 ? `Resistirá ${hoursLeft} h más` : percent >= 20 ? 'Carga moderada' : 'Carga baja'

  return (
    <section
      className="relative rounded-md border border-moss-deep bg-moss-deep p-6 text-cream"
      style={{
        backgroundImage:
          'radial-gradient(at 100% 0%, rgba(200,98,60,0.18), transparent 60%)',
      }}
    >
      <span className="absolute right-5 top-5 font-mono text-[10px] uppercase tracking-[0.16em] text-cream/55">
        № 02
      </span>
      <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sand">
        Batería del chaleco
      </p>
      <h3 className="mb-4 font-serif text-2xl tracking-tight">{headline}</h3>

      <div className="grid grid-cols-[auto_1fr] items-center gap-5">
        <div className="font-serif text-[68px] leading-none tracking-[-0.04em]">
          {percent}
          <small className="ml-1 text-2xl opacity-65">%</small>
        </div>
        <div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-cream/15">
            <div
              className="h-full rounded-full bg-terracotta-soft"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] tracking-[0.10em] text-cream/70">
            <span>≈ {hoursLeft} h restantes</span>
            <span>Reporte cada 5 s</span>
          </div>
        </div>
      </div>
    </section>
  )
}

interface SensorsPanelProps {
  warningSensor: 'cervical' | 'dorsal' | 'lumbar' | null
  latestTimestamp: string | null
}

function SensorsPanel({ warningSensor, latestTimestamp }: SensorsPanelProps) {
  const lastDelta = latestTimestamp ? `Δ ${secondsSince(latestTimestamp)} s` : '—'
  const sensors: Array<{
    pin: 'C' | 'D' | 'L'
    title: string
    meta: string
    isWarning: boolean
  }> = [
    {
      pin: 'C',
      title: 'Cervical · MPU-6050',
      meta: 'i²c 0x68 · ID 7A · vértebra C7',
      isWarning: warningSensor === 'cervical',
    },
    {
      pin: 'D',
      title: 'Dorsal · MPU-6050',
      meta: 'i²c 0x69 · ID 7B · vértebra T6',
      isWarning: warningSensor === 'dorsal',
    },
    {
      pin: 'L',
      title: 'Lumbar · MPU-6050',
      meta: 'i²c 0x6A · ID 7C · vértebra L5',
      isWarning: warningSensor === 'lumbar',
    },
  ]
  return (
    <section className="relative rounded-md border border-sand bg-cream-bone p-6">
      <span className="num-tag absolute right-5 top-5">№ 03</span>
      <p className="label-mono">Estado de los 3 sensores</p>
      <h3 className="mt-1.5 font-serif text-2xl tracking-tight text-ink">Salud del bus I²C</h3>
      <ul className="mt-4">
        {sensors.map((s, i) => (
          <li
            key={s.pin}
            className={`grid grid-cols-[36px_1fr_auto] items-center gap-3.5 py-3.5 ${
              i < sensors.length - 1 ? 'border-b border-dashed border-sand' : ''
            }`}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-full font-mono text-sm font-medium text-cream ${
                s.isWarning ? 'bg-terracotta' : 'bg-moss-deep'
              }`}
            >
              {s.pin}
            </span>
            <div>
              <p className="font-serif text-base text-ink">{s.title}</p>
              <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-ink-faint">
                {s.meta}
              </p>
            </div>
            <div className="text-right font-mono text-[11px] text-ink-soft">
              <p className={s.isWarning ? 'font-medium text-terracotta-deep' : 'font-medium text-moss'}>
                {s.isWarning ? 'desviación' : 'OK · 100%'}
              </p>
              <p>{lastDelta}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CalibrationCard({ vest }: PropsWithVest) {
  const stepsTotal = 3
  const stepsDone = vest.is_calibrated ? stepsTotal : 0
  const progressPercent = (stepsDone / stepsTotal) * 100

  return (
    <section className="relative rounded-md border border-sand bg-cream-deep p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        № 04 · Calibración de referencia
      </p>
      <h3 className="mt-2 font-serif text-2xl tracking-tight text-ink">
        {vest.is_calibrated ? 'Postura neutra capturada' : 'Recalibrar postura neutra'}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        La calibración guarda los valores IMU en posición erguida como referencia. Recomendamos
        repetirla una vez al mes o si cambias de silla.
      </p>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-moss/15">
        <div
          className="h-full rounded-full bg-moss transition-all"
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

      <div className="mt-5 border-t border-dashed border-sand pt-5">
        <CalibrationPanel vestId={vest.id} isCalibrated={vest.is_calibrated} />
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
      className={`rounded border p-3.5 ${
        done ? 'border-moss bg-moss text-cream' : 'border-sand bg-cream text-ink'
      }`}
    >
      <p
        className={`mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
          done ? 'opacity-70' : 'opacity-70'
        }`}
      >
        Paso {n} {done && '· ✓'}
      </p>
      <p className="font-serif text-[15px] leading-tight">{title}</p>
      <p
        className={`mt-1 text-[11px] opacity-60 ${done ? 'text-cream' : 'text-ink-soft'}`}
      >
        {meta}
      </p>
    </div>
  )
}

function DeviceMetaPanel({ vest }: PropsWithVest) {
  return (
    <section className="relative rounded-md border border-sand bg-cream-bone p-6">
      <span className="num-tag absolute right-5 top-5">№ 05</span>
      <p className="label-mono">Información del dispositivo</p>
      <h3 className="mt-1.5 mb-4 font-serif text-2xl tracking-tight text-ink">
        Especificaciones técnicas
      </h3>

      <div className="grid grid-cols-2 gap-x-7 gap-y-3.5">
        <MetaRow k="Firmware" v={vest.firmware_version ?? '—'} />
        <MetaRow k="Hardware" v="ESP32 DevKit V1" />
        <MetaRow k="Vinculado a" v={vest.user_id ? vest.user_id.slice(0, 8) + '…' : '—'} />
        <MetaRow
          k="Fecha de vínculo"
          v={vest.linked_at ? longDateFmt.format(new Date(vest.linked_at)) : '—'}
        />
        <MetaRow k="Estado" v={vest.is_active ? 'Activo' : 'Pausado'} />
        <MetaRow
          k="Calibrado"
          v={vest.is_calibrated ? 'Sí' : 'Pendiente'}
        />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-dashed border-sand pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-terracotta-deep">
          Zona de riesgo
        </span>
        <button
          type="button"
          className="border-b border-terracotta-soft pb-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-terracotta-deep transition-colors hover:border-terracotta hover:text-terracotta"
          title="Desvincular chaleco (función pendiente de endpoint backend)"
        >
          Desvincular chaleco
        </button>
      </div>
    </section>
  )
}

interface MetaRowProps {
  k: string
  v: string
}

function MetaRow({ k, v }: MetaRowProps) {
  return (
    <div>
      <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">{k}</p>
      <p className="font-mono text-[13px] tracking-[0.04em] text-ink">{v}</p>
    </div>
  )
}
