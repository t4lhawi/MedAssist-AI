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
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:static md:inset-auto md:flex md:w-64 md:flex-col md:border-r md:border-t-0">
      <nav className="flex items-center justify-around gap-1 px-2 py-2 md:flex-1 md:flex-col md:items-stretch md:justify-start md:gap-1 md:p-4">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
                isActive
                  ? 'bg-primary-light text-primary shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-slate-200 px-5 py-4 text-xs text-slate-400 md:block">
        <p className="font-medium text-slate-500">MedAssist AI v1.0</p>
        <p>CHU Mohammed VI Oujda</p>
      </div>
    </aside>
  )
}
