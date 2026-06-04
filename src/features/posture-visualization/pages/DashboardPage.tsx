import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/iam/context/AuthContext'
import { RecommendationsCard } from '@/features/recommendations/components/RecommendationsCard'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import { SessionControls } from '@/features/session-history/components/SessionControls'
import { useMyVest } from '@/features/vest-management/hooks/useMyVest'
import { staggerContainer, staggerItem } from '@/shared/ui/motion'
import { BreakReminder } from '../components/BreakReminder'
import { PostureAlert } from '../components/PostureAlert'
import { PostureTimeline } from '../components/PostureTimeline'
import { VestStatusBadge } from '../components/VestStatusBadge'
import { useBreakReminder } from '../hooks/useBreakReminder'
import { useCurrentPosture } from '../hooks/useCurrentPosture'
import { useProlongedBadPosture } from '../hooks/useProlongedBadPosture'
import { useRecentReadings } from '../hooks/useRecentReadings'
import { useVestStatus } from '../hooks/useVestStatus'
import type { LatestReading, PostureClass } from '../types/posture'
import { POSTURE_HEADLINES, POSTURE_LABELS, isDeviation } from '../types/posture'

const dateFmt = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const timeFmt = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
})

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function timeSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5) return 'ahora mismo'
  if (diff < 60) return `hace ${diff} s`
  return `hace ${Math.floor(diff / 60)} min`
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: vest, isLoading: vestLoading } = useMyVest()
  const hasVest = vest !== null && vest !== undefined

  // Sólo consultamos lecturas cuando hay chaleco vinculado: si no, los
  // endpoints devuelven la última lectura registrada en el sistema (que
  // no es la del usuario) y la UI mentiría.
  const { data: reading, isLoading, isError } = useCurrentPosture({ enabled: hasVest })

  const vestStatus = useVestStatus(reading)
  const { isAlertActive, dismiss: dismissAlert } = useProlongedBadPosture(reading)
  const { showReminder, dismiss: dismissReminder } = useBreakReminder(vestStatus, reading)
  const { data: recommendations } = useRecommendations(reading?.posture_class)
  const recent = useRecentReadings({
    limit: 60,
    refetchInterval: 5_000,
    enabled: hasVest,
  })

  const firstName = user?.name.split(' ')[0] ?? 'Hola'
  const now = new Date()

  if (!vestLoading && !hasVest) {
    return <UnlinkedDashboard firstName={firstName} now={now} />
  }

  return (
    <div>
      {/* Encabezado delgado */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <p className="text-[14px] text-ink-soft">Buen día,</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{firstName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-right text-[13px] leading-tight text-ink-soft sm:block">
            {capitalize(dateFmt.format(now))}
            <br />
            <span className="text-ink-faint">{timeFmt.format(now)}</span>
          </span>
          <VestStatusBadge status={vestStatus} batteryPercent={reading?.battery_percent} />
        </div>
      </div>

      {isError && (
        <div className="mb-4 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo conectar con el backend. Verifica que el servicio esté disponible.
        </div>
      )}

      {isAlertActive && (
        <div className="mb-4">
          <PostureAlert onDismiss={dismissAlert} />
        </div>
      )}
      {showReminder && (
        <div className="mb-4">
          <BreakReminder onDismiss={dismissReminder} />
        </div>
      )}

      <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
        {/* Protagonista: estado de postura en vivo, reactivo al color */}
        <motion.div variants={staggerItem}>
          <LiveStatusBanner reading={reading ?? null} isLoading={isLoading} />
        </motion.div>

        {/* Columna vertebral + recomendaciones */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
          <motion.div variants={staggerItem}>
            <SpineCard reading={reading ?? null} />
          </motion.div>

          <motion.div variants={staggerItem}>
            {recommendations && recommendations.length > 0 ? (
              <RecommendationsCard
                recommendations={recommendations}
                postureClass={reading?.posture_class ?? 'indeterminate'}
                maxVisible={3}
              />
            ) : (
              <div className="editorial-card flex h-full flex-col justify-center p-7">
                <p className="label-mono">Recomendaciones</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Cuando el chaleco detecte una desviación, aquí verás los ajustes
                  ergonómicos sugeridos.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Control de sesión + línea de tiempo */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
          <motion.div variants={staggerItem}>
            <SessionControls />
          </motion.div>
          <motion.div variants={staggerItem}>
            <PostureTimeline
              readings={recent.data ?? []}
              isLoading={recent.isLoading}
              isError={recent.isError}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

interface LiveStatusProps {
  reading: LatestReading | null
  isLoading: boolean
}

/**
 * Banda protagonista del dashboard. Cambia de color según el estado postural
 * detectado: verde (adecuada), terracota (desviación) o neutro (sin datos).
 */
function LiveStatusBanner({ reading, isLoading }: LiveStatusProps) {
  const cls: PostureClass = reading?.posture_class ?? 'indeterminate'
  const isWarn = isDeviation(cls)
  const hasData = reading !== null

  const tone = !hasData
    ? 'border-sand bg-cream-bone text-ink'
    : isWarn
      ? 'border-terracotta-deep bg-terracotta text-cream-bone'
      : 'border-moss-deep bg-moss text-cream-bone'

  const dotTone = !hasData ? 'bg-ink-faint' : 'bg-cream-bone'
  const subTone = !hasData ? 'text-ink-soft' : 'text-cream-bone/80'

  return (
    <section className={`rounded-xl border p-7 sm:p-8 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <div className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] ${subTone}`}>
            <span className="relative flex h-2 w-2">
              {hasData && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotTone} opacity-60`} />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${dotTone}`} />
            </span>
            {hasData ? 'En vivo · Postura actual' : 'Sin lecturas'}
          </div>
          <h2 className="mt-3 text-[34px] font-semibold leading-none tracking-tight sm:text-[40px]">
            {POSTURE_LABELS[cls]}
          </h2>
          <p className={`mt-2.5 text-[14px] leading-relaxed ${subTone}`}>
            {hasData
              ? `${POSTURE_HEADLINES[cls]} Última lectura ${timeSince(reading.timestamp)}.`
              : isLoading
                ? 'Conectando con el chaleco…'
                : 'Aún no llegan lecturas del chaleco.'}
          </p>
        </div>

        {hasData && (
          <div className="flex items-stretch gap-6 sm:gap-8">
            <Stat label="Confianza" value={`${Math.round(reading.confidence * 100)}%`} tone={subTone} />
            <span className="w-px self-stretch bg-cream-bone/20" />
            <Stat label="Batería" value={`${reading.battery_percent}%`} tone={subTone} />
          </div>
        )}
      </div>
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className={`font-mono text-[11px] uppercase tracking-[0.12em] ${tone}`}>{label}</p>
      <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight">{value}</p>
    </div>
  )
}

interface SpineCardProps {
  reading: LatestReading | null
}

/** Visualización de la columna por zona (cervical · dorsal · lumbar). */
function SpineCard({ reading }: SpineCardProps) {
  const isWarn = reading ? isDeviation(reading.posture_class) : false

  return (
    <div className="editorial-card h-full bg-cream-deep p-8">
      <p className="label-mono">Visualización vertebral</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Lectura cervical · dorsal · lumbar
      </h2>

      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
        <div className="space-y-7">
          {(['Cervical', 'Dorsal', 'Lumbar'] as const).map((zone, i) => {
            const isAlertZone = isWarn && i === 2
            return (
              <div
                key={zone}
                className={`rounded-md border px-4 py-2.5 ${
                  isAlertZone
                    ? 'border-terracotta/40 bg-terracotta/10'
                    : 'border-sand bg-cream-bone'
                }`}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {zone} · {['C-zone', 'D-zone', 'L-zone'][i]}
                </p>
                <p
                  className={`text-base font-medium ${
                    isAlertZone ? 'text-terracotta-deep' : 'text-moss'
                  }`}
                >
                  {isAlertZone ? 'Desviada' : 'Adecuada'}
                </p>
              </div>
            )
          })}
        </div>

        <div className="grid place-items-center">
          <svg viewBox="0 0 240 420" width="170" height="300">
            <path
              d="M70 30 Q50 60 60 120 Q72 200 60 290 Q48 370 80 400 L160 400 Q192 370 180 290 Q168 200 180 120 Q190 60 170 30 Q120 5 70 30 Z"
              fill="rgba(45,74,54,0.04)"
              stroke="rgba(45,74,54,0.18)"
              strokeWidth="0.6"
              strokeDasharray="2 3"
            />
            <line
              x1="120"
              y1="70"
              x2="120"
              y2="380"
              stroke="#5C645B"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            {[
              { y: 90, label: 'C', warn: false },
              { y: 210, label: 'D', warn: false },
              { y: 340, label: 'L', warn: isWarn },
            ].map(({ y, label, warn }) => (
              <g key={label}>
                <circle
                  cx="120"
                  cy={y}
                  r={warn ? 38 : 32}
                  fill={warn ? 'rgba(200,98,60,0.14)' : 'rgba(45,74,54,0.10)'}
                  stroke={warn ? '#C8623C' : '#2D4A36'}
                  strokeWidth="0.8"
                  strokeDasharray="2 3"
                />
                <circle
                  cx="120"
                  cy={y}
                  r="22"
                  fill={warn ? '#C8623C' : '#2D4A36'}
                  stroke={warn ? '#E8A685' : '#4D6B55'}
                  strokeWidth="1"
                />
                <text
                  x="120"
                  y={y + 5}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="13"
                  fontWeight="500"
                >
                  {label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="space-y-7 text-right">
          {['Sensor 1 · 7A', 'Sensor 2 · 7B', 'Sensor 3 · 7C'].map((s) => (
            <div key={s} className="rounded-md border border-sand bg-cream-bone px-4 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                {s}
              </p>
              <p className="text-base font-medium text-ink">MPU-6050</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-5 border-t border-sand pt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-moss" />
          Adecuada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-terracotta" />
          Desviada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink-faint" />
          Sin datos
        </span>
      </div>
    </div>
  )
}

interface UnlinkedDashboardProps {
  firstName: string
  now: Date
}

/**
 * Estado del dashboard cuando el usuario no tiene chaleco vinculado.
 * Evita mostrar lecturas y métricas que no le pertenecen.
 */
function UnlinkedDashboard({ firstName, now }: UnlinkedDashboardProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <p className="text-[14px] text-ink-soft">Buen día,</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{firstName}</h1>
        </div>
        <span className="text-right text-[13px] leading-tight text-ink-soft">
          {capitalize(dateFmt.format(now))}
          <br />
          <span className="text-ink-faint">{timeFmt.format(now)}</span>
        </span>
      </div>

      <div className="editorial-card p-10 text-center sm:p-14">
        <p className="label-mono">Sin lecturas</p>
        <h2 className="mx-auto mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-ink">
          Vincula tu chaleco para empezar a leer tu postura en vivo.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Pídele a tu administrador el código de vinculación y la dirección MAC del chaleco
          asignado. Mientras tanto, no tiene sentido mostrarte lecturas: podrían ser de otro
          dispositivo.
        </p>
        <div className="mt-8 inline-flex flex-wrap justify-center gap-3">
          <Link
            to="/vest"
            className="rounded-lg bg-moss px-5 py-3 text-[14px] font-semibold text-cream-bone transition-colors hover:bg-moss-deep"
          >
            Vincular el chaleco
          </Link>
          <Link
            to="/history"
            className="rounded-lg border border-sand bg-cream-bone px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink"
          >
            Revisar historial
          </Link>
        </div>
      </div>
    </div>
  )
}
