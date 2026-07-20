import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LogOut,
  Mail,
  MessageCircle,
  ShieldCheck,
  Activity,
  FileText,
  Wifi,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSallesStatus, getDocuments } from '../services/api'
import PageHeader from '../components/ui/PageHeader'

/* ─── Mini-stat tile (En ligne / Documents) ──────────────────── */

function MiniStat({
  label,
  value,
  total,
  icon: Icon,
  loading,
}: {
  label: string
  value: number
  total?: number
  icon: LucideIcon
  loading: boolean
}) {
  return (
    <div className="rounded-2xl p-3" style={{ background: '#F5F5F7' }}>
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-xl"
          style={{ background: '#FFFFFF' }}
        >
          <Icon size={13} strokeWidth={2.2} style={{ color: '#3B82F6' }} />
        </span>
        <p className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
          {label}
        </p>
      </div>
      <p className="mt-2 text-[18px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: '#111111' }}>
        {loading ? '—' : value}
        {total != null && !loading && (
          <span className="ml-1 text-[12px] font-medium" style={{ color: '#9CA3AF' }}>/ {total}</span>
        )}
      </p>
    </div>
  )
}

/* ─── Skeleton placeholder while stats load ──────────────────── */

function Skeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:px-6">
      <div className="h-10 w-1/3 animate-pulse rounded-xl" style={{ background: '#ECECEC' }} />
      <div className="h-64 animate-pulse rounded-3xl" style={{ background: '#ECECEC' }} />
    </div>
  )
}

/* ─── Profile page ───────────────────────────────────────────── */

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [onlineSalles, setOnlineSalles] = useState(0)
  const [registeredSalles, setRegisteredSalles] = useState(0)
  const [documentsCount, setDocumentsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([getSallesStatus(), getDocuments()])
      .then(([sallesRes, docsRes]) => {
        if (cancelled) return
        if (sallesRes.status === 'fulfilled') {
          const salles = sallesRes.value.data
          setRegisteredSalles(salles.filter(s => s.esp32_id !== null).length)
          setOnlineSalles(salles.filter(s => s.online).length)
        }
        if (docsRes.status === 'fulfilled') {
          setDocumentsCount(docsRes.value.data.length)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (!user) return <Skeleton />

  const initial = (user.nom || 'U').charAt(0).toUpperCase()
  const memberSince = user.cree_le
    ? new Date(user.cree_le).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:px-6">
      <PageHeader
        category="Mon compte"
        title={user.nom}
        subtitle={memberSince ? `Membre depuis ${memberSince}` : undefined}
      />

      <div
        className="card rounded-3xl border p-6"
        style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
      >
        {/* Identity block */}
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-white"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
          >
            <span style={{ fontSize: 26, fontWeight: 600 }}>{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[18px] font-semibold tracking-tight" style={{ color: '#111111' }}>
              {user.nom}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: '#6B7280' }}>
              <Mail size={12} strokeWidth={2} />
              {user.email}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize"
                style={{ background: '#EEF2FF', color: '#4F46E5' }}
              >
                <ShieldCheck size={11} strokeWidth={2.4} />
                {user.role}
              </span>
              {memberSince && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                  style={{ background: '#F5F5F7', color: '#6B7280' }}
                >
                  <CalendarClock size={11} strokeWidth={2.2} />
                  {memberSince}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <MiniStat
            label="En ligne"
            value={onlineSalles}
            total={registeredSalles}
            icon={Activity}
            loading={loading}
          />
          <MiniStat
            label="Documents"
            value={documentsCount}
            icon={FileText}
            loading={loading}
          />
        </div>

        {/* Live network status */}
        {!loading && (
          <div
            className="mt-4 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[12.5px]"
            style={{ background: '#F5F5F7', color: '#6B7280' }}
          >
            <Wifi size={13} strokeWidth={2.2} style={{ color: '#3B82F6' }} />
            <span>
              {onlineSalles} salle{onlineSalles !== 1 ? 's' : ''} connectée{onlineSalles !== 1 ? 's' : ''}
              {' · '}
              <span style={{ color: '#111111', fontWeight: 500 }}>{registeredSalles}</span> enregistrée{registeredSalles !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/assistant"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ background: '#111111', color: '#FFFFFF' }}
          >
            <MessageCircle size={14} strokeWidth={2} />
            Poser une question
          </Link>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition-colors"
            style={{ borderColor: '#FECACA', color: '#DC2626', background: '#FFFFFF' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF' }}
          >
            <LogOut size={14} strokeWidth={2.2} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}
