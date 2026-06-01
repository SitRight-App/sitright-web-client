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

type NavPage = { to: string; label: string; end?: boolean; adminOnly?: boolean }

const TOP_PAGES: NavPage[] = [
  { to: '/', label: 'Postura en vivo', end: true },
  { to: '/history', label: 'Historial' },
  { to: '/recommendations', label: 'Recomendaciones' },
  { to: '/vest', label: 'Chaleco' },
  { to: '/settings', label: 'Configuración' },
  { to: '/admin', label: 'Admin', adminOnly: true },
]

type SidebarItem = {
  to: string
  label: string
  end?: boolean
  Icon: LucideIcon | ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const SIDEBAR_ICONS: SidebarItem[] = [
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

  return (
    <div className="grid min-h-screen grid-cols-[72px_1fr] grid-rows-[56px_1fr] bg-cream">
      {/* topbar */}
      <header className="col-span-2 flex items-center border-b border-sand bg-cream pr-8">
        <div className="grid h-14 w-[72px] place-items-center border-r border-sand bg-moss-deep text-cream">
          <Brandmark />
        </div>

        <nav className="flex items-center gap-7 px-7 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
          {TOP_PAGES.filter((p) => !p.adminOnly || user?.role === 'admin').map(
            ({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `py-1.5 ${isActive ? 'border-b-[1.4px] border-terracotta text-ink' : ''}`
                }
              >
                {label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-6">
          <ActiveSessionPill />

          <NotificationsBell />

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2.5"
              title="Cerrar sesión"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-moss-deep font-serif text-sm italic text-cream">
                {userInitial(user.name)}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs text-ink">{user.name.split(' ')[0]}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {user.role === 'admin' ? 'Admin' : 'Trabajador'}
                </div>
              </div>
            </button>
          )}
        </div>
      </header>

      {/* sidebar */}
      <aside className="relative flex flex-col items-center gap-1.5 bg-moss-deep py-5 text-cream">
        {SIDEBAR_ICONS.filter((p) => !p.adminOnly || user?.role === 'admin').map(
          ({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `relative grid h-11 w-11 place-items-center rounded-md transition-all ${
                  isActive
                    ? 'opacity-100'
                    : 'opacity-55 hover:bg-white/5 hover:opacity-90'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-2.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-terracotta" />
                  )}
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.4} />
                </>
              )}
            </NavLink>
          ),
        )}

        <div className="mt-auto py-4">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.32em] text-sand opacity-55"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            SitRight · Lima · 2026
          </span>
        </div>
      </aside>

      {/* main — anima cada cambio de ruta con un fade-up suave */}
      <main className="overflow-y-auto px-12 py-8">
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
