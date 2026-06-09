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
import { useBreakReminder } from '../hooks/useBreakReminder'
import { useCurrentPosture } from '../hooks/useCurrentPosture'
import { useProlongedBadPosture } from '../hooks/useProlongedBadPosture'
import { useRecentReadings } from '../hooks/useRecentReadings'
import { useVestStatus, type VestStatus } from '../hooks/useVestStatus'
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
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 5) return 'hace un momento'
  if (sec < 60) return `hace ${sec} s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} día${d === 1 ? '' : 's'}`
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
      {/* Encabezado delgado — el estado del chaleco lo lleva la tarjeta protagonista */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3">
        <div>
          <p className="text-[14px] text-ink-soft">Buen día,</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{firstName}</h1>
        </div>
        <span className="hidden text-right text-[13px] leading-tight text-ink-soft sm:block">
          {capitalize(dateFmt.format(now))}
          <br />
          <span className="text-ink-faint">{timeFmt.format(now)}</span>
        </span>
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
        {/* Fila 1 — Protagonista (postura en vivo + columna) · Línea de tiempo (más ancha) */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          <motion.div variants={staggerItem}>
            <PostureCard
              reading={reading ?? null}
              status={vestStatus}
              isLoading={isLoading}
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <PostureTimeline
              readings={recent.data ?? []}
              isLoading={recent.isLoading}
              isError={recent.isError}
            />
          </motion.div>
        </div>

        {/* Fila 2 — Recomendaciones (amplias) · Control de sesión (cuadrado) */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <motion.div variants={staggerItem}>
            {recommendations && recommendations.length > 0 ? (
              <RecommendationsCard
                recommendations={recommendations}
                postureClass={reading?.posture_class ?? 'indeterminate'}
                maxVisible={3}
              />
            ) : (
              <div className="editorial-card flex h-full flex-col justify-center p-6">
                <p className="label-mono">Recomendaciones</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Cuando el chaleco detecte una desviación, aquí verás los ajustes
                  ergonómicos sugeridos.
                </p>
              </div>
            )}
          </motion.div>
          <motion.div variants={staggerItem}>
            <SessionControls />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

interface PostureCardProps {
  reading: LatestReading | null
  status: VestStatus
  isLoading: boolean
}

/**
 * Tarjeta protagonista del dashboard: fusiona el estado en vivo (título grande,
 * batería, conexión) con la visualización de la columna por zona. Antes eran dos
 * tarjetas separadas que decían lo mismo ("¿cómo está mi postura ahora?"); al
 * unirlas se elimina la redundancia y el hueco muerto de la columna.
 *
 * Sólo presenta la postura como "en vivo" cuando el chaleco está realmente
 * conectado (última lectura ≤ 30 s). Si la lectura es vieja, pasa a estado
 * neutro: no tiene sentido mostrar una postura de hace horas como si fuera la
 * actual.
 */
function PostureCard({ reading, status, isLoading }: PostureCardProps) {
  const cls: PostureClass = reading?.posture_class ?? 'indeterminate'
  const isWarn = isDeviation(cls)
  const isLive = (status === 'connected' || status === 'battery_low') && reading !== null

  // El color lo llevan los acentos (título, nodos, chips), no un bloque de color
  // completo: es más coherente con la paleta clínica y mantiene legible el diagrama.
  const headlineTone = !isLive ? 'text-ink' : isWarn ? 'text-terracotta-deep' : 'text-moss'
  const dotTone = isLive ? 'bg-moss' : 'bg-ink-faint'

  // Estado neutro (sin conexión / sin lecturas / cargando).
  let title = 'Sin lecturas'
  let sub = 'Aún no llegan lecturas del chaleco.'
  if (isLive && reading) {
    title = POSTURE_LABELS[cls]
    sub = `${POSTURE_HEADLINES[cls]} Última lectura ${timeSince(reading.timestamp)}.`
  } else if (isLoading && reading === null) {
    sub = 'Conectando con el chaleco…'
  } else if (reading !== null) {
    title = 'Chaleco sin conexión'
    sub = `El chaleco no está enviando lecturas. Última ${timeSince(reading.timestamp)}.`
  }

  return (
    <section className="editorial-card flex h-full flex-col bg-cream-deep p-6 sm:p-7">
      {/* Encabezado: estado en vivo */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotTone} opacity-60`} />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${dotTone}`} />
            </span>
            {isLive ? 'En vivo · Postura actual' : 'Estado del chaleco'}
          </div>
          <h2 className={`mt-2.5 text-[28px] font-semibold leading-none tracking-tight sm:text-[32px] ${headlineTone}`}>
            {title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{sub}</p>
        </div>

        {isLive && reading && (
          <div className="shrink-0 text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Batería</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink">
              {reading.battery_percent}%
            </p>
          </div>
        )}
      </div>

      {/* Cuerpo: diagrama (más grande) + zonas alineadas con cada nodo.
          El bloque interno se fija a la altura del diagrama y se centra en el
          espacio disponible, de modo que las zonas se reparten a la par de los
          nodos (no se sobre-espacian cuando la tarjeta crece). */}
      <div className="mt-5 flex flex-1 items-center border-t border-sand pt-5">
        <div className="flex w-full items-stretch gap-6" style={{ height: 256 }}>
          <div className="grid shrink-0 place-items-center">
            <SpineDiagram isLive={isLive} isWarn={isWarn} />
          </div>

          <div className="flex flex-1 flex-col justify-between">
            {(['Cervical', 'Dorsal', 'Lumbar'] as const).map((zone, i) => {
            const isAlertZone = isWarn && i === 2
            const boxClass = isAlertZone
              ? 'border-terracotta/40 bg-terracotta/10'
              : 'border-sand bg-cream-bone'
            const textClass = !isLive
              ? 'text-ink-faint'
              : isAlertZone
                ? 'text-terracotta-deep'
                : 'text-moss'
            const dotClass = !isLive ? 'bg-ink-faint' : isAlertZone ? 'bg-terracotta' : 'bg-moss'
            const stateLabel = !isLive ? 'Sin datos' : isAlertZone ? 'Desviada' : 'Adecuada'
            return (
              <div
                key={zone}
                className={`flex items-center justify-between rounded-md border px-4 py-3 ${boxClass}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {zone}
                </p>
                <p className={`flex items-center gap-2 text-[15px] font-medium ${textClass}`}>
                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                  {stateLabel}
                </p>
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Silueta de columna con tres nodos (cervical · dorsal · lumbar). */
function SpineDiagram({ isLive, isWarn }: { isLive: boolean; isWarn: boolean }) {
  return (
    <svg viewBox="0 0 240 420" width="146" height="256" aria-hidden>
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
      ].map(({ y, label, warn }) => {
        // Sin conexión → nodo gris neutro; con conexión → verde o terracota.
        const halo = !isLive
          ? 'rgba(92,100,91,0.10)'
          : warn
            ? 'rgba(200,98,60,0.14)'
            : 'rgba(45,74,54,0.10)'
        const haloStroke = !isLive ? '#5C645B' : warn ? '#C8623C' : '#2D4A36'
        const coreFill = !isLive ? '#5C645B' : warn ? '#C8623C' : '#2D4A36'
        const coreStroke = !isLive ? '#8A9088' : warn ? '#E8A685' : '#4D6B55'
        return (
          <g key={label}>
            <circle
              cx="120"
              cy={y}
              r={warn ? 38 : 32}
              fill={halo}
              stroke={haloStroke}
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
            <circle cx="120" cy={y} r="22" fill={coreFill} stroke={coreStroke} strokeWidth="1" />
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
        )
      })}
    </svg>
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
