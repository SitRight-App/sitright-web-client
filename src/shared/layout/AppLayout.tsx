import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/history', label: 'Historial', icon: '📅' },
  { to: '/settings', label: 'Chaleco', icon: '🦺' },
]

export function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-700">
      <aside className="flex w-56 flex-col bg-white shadow-sm">
        <div className="px-5 py-6">
          <p className="text-lg font-extrabold tracking-tight text-slate-800">SitRight</p>
          <p className="text-xs text-slate-400">Monitor postural</p>
        </div>

        <nav className="flex-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 text-xs text-slate-300">v0.1.0 · UPC 2026</div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
