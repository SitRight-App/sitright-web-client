import { RecommendationsCard } from '@/features/recommendations/components/RecommendationsCard'
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations'
import { BreakReminder } from '../components/BreakReminder'
import { PostureAlert } from '../components/PostureAlert'
import { PostureIndicator } from '../components/PostureIndicator'
import { VestStatusBadge } from '../components/VestStatusBadge'
import { useBreakReminder } from '../hooks/useBreakReminder'
import { useCurrentPosture } from '../hooks/useCurrentPosture'
import { useProlongedBadPosture } from '../hooks/useProlongedBadPosture'
import { useVestStatus } from '../hooks/useVestStatus'

export function DashboardPage() {
  const { data: reading, isLoading, isError } = useCurrentPosture()

  const vestStatus = useVestStatus(reading)
  const { isAlertActive, dismiss: dismissAlert } = useProlongedBadPosture(reading)
  const { showReminder, dismiss: dismissReminder } = useBreakReminder(vestStatus, reading)
  const { data: recommendations } = useRecommendations(reading?.posture_class)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">Monitoreo postural en tiempo real</p>
        </div>
        <VestStatusBadge status={vestStatus} batteryPercent={reading?.battery_percent} />
      </div>

      {isError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          No se pudo conectar con el backend. Verifica que el servicio esté disponible.
        </div>
      )}

      {isAlertActive && <PostureAlert onDismiss={dismissAlert} />}
      {showReminder && <BreakReminder onDismiss={dismissReminder} />}

      <PostureIndicator reading={reading ?? null} isLoading={isLoading} />

      {recommendations && recommendations.length > 0 && (
        <RecommendationsCard
          recommendations={recommendations}
          postureClass={reading?.posture_class ?? 'indeterminate'}
        />
      )}
    </div>
  )
}
