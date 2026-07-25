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
import { usePermissions } from '../../hooks/usePermissions'
import type { Permissions } from '../../utils/permissions'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  short: string
  /** Permission required to see this item. */
  requires?: keyof Permissions
  badge?: number
}

/** Shared nav items — used by both the desktop Sidebar and the mobile MobileNav.
 *  Items are filtered by the current user's permissions, never by
 *  role strings directly. The filtering logic lives here once; the
 *  mobile nav reuses the same function so the two views stay in sync. */
function buildNavItems(perms: Permissions, alertCount: number): NavItem[] {
  const all: NavItem[] = [
    // "Tableau de bord" is the live dashboard. Visitors get a different
    // welcome screen at `/`, so we hide this entry for them — otherwise
    // it would point to a route that doesn't 404 but renders the same
    // welcome page, which is confusing.
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', short: 'Accueil', requires: 'canViewLiveDashboard' },
    { to: '/admin/salles', icon: Settings2, label: 'Gestion des salles', short: 'Salles', requires: 'canViewSalles' },
    { to: '/alertes', icon: Bell, label: 'Alertes', short: 'Alertes', requires: 'canViewAlertes', badge: alertCount },
    { to: '/documents', icon: FileText, label: 'Documents', short: 'Docs', requires: 'canViewDocuments' },
    { to: '/assistant', icon: MessageCircle, label: 'Assistant IA', short: 'Assistant', requires: 'canViewAssistant' },
  ]
  return all.filter(n => !n.requires || perms[n.requires] === true)
}

interface Props {
  alertCount?: number
}

export default function Sidebar({ alertCount = 0 }: Props) {
  const { logout } = useAuth()
  const { permissions } = usePermissions()
  const items = buildNavItems(permissions, alertCount)

  return (
    <aside
      className="hidden w-60 shrink-0 flex-col md:flex"
      style={{
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-color)',
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
                  ? 'text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-hover'
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
                      background: 'var(--bg-card)',
                      boxShadow: '0 1px 2px var(--shadow-1), 0 1px 8px -2px var(--shadow-2)',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                    isActive ? '' : 'group-hover:bg-hover'
                  }`}
                  style={isActive ? { color: 'var(--color-primary)' } : { color: 'var(--text-secondary)' }}
                >
                  <Icon size={16} strokeWidth={2} />
                  {badge !== undefined && badge > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                      style={{ background: 'var(--color-primary)' }}
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
      <div className="border-t p-3" style={{ borderColor: 'var(--border-color)' }}>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `group relative mb-2 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
              isActive
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-hover'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'var(--bg-card)',
                    boxShadow: '0 1px 2px var(--shadow-1), 0 1px 8px -2px var(--shadow-2)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              )}
              <span
                className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                style={
                  isActive
                    ? { color: 'var(--color-primary)' }
                    : { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }
                }
              >
                <UserCircle size={15} strokeWidth={2} />
              </span>
              <span className="relative z-10">Mon profil</span>
            </>
          )}
        </NavLink>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-colors"
          style={{ color: 'var(--color-danger)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              'color-mix(in srgb, var(--color-danger) 12%, transparent)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--color-danger) 14%, transparent)' }}
          >
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
  const { logout } = useAuth()
  const { permissions } = usePermissions()
  const items = buildNavItems(permissions, alertCount)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t md:hidden"
      style={{
        background: 'color-mix(in srgb, var(--bg-elevated) 86%, transparent)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: 'var(--border-color)',
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
                isActive ? 'text-text-primary' : 'text-text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 2}
                    style={isActive ? { color: 'var(--color-primary)' } : undefined}
                  />
                  {badge !== undefined && badge > 0 && (
                    <span
                      className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white"
                      style={{
                        background: 'var(--color-danger)',
                        boxShadow: '0 0 0 2px var(--bg-elevated)',
                      }}
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
          className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 transition-colors duration-200 active:scale-95"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >
          <Power size={20} strokeWidth={2} />
          <span className="text-[9.5px] font-medium">Quitter</span>
        </button>
      </div>
    </nav>
  )
}
