import { motion } from 'framer-motion'
import { useAuth } from '@/features/iam/context/AuthContext'
import { RecommendationsCard } from '@/features/recommendations/components/RecommendationsCard'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import { SessionControls } from '@/features/session-history/components/SessionControls'
import { staggerContainer, staggerItem } from '@/shared/ui/motion'
import { BreakReminder } from '../components/BreakReminder'
import { PostureAlert } from '../components/PostureAlert'
import { PostureIndicator } from '../components/PostureIndicator'
import { PostureTimeline } from '../components/PostureTimeline'
import { VestStatusBadge } from '../components/VestStatusBadge'
import { useBreakReminder } from '../hooks/useBreakReminder'
import { useCurrentPosture } from '../hooks/useCurrentPosture'
import { useProlongedBadPosture } from '../hooks/useProlongedBadPosture'
import { useRecentReadings } from '../hooks/useRecentReadings'
import { useVestStatus } from '../hooks/useVestStatus'
import { POSTURE_HEADLINES, isDeviation } from '../types/posture'

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

export function DashboardPage() {
  const { user } = useAuth()
  const { data: reading, isLoading, isError } = useCurrentPosture()

  const vestStatus = useVestStatus(reading)
  const { isAlertActive, dismiss: dismissAlert } = useProlongedBadPosture(reading)
  const { showReminder, dismiss: dismissReminder } = useBreakReminder(vestStatus, reading)
  const { data: recommendations } = useRecommendations(reading?.posture_class)
  const recent = useRecentReadings({ limit: 60, refetchInterval: 5_000 })

  const headline = reading ? POSTURE_HEADLINES[reading.posture_class] : 'Aún sin lectura.'
  const isWarn = reading ? isDeviation(reading.posture_class) : false
  const firstName = user?.name.split(' ')[0] ?? 'Hola'

  const now = new Date()

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
        <div>
          <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Panel <span className="text-terracotta">›</span> Tiempo real
          </div>
          <h1 className="font-serif text-[44px] font-normal leading-[1] tracking-[-0.025em] text-ink">
            Buen día, {firstName}.
            <br />
            Tu columna está{' '}
            <em
              className={`italic font-normal ${isWarn ? 'text-terracotta' : 'text-moss'}`}
            >
              {headline.toLowerCase()}
            </em>
          </h1>
        </div>

        <div className="text-right">
          <VestStatusBadge status={vestStatus} batteryPercent={reading?.battery_percent} />
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.10em] text-ink-faint">
            {timeFmt.format(now)} — sesión activa
          </div>
          <div className="mt-1 font-serif text-xl tracking-tight text-ink">
            {capitalize(dateFmt.format(now))}
          </div>
        </div>
      </div>

      {isError && (
        <div className="mb-6 border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
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

      <motion.div
        className="grid gap-4 lg:grid-cols-[320px_1fr_360px]"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div variants={staggerItem} className="lg:row-span-2">
          <PostureIndicator reading={reading ?? null} isLoading={isLoading} />
        </motion.div>

        {/* Center column: large spine viz placeholder */}
        <motion.div
          variants={staggerItem}
          className="relative editorial-card overflow-hidden bg-cream-deep p-8 lg:row-span-2"
        >
          <span className="num-tag absolute right-5 top-5">№ 02</span>
          <p className="label-mono">Visualización vertebral</p>
          <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">
            Lectura cervical · dorsal · lumbar
          </h2>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
            <div className="space-y-7">
              {(['Cervical', 'Dorsal', 'Lumbar'] as const).map((zone, i) => {
                const isAlertZone = isWarn && i === 2
                return (
                  <div
                    key={zone}
                    className={`border-l ${isAlertZone ? 'border-terracotta' : 'border-moss'} py-1 pl-4`}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                      {zone} · {['C-zone', 'D-zone', 'L-zone'][i]}
                    </p>
                    <p
                      className={`font-serif text-base ${
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
              <svg viewBox="0 0 240 420" width="190" height="320">
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
                  stroke="#8A9088"
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
                      fill="#F4EFE6"
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
                <div key={s} className="border-r border-moss py-1 pr-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                    {s}
                  </p>
                  <p className="font-serif text-base text-ink">MPU-6050</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-dashed border-sand pt-5 font-mono text-[10px] uppercase tracking-[0.10em] text-ink-soft">
            <div className="flex gap-5">
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
            <span>tasa · 5 s</span>
          </div>
        </motion.div>

        {/* Right column: metrics card */}
        <motion.div variants={staggerItem} className="relative editorial-card p-7">
          <span className="num-tag absolute right-5 top-5">№ 03</span>
          <p className="label-mono">Lectura actual</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-serif text-[56px] font-normal leading-none tracking-[-0.04em] text-ink">
              {reading ? Math.round(reading.confidence * 100) : '—'}
            </span>
            {reading && <span className="font-serif text-2xl text-moss">%</span>}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            Confianza del modelo en la última clasificación. Las predicciones por debajo del 70%
            se marcan como indeterminadas.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-sand pt-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                Estado
              </p>
              <p className="mt-1 font-serif text-lg text-ink">
                {reading ? capitalize(POSTURE_HEADLINES[reading.posture_class]) : '—'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                Batería
              </p>
              <p className="mt-1 font-serif text-lg text-ink">
                {reading ? `${reading.battery_percent}%` : '—'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right column bottom: recommendations */}
        <motion.div variants={staggerItem}>
          {recommendations && recommendations.length > 0 && (
            <RecommendationsCard
              recommendations={recommendations}
              postureClass={reading?.posture_class ?? 'indeterminate'}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Bottom: session controls + timeline */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <SessionControls />
        <PostureTimeline
          readings={recent.data ?? []}
          isLoading={recent.isLoading}
          isError={recent.isError}
        />
      </div>
    </div>
  )
}
