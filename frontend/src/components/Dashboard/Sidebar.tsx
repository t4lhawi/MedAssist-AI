import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Bell,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Power,
  Settings2,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  short: string
  adminOnly?: boolean
  badge?: number
}

/** Shared nav items — used by both the desktop Sidebar and the mobile MobileNav. */
function navItems(role: string | undefined, alertCount: number): NavItem[] {
  return [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil' },
    { to: '/admin/salles', icon: Settings2, label: 'Gestion des salles', short: 'Salles', adminOnly: true },
    { to: '/alertes', icon: Bell, label: 'Alertes', short: 'Alertes', badge: alertCount },
    { to: '/documents', icon: FileText, label: 'Documents', short: 'Docs' },
    { to: '/assistant', icon: MessageCircle, label: 'Assistant IA', short: 'Assistant' },
  ].filter(n => !n.adminOnly || role === 'admin')
}

interface Props {
  alertCount?: number
}

export default function Sidebar({ alertCount = 0 }: Props) {
  const { user, logout } = useAuth()
  const items = navItems(user?.role, alertCount)

  return (
    <aside
      className="hidden w-60 shrink-0 flex-col md:flex"
      style={{
        background: '#FFFFFF',
        borderRight: '1px solid #ECECEC',
      }}
    >
      <nav className="flex flex-1 flex-col gap-0.5 p-3 pt-4">
        {items.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13.5px] font-medium transition-all duration-200 ${
                isActive
                  ? 'text-[#111111]'
                  : 'text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F7]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active pill background */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(17,17,17,0.06), 0 1px 8px -2px rgba(17,17,17,0.08)',
                    }}
                  />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                    isActive ? '' : 'group-hover:bg-[#F5F5F7]'
                  }`}
                  style={isActive ? { color: '#3B82F6' } : { color: '#6B7280' }}
                >
                  <Icon size={16} strokeWidth={2} />
                  {badge !== undefined && badge > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                      style={{ background: '#3B82F6' }}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="relative z-10 truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Profile, Logout */}
      <div className="border-t p-3" style={{ borderColor: '#F5F5F7' }}>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `group relative mb-2 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
              isActive
                ? 'text-[#111111]'
                : 'text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F7]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(17,17,17,0.06), 0 1px 8px -2px rgba(17,17,17,0.08)',
                  }}
                />
              )}
              <span
                className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                style={isActive ? { color: '#3B82F6' } : { background: '#F5F5F7', color: '#6B7280' }}
              >
                <UserCircle size={15} strokeWidth={2} />
              </span>
              <span className="relative z-10">Mon profil</span>
            </>
          )}
        </NavLink>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium text-[#EF4444] transition-colors hover:bg-red-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-50">
            <Power size={15} strokeWidth={2} />
          </span>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

/* ─── Mobile bottom navigation ────────────────────────────────────
   Companion to the desktop Sidebar. Shown only below the md
   breakpoint (the sidebar is `hidden md:flex`). Reuses the same
   nav items so routes / badges / admin-gating stay in sync. */

export function MobileNav({ alertCount = 0 }: Props) {
  const { user, logout } = useAuth()
  const items = navItems(user?.role, alertCount)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t md:hidden"
      style={{
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: '#ECECEC',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1.5 py-1.5">
        {items.map(({ to, icon: Icon, short, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 transition-colors duration-200 active:scale-95 ${
                isActive ? 'text-[#111111]' : 'text-[#9CA3AF]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} style={isActive ? { color: '#3B82F6' } : undefined} />
                  {badge !== undefined && badge > 0 && (
                    <span
                      className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white ring-2 ring-white"
                      style={{ background: '#EF4444' }}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate text-[9.5px] font-medium">{short}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Logout — kept compact so mobile users can sign out without the sidebar */}
        <button
          onClick={logout}
          title="Déconnexion"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[#9CA3AF] transition-colors duration-200 active:scale-95 hover:text-[#EF4444]"
        >
          <Power size={20} strokeWidth={2} />
          <span className="text-[9.5px] font-medium">Quitter</span>
        </button>
      </div>
    </nav>
  )
}
