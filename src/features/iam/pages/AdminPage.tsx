import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { parseServerDate } from '@/shared/lib/parseServerDate'
import { staggerContainer, staggerItem } from '@/shared/ui/motion'
import { useToast } from '@/shared/ui/toast'
import type { UserStatusFilter } from '../services/adminService'
import { useAdminStats, useAllUsers, useDeactivateUser } from '../hooks/useAdmin'
import type { AuthUser } from '../types/auth'

type StatusFilterOption = 'all' | UserStatusFilter

const STATUS_FILTER_LABELS: Record<StatusFilterOption, string> = {
  all: 'Todos',
  active: 'Activos',
  inactive: 'Inactivos',
}

const longDateFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const shortDateFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function AdminPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all')
  const { data, isLoading, isError } = useAllUsers(
    statusFilter === 'all' ? undefined : statusFilter,
  )
  const { data: adminStats } = useAdminStats()

  const stats = useMemo(() => {
    const users = data?.users ?? []
    return {
      total: data?.total ?? 0,
      admins: users.filter((u) => u.role === 'admin').length,
      workers: users.filter((u) => u.role === 'worker').length,
      active: users.filter((u) => u.is_active).length,
    }
  }, [data])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-sand pb-6">
        <div>
          <p className="label-mono">Administración</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink sm:text-[40px]">
            Gestión <span className="text-moss">del sistema</span>
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-moss/25 bg-moss/10 px-4 py-2 text-[13px] font-medium text-moss">
          <span className="h-2 w-2 rounded-full bg-moss" />
          Acceso administrador
        </span>
      </div>

      {isError && (
        <p className="mt-6 rounded-lg border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo cargar el directorio de usuarios.
        </p>
      )}

      {isLoading ? (
        <AdminSkeleton />
      ) : (
        <>
          {/* Métricas globales del piloto. Una sola fila: las 3 cifras
              principales + el desglose por rol que le aporta contexto al
              admin. */}
          <motion.div
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <StatCard
              title="Usuarios activos"
              value={(adminStats?.active_users ?? stats.active).toString()}
              dark
            />
            <StatCard
              title="Sesiones totales"
              value={(adminStats?.total_sessions ?? 0).toString()}
            />
            <StatCard
              title="Postura adecuada (prom.)"
              value={
                adminStats?.average_adequate_percentage !== undefined &&
                adminStats?.average_adequate_percentage !== null
                  ? `${Math.round(adminStats.average_adequate_percentage)}%`
                  : '—'
              }
            />
            <StatCard title="Trabajadores" value={stats.workers.toString()} />
            <StatCard title="Administradores" value={stats.admins.toString()} />
          </motion.div>

          <section className="mt-4 rounded-xl border border-sand bg-cream-bone p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-sand pb-4">
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                Usuarios del sistema
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="group"
                  aria-label="Filtrar por estado"
                  className="inline-flex rounded-full border border-sand bg-cream p-1"
                >
                  {(Object.keys(STATUS_FILTER_LABELS) as StatusFilterOption[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStatusFilter(option)}
                      aria-pressed={statusFilter === option}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        statusFilter === option
                          ? 'bg-moss text-cream-bone'
                          : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {STATUS_FILTER_LABELS[option]}
                    </button>
                  ))}
                </div>
                <span className="text-[13px] text-ink-soft">
                  {stats.total} {stats.total === 1 ? 'cuenta' : 'cuentas'}
                </span>
              </div>
            </div>

            {data && data.users.length > 0 && <UsersTable users={data.users} />}
            {data && data.users.length === 0 && (
              <div className="rounded-xl border border-sand bg-cream p-10 text-center">
                <p className="text-xl font-semibold tracking-tight text-ink">
                  {statusFilter === 'all'
                    ? 'Aún no hay usuarios registrados en el sistema.'
                    : 'No hay usuarios que coincidan con este filtro.'}
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  {statusFilter === 'all'
                    ? 'Cuando alguien se registre desde la pantalla pública, aparecerá aquí.'
                    : 'Prueba con otro estado.'}
                </p>
                {statusFilter === 'all' && (
                  <Link
                    to="/register"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-moss px-5 py-3 text-[14px] font-semibold text-cream-bone transition hover:bg-moss-deep active:scale-[0.97]"
                  >
                    Invitar al primer usuario
                  </Link>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  dark?: boolean
}

function StatCard({ title, value, dark = false }: StatCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={`rounded-xl border p-5 ${
        dark
          ? 'border-moss-deep bg-moss text-cream-bone'
          : 'border-sand bg-cream-bone text-ink'
      }`}
    >
      <p
        className={`mb-3 text-[13px] font-medium ${
          dark ? 'text-cream-bone/75' : 'text-ink-soft'
        }`}
      >
        {title}
      </p>
      <p className="font-mono text-[34px] font-semibold leading-none tabular-nums tracking-tight">
        {value}
      </p>
    </motion.div>
  )
}

function UsersTable({ users }: { users: AuthUser[] }) {
  const deactivate = useDeactivateUser()
  const toast = useToast()

  const handleDeactivate = (u: AuthUser) => {
    // Confirmación previa.
    if (!confirm(`¿Desactivar la cuenta de ${u.name}? El usuario no podrá iniciar sesión hasta ser reactivada.`)) {
      return
    }
    deactivate.mutate(u.id, {
      onSuccess: () => toast.success('Cuenta desactivada', `${u.name} no podrá iniciar sesión.`),
      onError: (err) => {
        toast.error(
          'No se pudo desactivar',
          err instanceof Error ? err.message : 'Reintenta en unos segundos',
        )
      },
    })
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[1.3fr_1fr_90px_100px_120px_130px_120px_100px] gap-5 border-b border-sand px-3 pb-3 text-[12px] font-medium text-ink-soft">
          <span>Nombre</span>
          <span>Correo</span>
          <span>Rol</span>
          <span>Estado</span>
          <span>Alta</span>
          <span>Última sesión</span>
          <span>Chaleco</span>
          <span />
        </div>
        <ul className="divide-y divide-sand">
          {users.map((u) => (
            <li
              key={u.id}
              className="grid grid-cols-[1.3fr_1fr_90px_100px_120px_130px_120px_100px] items-center gap-5 px-3 py-4 transition-colors hover:bg-cream"
            >
              <span className="text-[15px] font-medium text-ink">{u.name}</span>
              <span className="text-[13px] text-ink-soft">{u.email}</span>
              <RoleBadge role={u.role} />
              <ActiveBadge active={u.is_active} />
              <span className="text-[13px] tabular-nums text-ink-soft">
                {longDateFmt.format(parseServerDate(u.created_at))}
              </span>
              <span className="text-[13px] tabular-nums text-ink-soft">
                {u.last_session_at
                  ? shortDateFmt.format(parseServerDate(u.last_session_at))
                  : <span className="text-ink-faint">sin sesiones</span>}
              </span>
              <VestSummary vest={u.linked_vest ?? null} />
              {u.role !== 'admin' && u.is_active && (
                <button
                  type="button"
                  onClick={() => handleDeactivate(u)}
                  disabled={deactivate.isPending}
                  className="inline-flex w-fit items-center rounded-lg border border-terracotta/40 bg-terracotta/10 px-3 py-1.5 text-[13px] font-medium text-terracotta-deep transition-colors hover:bg-terracotta/15 disabled:opacity-50"
                >
                  Desactivar
                </button>
              )}
              {(u.role === 'admin' || !u.is_active) && <span />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: 'admin' | 'worker' }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${
        isAdmin
          ? 'border border-terracotta/40 bg-terracotta/10 text-terracotta-deep'
          : 'border border-moss/25 bg-moss/10 text-moss'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? 'bg-terracotta' : 'bg-moss'}`} />
      {isAdmin ? 'Admin' : 'Trabajador'}
    </span>
  )
}

function VestSummary({ vest }: { vest: AuthUser['linked_vest'] | null }) {
  if (!vest) {
    return (
      <span className="text-[13px] text-ink-faint">sin chaleco</span>
    )
  }
  return (
    <span className="inline-flex flex-col">
      <span className="font-mono text-[12px] tabular-nums text-ink">
        {vest.mac_address ?? '—'}
      </span>
      <span className="text-[12px] text-ink-faint">
        {vest.is_calibrated ? 'Calibrado' : 'Sin calibrar'}
      </span>
    </span>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${
        active
          ? 'border border-moss/25 bg-moss/10 text-moss'
          : 'border border-sand bg-cream text-ink-soft'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-moss' : 'bg-ink-faint'}`} />
      {active ? 'Activo' : 'Pausado'}
    </span>
  )
}

function AdminSkeleton() {
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonTextLine width="60%" className="mb-4" />
            <Skeleton width="40%" height={40} />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard className="mt-4 p-7">
        <SkeletonTextLine width="30%" />
        <Skeleton width="50%" height={28} className="mt-3" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={36} />
          ))}
        </div>
      </SkeletonCard>
    </>
  )
}
