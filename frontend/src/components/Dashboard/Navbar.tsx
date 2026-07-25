import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import { Bell, LogOut, User, ChevronDown, UserCircle, Clock } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const LOGO = '../assets/favicon.ico';

interface Props {
  alertCount: number
}


export default function Navbar({ alertCount }: Props) {
  const { user, logout } = useAuth()
  const { roleLabel } = usePermissions()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header
      className="sticky top-0 z-30 h-14 shrink-0 border-b"
      style={{
        background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex h-full items-center justify-between px-5">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
            <img
              src={LOGO}
              alt="Logo"
              width={65}
              height={65}
            />
          </div>
          <div>
            <h1 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              MedAssist AI
            </h1>
            <p className="text-[10.5px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              CHU Mohammed VI · Oujda
            </p>
          </div>
        </div>

        {/* Center: Date + Time */}
        <div
          className="hidden items-center gap-2 rounded-full px-3 py-1.5 lg:flex"
          style={{ background: 'var(--bg-hover)' }}
        >
          <Clock size={13} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {timeStr}
          </span>
          <span className="h-3 w-px" style={{ background: 'var(--border-strong)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {capitalized}
          </span>
        </div>

        {/* Right: Notifications + Theme + Profile */}
        <div className="flex items-center gap-1.5">
          <button
            title="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Bell size={16} strokeWidth={2} />
            {alertCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          <ThemeToggle />

          {/* Profile Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                <User size={13} strokeWidth={2.2} />
              </div>
              <div className="hidden max-w-32 text-left sm:block">
                <p className="truncate text-[13px] font-medium">{user?.nom}</p>
                <p className="truncate text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{roleLabel}</p>
              </div>
              <ChevronDown
                size={13}
                style={{ color: 'var(--text-muted)' }}
                className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-52 overflow-hidden rounded-2xl border animate-field-in"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'color-mix(in srgb, var(--bg-elevated) 95%, transparent)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px -8px var(--shadow-3), 0 2px 8px -2px var(--shadow-1)',
                }}
              >
                <div
                  className="border-b px-3.5 py-3 sm:block hidden"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{user?.nom}</p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{roleLabel}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile') }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <UserCircle size={14} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
                    Mon profil
                  </button>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors"
                    style={{ color: 'var(--color-danger)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-danger) 12%, transparent)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <LogOut size={14} strokeWidth={2.2} />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
