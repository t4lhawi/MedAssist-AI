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
  Building2,
  Cpu,
  Bell,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { getSallesStatus, getDocuments } from '../services/api'
import PageHeader from '../components/ui/PageHeader'

/* ─── Mini-stat tile (En ligne / Documents) ──────────────────── */

function MiniStat({
  label,
  value,
  total,
  icon: Icon,
  accent,
  loading,
}: {
  label: string
  value: number
  total?: number
  icon: LucideIcon
  accent: string
  loading: boolean
}) {
  return (
    <div
      className="rounded-2xl p-3.5 transition-all duration-200 hover:scale-[1.02]"
      style={{ background: 'var(--bg-hover)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-xl"
          style={{ background: 'var(--bg-card)' }}
        >
          <Icon size={13} strokeWidth={2.2} style={{ color: accent }} />
        </span>
        <p className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      </div>
      <p className="mt-2 text-[20px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {loading ? '—' : value}
        {total != null && !loading && (
          <span className="ml-1 text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>/ {total}</span>
        )}
      </p>
    </div>
  )
}

/* ─── Quick-action card (compact) ─────────────────────────────── */

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  accent,
}: {
  to: string
  icon: LucideIcon
  title: string
  description: string
  accent: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 hover:border-border-strong hover:shadow-sm"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
        style={{ background: 'var(--bg-hover)' }}
      >
        <Icon size={16} strokeWidth={2.2} style={{ color: accent }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="truncate text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      <ExternalLink
        size={13}
        strokeWidth={2}
        style={{ color: 'var(--text-muted)' }}
        className="shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </Link>
  )
}

/* ─── Info row (label + value) ────────────────────────────────── */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--bg-hover)' }}
      >
        <Icon size={14} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

/* ─── Skeleton placeholder while stats load ──────────────────── */

function Skeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:px-6">
      <div className="h-10 w-1/3 animate-pulse rounded-xl" style={{ background: 'var(--shimmer-bg)' }} />
      <div className="h-64 animate-pulse rounded-3xl" style={{ background: 'var(--shimmer-bg)' }} />
    </div>
  )
}

