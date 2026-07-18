import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Activity,
  Bell,
  FileText,
  HeartPulse,
  LayoutDashboard,
  MessageCircle,
  Settings2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  adminOnly?: boolean
  badge?: number
}

interface Props {
  alertCount?: number
}

export default function Sidebar({ alertCount = 0 }: Props) {
  const { user } = useAuth()
  const items: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Tableau' },
    { to: '/admin/salles', icon: Settings2, label: 'Salles', adminOnly: true },
    { to: '/alertes', icon: Bell, label: 'Alertes', badge: alertCount },
    { to: '/documents', icon: FileText, label: 'Docs' },
    { to: '/assistant', icon: MessageCircle, label: 'Assistant' },
  ].filter(n => !n.adminOnly || user?.role === 'admin')

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/80 backdrop-blur-xl md:static md:inset-auto md:flex md:w-60 md:flex-col md:border-r md:border-t-0 md:bg-slate-50/60">
      <nav className="flex items-center justify-around gap-1 px-3 py-2 md:flex-1 md:flex-col md:items-stretch md:justify-start md:gap-0.5 md:p-3 md:pt-5">
        {items.map(({ to, icon: Icon, label, badge }) => (
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
                  className={`relative flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-200 ease-out md:h-7 md:w-7 ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-black/5 px-4 py-4 md:block">
        <div className="rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <img src="/img/favicon.ico" alt="CHU Mohammed VI Oujda" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-slate-700">MedAssist AI</p>
              <p className="text-[10px] text-slate-400">v1.0 · CHU Mohammed VI</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
