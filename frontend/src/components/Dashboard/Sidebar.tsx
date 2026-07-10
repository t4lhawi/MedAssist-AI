import React from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, Bell, FileText, LayoutDashboard, MessageCircle } from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau' },
  { to: '/capteurs', icon: Activity, label: 'Capteurs' },
  { to: '/alertes', icon: Bell, label: 'Alertes' },
  { to: '/documents', icon: FileText, label: 'Docs' },
  { to: '/assistant', icon: MessageCircle, label: 'Assistant' },
]

export default function Sidebar() {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/80 backdrop-blur-xl md:static md:inset-auto md:flex md:w-60 md:flex-col md:border-r md:border-t-0 md:bg-slate-50/60">
      <nav className="flex items-center justify-around gap-1 px-3 py-2 md:flex-1 md:flex-col md:items-stretch md:justify-start md:gap-0.5 md:p-3 md:pt-5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10.5px] font-medium transition-all duration-200 ease-out md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-[13.5px] ${
                isActive
                  ? 'text-blue-600 md:bg-white md:text-slate-900 md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.06)]'
                  : 'text-slate-400 hover:text-slate-700 md:hover:bg-black/[0.03]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-200 ease-out md:h-7 md:w-7 ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-black/5 px-4 py-4 md:block">
        <div className="rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-semibold text-slate-600">MedAssist AI</p>
          <p className="text-[10.5px] text-slate-400">v1.0 · CHU Mohammed VI Oujda</p>
        </div>
      </div>
    </aside>
  )
}