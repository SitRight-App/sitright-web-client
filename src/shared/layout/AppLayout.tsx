import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  History,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
  Settings as SettingsIcon,
  Shirt,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/iam/context/AuthContext'
import { NotificationsBell } from '@/features/iam/components/NotificationsBell'
import { ActiveSessionPill } from '@/features/session-history/components/ActiveSessionPill'
import { Brandmark } from '@/shared/ui/Brandmark'
import { pageTransition } from '@/shared/ui/motion'

type NavItem = {
  to: string
  label: string
  end?: boolean
  Icon: LucideIcon | ComponentType<{ className?: string }>
  adminOnly?: boolean
}

/**
 * Navegación única de la app: una sola barra lateral con icono + etiqueta.
 * (Antes había topbar y sidebar duplicando las mismas secciones.)
 */
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Tiempo real', end: true, Icon: Activity },
  { to: '/history', label: 'Historial', Icon: History },
  { to: '/recommendations', label: 'Recomendaciones', Icon: Sparkles },
  { to: '/vest', label: 'Chaleco', Icon: Shirt },
  { to: '/settings', label: 'Configuración', Icon: SettingsIcon },
  { to: '/admin', label: 'Administración', Icon: ShieldCheck, adminOnly: true },
]

function userInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const items = NAV_ITEMS.filter((p) => !p.adminOnly || user?.role === 'admin')

  return (
    <div className="grid min-h-screen grid-cols-[64px_1fr] grid-rows-[64px_1fr] lg:grid-cols-[220px_1fr]">
      {/* Marca (esquina superior izquierda, sobre el sidebar) */}
      <div
        data-print-hide
        className="flex items-center gap-3 bg-moss-deep px-4 text-cream-bone lg:px-5"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream-bone/10 ring-1 ring-cream-bone/15">
          <Brandmark size={22} />
        </div>
        <span className="hidden text-lg font-semibold tracking-tight lg:inline">SitRight</span>
      </div>

      {/* Topbar: contexto + sesión + notificaciones + usuario */}
      <header
        data-print-hide
        className="flex items-center justify-end gap-5 border-b border-sand bg-cream pr-6"
      >
        <ActiveSessionPill />
        <NotificationsBell />
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5"
            title="Cerrar sesión"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-moss-deep text-sm font-semibold text-cream-bone">
              {userInitial(user.name)}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-[13px] font-medium text-ink">{user.name.split(' ')[0]}</div>
              <div className="text-[11px] text-ink-faint">
                {user.role === 'admin' ? 'Administrador' : 'Trabajador'}
              </div>
            </div>
          </button>
        )}
      </header>

      {/* Sidebar: navegación única (icono + etiqueta) */}
      <aside
        data-print-hide
        className="flex flex-col gap-1 bg-moss-deep p-3 text-cream-bone lg:px-4 lg:py-5"
      >
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors active:scale-[0.97] ${
                  isActive
                    ? 'bg-cream-bone/12 text-cream-bone'
                    : 'text-cream-bone/60 hover:bg-cream-bone/5 hover:text-cream-bone'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <p className="mt-auto hidden px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream-bone/35 lg:block">
          SitRight · Lima · 2026
        </p>
      </aside>

      {/* Main — anima cada cambio de ruta con un fade-up suave */}
      <main className="app-shell-main overflow-y-auto bg-cream px-6 py-7 lg:px-12 lg:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={pageTransition}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
