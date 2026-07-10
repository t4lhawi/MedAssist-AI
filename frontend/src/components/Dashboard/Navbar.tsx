import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'

interface Props {
  alertCount: number
}

export default function Navbar({ alertCount }: Props) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/70 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 md:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(37,99,235,0.35)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21c-4.5-3-8-6.5-8-10.5A5.5 5.5 0 0 1 9.5 5c1 0 2 .3 2.5 1 .5-.7 1.5-1 2.5-1A5.5 5.5 0 0 1 20 10.5c0 4-3.5 7.5-8 10.5Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-slate-900 md:text-base">
              MedAssist AI
            </h1>
            <p className="hidden text-[11px] leading-tight text-slate-400 sm:block">
              Plateforme hospitalière intelligente
            </p>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <button
            title="Notifications"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/5 active:scale-95"
          >
            <Bell size={18} strokeWidth={2} className="transition-transform group-active:scale-90" />
            {alertCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          {/* Profile menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-black/5 sm:pr-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <User size={14} strokeWidth={2.2} />
              </div>
              <div className="hidden max-w-32 text-left leading-tight sm:block">
                <p className="truncate text-[13px] font-medium text-slate-800">{user?.nom}</p>
                <p className="truncate text-[11px] capitalize text-slate-400">{user?.role}</p>
              </div>
              <ChevronDown
                size={14}
                className={`hidden text-slate-400 transition-transform duration-200 sm:block ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-52 origin-top-right animate-[fadeIn_0.15s_ease-out] overflow-hidden rounded-2xl border border-black/5 bg-white/90 py-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <div className="border-b border-black/5 px-3.5 py-2.5 sm:hidden">
                  <p className="truncate text-[13px] font-medium text-slate-800">{user?.nom}</p>
                  <p className="truncate text-[11px] capitalize text-slate-400">{user?.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
                >
                  <LogOut size={15} strokeWidth={2.2} />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </header>
  )
}