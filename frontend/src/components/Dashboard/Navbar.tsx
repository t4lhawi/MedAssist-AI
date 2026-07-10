import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, Hospital, LogOut, User } from 'lucide-react'

interface Props {
  alertCount: number
}

export default function Navbar({ alertCount }: Props) {
  const { user, logout } = useAuth()

  return (
    <header className="z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-soft">
            <Hospital size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 md:text-xl">MedAssist AI</h1>
            <p className="hidden text-xs text-slate-500 sm:block">Plateforme hospitaliere intelligente</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
            <Bell size={19} />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-primary shadow-sm">
              <User size={15} />
            </div>
            <div className="max-w-44 leading-tight">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.nom}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Deconnexion"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-danger"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
