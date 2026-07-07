import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, LogOut, User } from 'lucide-react'

interface Props { alertCount: number }

export default function Navbar({ alertCount }: Props) {
  const { user, logout } = useAuth()
  return (
    <header className="bg-primary text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏥</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">MedAssist AI</h1>
          <p className="text-xs opacity-60">Plateforme hospitalière intelligente</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Bell size={20} />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
          <User size={14} />
          <span className="text-sm">{user?.nom}</span>
          <span className="text-xs opacity-60 capitalize">({user?.role})</span>
        </div>
        <button onClick={logout} title="Déconnexion"
          className="hover:bg-white/10 p-1.5 rounded-full transition">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}