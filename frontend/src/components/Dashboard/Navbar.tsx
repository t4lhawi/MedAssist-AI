import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, LogOut, User, ChevronDown, Search } from 'lucide-react'

interface Props {
  alertCount: number
}

export default function Navbar({ alertCount }: Props) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

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
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: '#ECECEC',
      }}
    >
      <div className="flex h-full items-center justify-between px-5">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21c-4.5-3-8-6.5-8-10.5A5.5 5.5 0 0 1 9.5 5c1 0 2 .3 2.5 1 .5-.7 1.5-1 2.5-1A5.5 5.5 0 0 1 20 10.5c0 4-3.5 7.5-8 10.5Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[14px] font-semibold tracking-tight" style={{ color: '#111111' }}>
              MedAssist AI
            </h1>
            <p className="hidden text-[10.5px] leading-tight" style={{ color: '#9CA3AF' }}>
              CHU Mohammed VI · Oujda
            </p>
          </div>
        </div>

        {/* Center: Date + Search placeholder */}
        <div className="hidden items-center gap-3 lg:flex">
          <span className="text-[12px]" style={{ color: '#6B7280' }}>
            {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
          </span>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Rechercher…"
              className="h-8 w-56 rounded-full pl-8 pr-3 text-[12.5px] transition-all"
              style={{
                background: '#F5F5F7',
                border: '1px solid transparent',
                color: '#111111',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.background = '#FFFFFF'
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.08)'
              }}
              onBlur={(e) => {
                e.target.style.background = '#F5F5F7'
                e.target.style.borderColor = 'transparent'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
        </div>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-1.5">
          <button
            title="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
            style={{ color: '#6B7280' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Bell size={16} strokeWidth={2} />
            {alertCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: '#EF4444' }}
              >
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Profile Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors"
              style={{ color: '#111111' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                style={{ background: '#3B82F6' }}
              >
                <User size={13} strokeWidth={2.2} />
              </div>
              <div className="hidden max-w-32 text-left sm:block">
                <p className="truncate text-[13px] font-medium">{user?.nom}</p>
                <p className="truncate capitalize text-[10.5px]" style={{ color: '#9CA3AF' }}>{user?.role}</p>
              </div>
              <ChevronDown
                size={13}
                style={{ color: '#9CA3AF' }}
                className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-52 overflow-hidden rounded-2xl border animate-field-in"
                style={{
                  borderColor: '#ECECEC',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px -8px rgba(17,17,17,0.12), 0 2px 8px -2px rgba(17,17,17,0.06)',
                }}
              >
                <div className="border-b px-3.5 py-3 sm:block hidden" style={{ borderColor: '#F5F5F7' }}>
                  <p className="truncate text-[13px] font-medium" style={{ color: '#111111' }}>{user?.nom}</p>
                  <p className="truncate capitalize text-[11px]" style={{ color: '#9CA3AF' }}>{user?.role}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors"
                    style={{ color: '#EF4444' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
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