import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Activity, Bell, FileText, MessageCircle, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/capteurs', icon: Activity, label: 'Capteurs' },
  { to: '/alertes', icon: Bell, label: 'Alertes' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/assistant', icon: MessageCircle, label: 'Assistant IA' },
]

export default function Sidebar() {
  const { user } = useAuth()
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6">
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
               ${isActive ? 'bg-primary-light text-primary' : 'text-gray-600 hover:bg-gray-100'}`
            }>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink to="/utilisateurs"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
               ${isActive ? 'bg-primary-light text-primary' : 'text-gray-600 hover:bg-gray-100'}`
            }>
            <Users size={17} /> Utilisateurs
          </NavLink>
        )}
      </nav>
      <div className="px-4 text-xs text-gray-400">
        <p>MedAssist AI v1.0</p>
        <p>CHU Mohammed VI Oujda</p>
      </div>
    </aside>
  )
}