/* ─── Profile page ───────────────────────────────────────────── */

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { roleLabel, permissions } = usePermissions()
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
    ? new Date(user.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const memberShort = user.cree_le
    ? new Date(user.cree_le).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null
  const networkHealth =
    registeredSalles === 0
      ? 0
      : Math.round((onlineSalles / registeredSalles) * 100)

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:px-6">
      <PageHeader
        category="Mon compte"
        title={user.nom}
        subtitle={memberSince ? `Membre depuis le ${memberSince}` : undefined}
      />

      {/* ── Hero card: cover + identity ─────────────────────────── */}
      <div
        className="card relative overflow-hidden rounded-3xl border"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        {/* Cover gradient */}
        <div
          className="relative h-24 w-full overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
          }}
        >
          {/* decorative blobs */}
          <div
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
          <div
            className="absolute -bottom-10 left-1/3 h-24 w-24 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          />
          {/* Active chip on cover */}
          <div className="absolute right-4 top-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF', backdropFilter: 'blur(8px)' }}
            >
              <CheckCircle2 size={11} strokeWidth={2.4} />
              {user.actif ? 'Compte actif' : 'Compte désactivé'}
            </span>
          </div>
        </div>

        {/* Identity block — sits below the cover on its own white surface */}
        <div className="relative z-10 px-6 pb-6 pt-5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
            >
              <span style={{ fontSize: 24, fontWeight: 600 }}>{initial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {user.nom}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                <Mail size={12} strokeWidth={2} />
                {user.email}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}
                >
                  <ShieldCheck size={11} strokeWidth={2.4} />
                  {roleLabel}
                </span>
                {memberShort && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                  >
                    <CalendarClock size={11} strokeWidth={2.2} />
                    {memberShort}
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                  style={{ background: 'color-mix(in srgb, var(--color-success) 14%, transparent)', color: 'var(--color-success)' }}
                >
                  <Sparkles size={11} strokeWidth={2.2} />
                  ID #{user.id}
                </span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label="En ligne"
              value={onlineSalles}
              total={registeredSalles}
              icon={Activity}
              accent="#10B981"
              loading={loading}
            />
            <MiniStat
              label="Salles"
              value={registeredSalles}
              icon={Building2}
              accent="#3B82F6"
              loading={loading}
            />
            <MiniStat
              label="Capteurs"
              value={registeredSalles * 4}
              icon={Cpu}
              accent="#8B5CF6"
              loading={loading}
            />
            <MiniStat
              label="Documents"
              value={documentsCount}
              icon={FileText}
              accent="#F59E0B"
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column row: Account + Network ────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Account info */}
        <div
          className="rounded-3xl border p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
                Informations
              </p>
              <h4 className="mt-0.5 text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Mon compte
              </h4>
            </div>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: 'var(--bg-hover)' }}
            >
              <KeyRound size={14} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--bg-hover)' }}>
            <InfoRow icon={Mail} label="Adresse e-mail" value={user.email} />
            <InfoRow icon={ShieldCheck} label="Rôle" value={roleLabel} />
            <InfoRow icon={CalendarClock} label="Inscrit le" value={memberSince || '—'} />
            <InfoRow icon={Activity} label="Statut" value={user.actif ? 'Actif' : 'Désactivé'} />
          </div>
        </div>

        {/* Network status */}
        <div
          className="rounded-3xl border p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
                Temps réel
              </p>
              <h4 className="mt-0.5 text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                État du réseau
              </h4>
            </div>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: 'var(--bg-hover)' }}
            >
              <Wifi size={14} strokeWidth={2.2} style={{ color: networkHealth > 0 ? 'var(--color-success)' : 'var(--text-muted)' }} />
            </span>
          </div>

          {/* Network health bar */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Salles connectées
              </p>
              <p className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {loading ? '—' : `${networkHealth}%`}
              </p>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--bg-hover)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: loading ? '0%' : `${networkHealth}%`,
                  background: networkHealth >= 75
                    ? 'linear-gradient(90deg, #10B981, #059669)'
                    : networkHealth >= 40
                      ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                      : 'linear-gradient(90deg, #EF4444, #DC2626)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="rounded-2xl p-3"
              style={{ background: 'var(--bg-hover)' }}
            >
              <p className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                En ligne
              </p>
              <p className="mt-1 flex items-baseline gap-1 text-[18px] font-semibold tabular-nums" style={{ color: 'var(--color-success)' }}>
                {loading ? '—' : onlineSalles}
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  / {registeredSalles || 0}
                </span>
              </p>
            </div>
            <div
              className="rounded-2xl p-3"
              style={{ background: 'var(--bg-hover)' }}
            >
              <p className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Hors ligne
              </p>
              <p className="mt-1 flex items-baseline gap-1 text-[18px] font-semibold tabular-nums" style={{ color: 'var(--color-danger)' }}>
                {loading ? '—' : Math.max(registeredSalles - onlineSalles, 0)}
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  salles
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────── */}
      <div
        className="rounded-3xl border p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
            Raccourcis
          </p>
          <h4 className="mt-0.5 text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Actions rapides
          </h4>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {permissions.canUseAssistant && (
            <QuickAction
              to="/assistant"
              icon={MessageCircle}
              title="Assistant IA"
              description="Poser une question au système"
              accent="#3B82F6"
            />
          )}
          {permissions.canViewAlertes && (
            <QuickAction
              to="/alertes"
              icon={Bell}
              title="Voir les alertes"
              description="Consulter les notifications actives"
              accent="#EF4444"
            />
          )}
          {permissions.canViewDocuments && (
            <QuickAction
              to="/documents"
              icon={FileText}
              title="Mes documents"
              description="Parcourir la base documentaire"
              accent="#F59E0B"
            />
          )}
          {permissions.canViewSalles && (
            <QuickAction
              to="/admin/salles"
              icon={Building2}
              title="Gestion des salles"
              description="Administrer les capteurs ESP32"
              accent="#8B5CF6"
            />
          )}
        </div>
      </div>

      {/* ── Security + Logout ────────────────────────────────────── */}
      <div
        className="rounded-3xl border p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
              Sécurité
            </p>
            <h4 className="mt-0.5 text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Session & confidentialité
            </h4>
          </div>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--color-success) 14%, transparent)' }}
          >
            <Lock size={14} strokeWidth={2.2} style={{ color: 'var(--color-success)' }} />
          </span>
        </div>
        <div
          className="mb-4 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[12.5px]"
          style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }}
        >
          <CheckCircle2 size={14} strokeWidth={2.4} style={{ color: 'var(--color-success)' }} />
          <span>
            Connexion sécurisée · Vos données sont chiffrées de bout en bout.
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to="/assistant"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-card)' }}
          >
            <MessageCircle size={14} strokeWidth={2} />
            Poser une question
          </Link>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition-all active:scale-[0.98]"
            style={{ borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)', color: 'var(--color-danger)', background: 'var(--bg-card)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)' }}
          >
            <LogOut size={14} strokeWidth={2.2} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}
