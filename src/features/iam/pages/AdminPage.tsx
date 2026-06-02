import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Skeleton, SkeletonCard, SkeletonTextLine } from '@/shared/ui/Skeleton'
import { staggerContainer, staggerItem } from '@/shared/ui/motion'
import { useToast } from '@/shared/ui/toast'
import { useAdminStats, useAllUsers, useDeactivateUser } from '../hooks/useAdmin'
import type { AuthUser } from '../types/auth'

const longDateFmt = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function AdminPage() {
  const { data, isLoading, isError } = useAllUsers()
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
      <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Panel <span className="text-terracotta">›</span> Administración
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-sand pb-6">
        <h1 className="font-serif text-[56px] font-normal leading-[0.95] tracking-[-0.03em] text-ink">
          Gestión <em className="italic text-moss">del sistema.</em>
        </h1>
        <span className="inline-flex items-center gap-2.5 rounded-full border border-moss/25 bg-moss/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-moss">
          <span className="h-2 w-2 rounded-full bg-moss" />
          Acceso administrador
        </span>
      </div>

      {isError && (
        <p className="mt-6 border-l-2 border-terracotta bg-terracotta/10 px-4 py-3 text-sm text-terracotta-deep">
          No se pudo cargar el directorio de usuarios.
        </p>
      )}

      {isLoading ? (
        <AdminSkeleton />
      ) : (
        <>
          {/* HU-22 AC1 — métricas globales del piloto: usuarios activos,
              sesiones totales y promedio postura adecuada general. */}
          <motion.div
            className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <StatCard
              num="№ 01"
              title="Usuarios activos"
              value={(adminStats?.active_users ?? stats.active).toString()}
              dark
            />
            <StatCard
              num="№ 02"
              title="Sesiones totales"
              value={(adminStats?.total_sessions ?? 0).toString()}
            />
            <StatCard
              num="№ 03"
              title="Postura adecuada (promedio)"
              value={
                adminStats?.average_adequate_percentage !== undefined &&
                adminStats?.average_adequate_percentage !== null
                  ? `${Math.round(adminStats.average_adequate_percentage)}%`
                  : '—'
              }
            />
          </motion.div>

          <motion.div
            className="mt-3.5 grid gap-3.5 sm:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <StatCard num="№ 04" title="Total usuarios" value={stats.total.toString()} />
            <StatCard num="№ 05" title="Trabajadores" value={stats.workers.toString()} />
            <StatCard num="№ 06" title="Administradores" value={stats.admins.toString()} />
          </motion.div>

          <section className="relative mt-6 editorial-card p-7">
            <span className="num-tag absolute right-5 top-5">№ 05</span>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-dashed border-sand pb-4">
              <div>
                <p className="label-mono">Directorio</p>
                <h2 className="mt-1.5 font-serif text-2xl tracking-tight text-ink">
                  Usuarios del sistema
                </h2>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                {stats.total} {stats.total === 1 ? 'cuenta' : 'cuentas'}
              </span>
            </div>

            {data && data.users.length > 0 && <UsersTable users={data.users} />}
            {data && data.users.length === 0 && (
              <div className="border border-dashed border-sand p-10 text-center">
                <p className="font-serif text-[24px] tracking-tight text-ink">
                  Aún no hay usuarios registrados en el sistema.
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  Cuando alguien se registre desde la pantalla pública, aparecerá aquí.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

interface StatCardProps {
  num: string
  title: string
  value: string
  dark?: boolean
}

function StatCard({ num, title, value, dark = false }: StatCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={`relative rounded border p-5 ${
        dark ? 'border-moss bg-moss text-cream' : 'border-sand bg-cream-bone text-ink'
      }`}
    >
      <span
        className={`absolute right-4 top-4 font-mono text-[10px] uppercase tracking-[0.16em] ${
          dark ? 'text-cream/55' : 'text-ink-faint'
        }`}
      >
        {num}
      </span>
      <p
        className={`mb-4 font-mono text-[10px] uppercase tracking-[0.18em] ${
          dark ? 'text-sand' : 'text-ink-soft'
        }`}
      >
        {title}
      </p>
      <p className="font-serif text-[44px] leading-none tracking-[-0.035em]">{value}</p>
    </motion.div>
  )
}

function UsersTable({ users }: { users: AuthUser[] }) {
  const deactivate = useDeactivateUser()
  const toast = useToast()

  const handleDeactivate = (u: AuthUser) => {
    // HU-30 — confirmación previa.
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
    <div>
      <div className="grid grid-cols-[1.4fr_1fr_110px_110px_120px_100px] gap-5 border-b border-sand px-3 pb-3 font-mono text-[9px] uppercase tracking-[0.20em] text-ink-faint">
        <span>Nombre</span>
        <span>Correo</span>
        <span>Rol</span>
        <span>Estado</span>
        <span>Alta</span>
        <span />
      </div>
      <ul>
        {users.map((u) => (
          <li
            key={u.id}
            className="grid grid-cols-[1.4fr_1fr_110px_110px_120px_100px] items-center gap-5 border-b border-sand px-3 py-4 transition-colors hover:bg-cream/60"
          >
            <span className="font-serif text-[15px] text-ink">{u.name}</span>
            <span className="font-mono text-[12px] text-ink-soft">{u.email}</span>
            <RoleBadge role={u.role} />
            <ActiveBadge active={u.is_active} />
            <span className="font-mono text-[11px] text-ink-soft">
              {longDateFmt.format(new Date(u.created_at))}
            </span>
            {u.role !== 'admin' && u.is_active && (
              <button
                type="button"
                onClick={() => handleDeactivate(u)}
                disabled={deactivate.isPending}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-terracotta-deep underline-offset-2 hover:underline disabled:opacity-50"
              >
                Desactivar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RoleBadge({ role }: { role: 'admin' | 'worker' }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${
        isAdmin
          ? 'border border-terracotta-soft bg-terracotta-soft/15 text-terracotta-deep'
          : 'border border-moss/25 bg-moss/10 text-moss'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? 'bg-terracotta' : 'bg-moss'}`} />
      {isAdmin ? 'Admin' : 'Trabajador'}
    </span>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${
        active ? 'bg-moss/10 text-moss' : 'bg-sand/30 text-ink-soft'
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
      <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonTextLine width="60%" className="mb-4" />
            <Skeleton width="40%" height={40} />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard className="mt-6 p-7">
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
