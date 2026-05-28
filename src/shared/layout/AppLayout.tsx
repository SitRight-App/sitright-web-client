import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/iam/context/AuthContext'
import { Brandmark } from '@/shared/ui/Brandmark'

const TOP_PAGES = [
  { to: '/', label: 'Postura en vivo', end: true },
  { to: '/history', label: 'Historial' },
  { to: '/recommendations', label: 'Recomendaciones' },
  { to: '/vest', label: 'Chaleco' },
  { to: '/settings', label: 'Configuración' },
]

const SIDEBAR_ICONS = [
  {
    to: '/',
    label: 'Tiempo real',
    end: true,
    svg: (
      <>
        <circle cx="10" cy="10" r="6" />
        <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    to: '/history',
    label: 'Historial',
    svg: (
      <>
        <path d="M3 5h14M3 10h14M3 15h9" />
      </>
    ),
  },
  {
    to: '/recommendations',
    label: 'Recomendaciones',
    svg: (
      <>
        <path d="M5 3l10 7-10 7V3z" />
      </>
    ),
  },
  {
    to: '/vest',
    label: 'Chaleco',
    svg: (
      <>
        <path d="M5 3v14h10V3l-3 3h-4l-3-3z" />
      </>
    ),
  },
  {
    to: '/settings',
    label: 'Configuración',
    svg: (
      <>
        <circle cx="10" cy="10" r="2.5" />
        <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.5 1.5M13.5 13.5L15 15M5 15l1.5-1.5M13.5 6.5L15 5" />
      </>
    ),
  },
]

function userInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
          {TOP_PAGES.map(({ to, label, end }) => (
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
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-moss-deep px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cream">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta" />
            Monitoreo activo
          </span>

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
        {SIDEBAR_ICONS.map(({ to, label, end, svg }) => (
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
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  className="h-[18px] w-[18px]"
                >
                  {svg}
                </svg>
              </>
            )}
          </NavLink>
        ))}

        <div className="mt-auto py-4">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.32em] text-sand opacity-55"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            SitRight · Lima · 2026
          </span>
        </div>
      </aside>

      {/* main */}
      <main className="overflow-y-auto px-12 py-8">
        <Outlet />
      </main>
    </div>
  )
}
