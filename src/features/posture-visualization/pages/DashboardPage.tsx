import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/iam/context/AuthContext'
import { RecommendationsCard } from '@/features/recommendations/components/RecommendationsCard'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import { SessionControls } from '@/features/session-history/components/SessionControls'
import { useActiveSession } from '@/shared/hooks/useActiveSession'
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
import { playAlertSound } from '../lib/playAlertSound'
import { notifyEvent } from '../services/notifyEvent'
import type { LatestReading, PostureClass } from '../types/posture'
import {
  POSTURE_CORRECTION,
  POSTURE_HEADLINES,
  isDeviation,
} from '../types/posture'
import { SeatedFigure, type SeatedFigureZone } from '@/shared/ui/SeatedFigure'
import { Skeleton, SkeletonTextLine } from '@/shared/ui/Skeleton'

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

  // US008 AC — reproduce un sonido cuando la alerta de postura prolongada
  // pasa de inactiva a activa (flanco de subida), solo si las notificaciones
  // están habilitadas. Se compara contra el valor previo en vez de disparar
  // en cada render donde isAlertActive ya es true.
  const notificationsEnabled = user?.preferences.email_notifications !== false
  const wasAlertActiveRef = useRef(false)
  useEffect(() => {
    if (isAlertActive && !wasAlertActiveRef.current && notificationsEnabled) {
      playAlertSound()
      void notifyEvent('bad_posture_alert').catch(() => {})
    }
    wasAlertActiveRef.current = isAlertActive
  }, [isAlertActive, notificationsEnabled])

  // Avisa al backend cuando el recordatorio de pausa pasa de inactivo a
  // activo (flanco de subida), para que envíe el correo correspondiente.
  // Mismo criterio que la alerta de postura: no bloquea la UI ni se envía
  // si las notificaciones están deshabilitadas.
  const wasReminderShownRef = useRef(false)
  useEffect(() => {
    if (showReminder && !wasReminderShownRef.current && notificationsEnabled) {
      void notifyEvent('break_reminder').catch(() => {})
    }
    wasReminderShownRef.current = showReminder
  }, [showReminder, notificationsEnabled])
  const { data: recommendations } = useRecommendations(reading?.posture_class)
  const recent = useRecentReadings({
    limit: 60,
    refetchInterval: 5_000,
    enabled: hasVest,
  })

  const firstName = user?.name.split(' ')[0] ?? 'Hola'
  const now = new Date()
  // La columna de datos (línea de tiempo + recomendaciones) aparece al iniciar
  // una sesión; antes de eso, cada sección muestra su propio skeleton.
  const { data: activeSession } = useActiveSession()
  const sessionActive = activeSession != null

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
        <div className="mb-4 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep">
          No pudimos conectar. Revisa tu conexión a internet e inténtalo de nuevo.
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

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]"
      >
        {/* Columna "yo": control de sesión arriba (acción visible al toque) +
            postura en vivo (cuadrada, figura grande) debajo */}
        <div className="flex flex-col gap-4">
          <motion.div variants={staggerItem}>
            <SessionControls />
          </motion.div>
          <motion.div variants={staggerItem}>
            <PostureCard
              reading={reading ?? null}
              status={vestStatus}
              isLoading={isLoading}
            />
          </motion.div>
        </div>

        {/* Columna "datos": cada sección aparece al iniciar una sesión; antes,
            un skeleton que muestra qué se verá ahí. */}
        <div className="flex flex-col gap-4">
          <motion.div variants={staggerItem}>
            {sessionActive ? (
              <PostureTimeline
                readings={recent.data ?? []}
                isLoading={recent.isLoading}
                isError={recent.isError}
              />
            ) : (
              <TimelineSkeleton />
            )}
          </motion.div>
          <motion.div variants={staggerItem}>
            {!sessionActive ? (
              <RecommendationsSkeleton />
            ) : recommendations && recommendations.length > 0 ? (
              <RecommendationsCard
                recommendations={recommendations}
                postureClass={reading?.posture_class ?? 'indeterminate'}
                maxVisible={3}
              />
            ) : (
              <div className="editorial-card flex flex-col justify-center p-6">
                <p className="label-mono">Recomendaciones</p>
                <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
                  Cuando se detecte una desviación, aquí verás recomendaciones para corregirla.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

// Barras "fantasma" para el skeleton de la línea de tiempo.
const GHOST_BARS = [18, 26, 14, 30, 22, 28, 16, 24, 20, 30, 14, 26, 22, 18, 28, 16, 24, 20]

/**
 * Skeleton de la sección de línea de tiempo, mientras no haya sesión iniciada.
 * Imita su encabezado y su cinta de barras para anticipar qué aparecerá.
 */
function TimelineSkeleton() {
  return (
    <section className="editorial-card p-6 sm:p-7">
      <div className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
        <span className="h-2 w-2 rounded-full bg-ink-faint" />
        En vivo
      </div>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        Tu postura, minuto a minuto
      </h2>
      <div className="mt-5 flex h-14 items-end gap-1" aria-hidden>
        {GHOST_BARS.map((h, i) => (
          <Skeleton key={i} height={h} className="flex-1" />
        ))}
      </div>
      <div className="mt-3 flex justify-between" aria-hidden>
        <Skeleton width={34} height={9} />
        <Skeleton width={42} height={9} />
        <Skeleton width={34} height={9} />
      </div>
      <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
        Inicia una sesión para ver aquí tu postura minuto a minuto.
      </p>
    </section>
  )
}

/**
 * Skeleton de la sección de recomendaciones, mientras no haya sesión iniciada.
 * Imita las filas de recomendación (ícono + texto) que aparecerán.
 */
function RecommendationsSkeleton() {
  return (
    <section className="editorial-card p-6">
      <p className="label-mono">Recomendaciones</p>
      <div className="mt-4 space-y-3.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton circle height={22} />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <SkeletonTextLine width={['72%', '60%', '54%'][i]} />
              <Skeleton width="92%" height={10} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
        Cuando inicies una sesión y se detecte una desviación, aquí verás cómo corregirla.
      </p>
    </section>
  )
}

interface PostureCardProps {
  reading: LatestReading | null
  status: VestStatus
  isLoading: boolean
}

/**
 * Zona de la columna que enciende cada desviación (índice en el orden
 * Cervical=0 · Dorsal=1 · Lumbar=2). Coincide con AFFECTED_ZONE de
 * recomendaciones: inclinación frontal → cervical, reclinación excesiva →
 * lumbar. Antes el dashboard marcaba siempre la lumbar para cualquier
 * desviación, así que forward_slouch (clase cervical) encendía la zona
 * equivocada.
 */
const ALERT_INDEX: Partial<Record<PostureClass, number>> = {
  forward_slouch: 0,
  excessive_recline: 2,
}

// Inclinación ilustrativa del torso en la figura "Tu postura ahora" según la
// clase actual (encorvado hacia adelante / reclinado hacia atrás). Moderada,
// no es el ángulo real medido.
const LIVE_LEAN: Partial<Record<PostureClass, number>> = {
  forward_slouch: 12,
  excessive_recline: -12,
}

// Título en vivo en lenguaje cotidiano. 'adequate' conserva 'Postura correcta'
// por requisito del backlog (HU-06 AC1).
const LIVE_TITLE: Record<PostureClass, string> = {
  adequate: 'Postura correcta',
  forward_slouch: 'Inclinación hacia adelante',
  excessive_recline: 'Reclinación excesiva',
  indeterminate: 'Sin datos',
}

/** Tono del nodo de una zona en la figura del dashboard (estado en vivo). */
function liveZone(idx: number, isLive: boolean, alertIdx: number): SeatedFigureZone {
  if (!isLive) return { tone: 'neutral' }
  return { tone: idx === alertIdx ? 'marcada' : 'ok' }
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
  // Índice de la zona desviada según la clase (cervical=0 · dorsal=1 · lumbar=2).
  const alertIdx = isLive ? ALERT_INDEX[cls] ?? -1 : -1
  const liveLean = isLive ? LIVE_LEAN[cls] ?? 0 : 0

  // El color lo llevan los acentos (título, nodos, chips), no un bloque de color
  // completo: es más coherente con la paleta clínica y mantiene legible el diagrama.
  const headlineTone = !isLive ? 'text-ink' : isWarn ? 'text-terracotta-deep' : 'text-moss'
  const dotTone = isLive ? 'bg-moss' : 'bg-ink-faint'

  // Estado neutro (sin conexión / sin lecturas / cargando).
  let title = 'Sin datos'
  let sub = 'Todavía no llegan datos del chaleco.'
  if (isLive && reading) {
    title = LIVE_TITLE[cls]
    sub = `${POSTURE_HEADLINES[cls]} Última lectura ${timeSince(reading.timestamp)}.`
  } else if (isLoading && reading === null) {
    sub = 'Conectando con el chaleco…'
  } else if (reading !== null) {
    title = 'Chaleco sin conexión'
    sub = `El chaleco no está enviando datos. Última lectura ${timeSince(reading.timestamp)}.`
  }

  return (
    <section className="editorial-card flex h-full flex-col bg-cream-deep p-6 sm:p-7">
      {/* Encabezado: estado en vivo */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotTone} opacity-60`} />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${dotTone}`} />
            </span>
            {isLive ? 'Cómo estás ahora' : 'Estado del chaleco'}
          </div>
          <h2 className={`mt-2.5 text-[28px] font-semibold leading-none tracking-tight sm:text-[32px] ${headlineTone}`}>
            {title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{sub}</p>
        </div>

        {isLive && reading && (
          <div className="shrink-0 text-right">
            <p className="text-[13px] font-medium text-ink-faint">Batería</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink">
              {reading.battery_percent}%
            </p>
          </div>
        )}
      </div>

      {/* Cuerpo: figura humana grande (encuadre compacto) + zonas en una columna
          ajustada (sin estirarse a todo el ancho ni espaciarse de más). */}
      <div className="mt-5 flex flex-1 items-center gap-5 border-t border-sand pt-5">
        {isLive ? (
          // Comparativa en vivo: referencia "Correcta" + "Tu postura ahora".
          <div className="grid shrink-0 grid-cols-2 gap-3" style={{ width: 280 }}>
            <figure className="flex flex-col items-center">
              <SeatedFigure
                tight
                className="w-full max-w-[120px]"
                cervical={{ tone: 'ok' }}
                dorsal={{ tone: 'ok' }}
                lumbar={{ tone: 'ok' }}
              />
              <figcaption className="mt-1 text-[12px] font-medium text-ink-soft">Correcta</figcaption>
            </figure>
            <figure className="flex flex-col items-center">
              <SeatedFigure
                tight
                className="w-full max-w-[120px]"
                cervical={liveZone(0, isLive, alertIdx)}
                dorsal={liveZone(1, isLive, alertIdx)}
                lumbar={liveZone(2, isLive, alertIdx)}
                headTilt={alertIdx === 0 ? 22 : 0}
                lean={liveLean}
              />
              <figcaption
                className={`mt-1 text-[12px] font-medium ${isWarn ? 'text-terracotta-deep' : 'text-moss'}`}
              >
                Tu postura
              </figcaption>
            </figure>
          </div>
        ) : (
          <div className="grid shrink-0 place-items-center" style={{ width: 280 }}>
            <SeatedFigure
              tight
              cervical={liveZone(0, isLive, alertIdx)}
              dorsal={liveZone(1, isLive, alertIdx)}
              lumbar={liveZone(2, isLive, alertIdx)}
              headTilt={alertIdx === 0 ? 22 : 0}
            />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2.5">
            {(['Cuello', 'Espalda media', 'Espalda baja'] as const).map((zone, i) => {
            const isAlertZone = i === alertIdx
            const boxClass = isAlertZone
              ? 'border-terracotta/40 bg-terracotta/10'
              : 'border-sand bg-cream-bone'
            const textClass = !isLive
              ? 'text-ink-faint'
              : isAlertZone
                ? 'text-terracotta-deep'
                : 'text-moss'
            const dotClass = !isLive ? 'bg-ink-faint' : isAlertZone ? 'bg-terracotta' : 'bg-moss'
            const stateLabel = !isLive ? 'Sin datos' : isAlertZone ? 'Fuera de lugar' : 'Bien'
            return (
              <div
                key={zone}
                className={`flex items-center justify-between rounded-md border px-4 py-3 ${boxClass}`}
              >
                <p className="text-[14px] font-medium text-ink">{zone}</p>
                <p className={`flex items-center gap-2 text-[15px] font-medium ${textClass}`}>
                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                  {stateLabel}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Qué hacer ahora — micro-guía accionable en vivo (no es la recomendación
          oficial, solo el gesto correctivo inmediato según la postura actual). */}
      {isLive && POSTURE_CORRECTION[cls] && (
        <div className="mt-5 flex items-start gap-2.5 border-t border-sand pt-4">
          <span
            className={`mt-px shrink-0 text-[14px] font-semibold ${
              isWarn ? 'text-terracotta-deep' : 'text-moss'
            }`}
          >
            Ahora:
          </span>
          <p className="text-[15px] leading-relaxed text-ink-soft">{POSTURE_CORRECTION[cls]}</p>
        </div>
      )}
    </section>
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
        <p className="label-mono">Sin datos</p>
        <h2 className="mx-auto mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-ink">
          Vincula tu chaleco para empezar a leer tu postura en vivo.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-ink-soft">
          Pídele a tu administrador el código de tu chaleco. Apenas lo vincules, verás tu postura en
          vivo aquí.
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
