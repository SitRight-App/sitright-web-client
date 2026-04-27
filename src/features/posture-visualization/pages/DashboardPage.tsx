import { StatCard } from '@/shared/ui/Card'
import { PostureIndicator } from '../components/PostureIndicator'
import { useCurrentPosture } from '../hooks/useCurrentPosture'

export function DashboardPage() {
  const { data: reading, isLoading, isError } = useCurrentPosture()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitoreo postural en tiempo real — actualización cada 5s
        </p>
      </div>

      {isError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          No se pudo conectar con el backend. Verifica que esté corriendo.
        </div>
      )}

      <PostureIndicator reading={reading ?? null} isLoading={isLoading} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          title="Chaleco"
          value={reading ? 'Activo' : '—'}
          subtitle={reading?.vest_id}
        />
        <StatCard
          title="Última clase"
          value={reading?.posture_class ?? '—'}
        />
        <StatCard
          title="Confianza"
          value={reading ? `${Math.round(reading.confidence * 100)}%` : '—'}
          subtitle="modelo rf_v1"
        />
      </div>
    </div>
  )
}
