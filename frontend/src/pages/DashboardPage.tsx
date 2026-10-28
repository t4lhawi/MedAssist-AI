import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  FileText,
  RefreshCw,
  Settings2,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  Plus,
  UserCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCard from '../components/Dashboard/StatCard'
import CombinedChart from '../components/Charts/CombinedChart'
import { getAlertes, getDocuments, getMesures, getSallesStatus } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useLiveSocket } from '../context/LiveSocketContext'
import { Alerte, Document, Mesure, SalleStatus, LiveMesureEventData, LiveAlerteEventData } from '../types'
import { MONITORING_TYPES, getMonitoringType } from '../monitoring'
import PageHeader from '../components/ui/PageHeader'

/* ─── Live Activity Feed ──────────────────────────────────────── */

function LiveActivityFeed({ mesures, max = 6 }: { mesures: Mesure[]; max?: number }) {
  const items = mesures.slice(0, max)

  if (items.length === 0) {
    return (
      <div
        className="card flex flex-col items-center justify-center rounded-3xl border p-8 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'var(--bg-hover)' }}
        >
          <Sparkles size={20} strokeWidth={1.6} style={{ color: 'var(--border-strong)' }} />
        </div>
        <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          En attente de mesures
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Les mesures MQTT apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div
      className="card overflow-hidden rounded-3xl border"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--bg-hover)' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: '2s' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h3 className="text-[13.5px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Activité en direct
          </h3>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {items.length} dernière{items.length > 1 ? 's' : ''} mesure{items.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y divide-border">
        {items.map((m, idx) => {
          const mt = (m.type && getMonitoringType(m.type)) || MONITORING_TYPES[0]
          const Icon = mt.icon
          const salle = m.salle || m.topic_salle || '—'

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover"
              style={{
                animation: 'slideUp 200ms ease-out both',
                animationDelay: `${idx * 25}ms`,
              }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{ background: mt.chart }}
              >
                <Icon size={13} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{mt.title}</span>
                  <span className="mx-1.5" style={{ color: 'var(--border-strong)' }}>·</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{salle}</span>
                </p>
                <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {Number(m.valeur).toFixed(m.type === 'pression' ? 0 : 1)}
                  <span className="ml-0.5 text-[10.5px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {m.unite || mt.unit}
                  </span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Visitor Welcome ─────────────────────────────────────────── */

function VisitorWelcome({ nom }: { nom: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:px-6">
      {/* Hero — fills the available width instead of floating in a
          768px column. The illustration panel is hidden below lg so
          the hero still feels focused on mobile. */}
      <div
        className="relative overflow-hidden rounded-3xl border p-6 md:p-8"
        style={{
          background:
            'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -right-12 -top-12 h-44 w-44 rounded-full"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        />
        <div
          className="absolute -bottom-16 right-1/3 h-40 w-40 rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        />

        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          {/* Left: greeting + CTA */}
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF', backdropFilter: 'blur(8px)' }}
            >
              <Sparkles size={11} strokeWidth={2.4} />
              Bienvenue
            </span>
            <h2
              className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-tight md:text-[34px]"
              style={{ color: '#FFFFFF' }}
            >
              Bonjour {nom}
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.86)' }}>
              Posez vos questions à l'assistant IA pour interroger la base
              documentaire indexée du CHU — protocoles, procédures, chiffres clés,
              le tout en langage naturel.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                to="/assistant"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-px active:scale-[0.97]"
                style={{ color: '#1D4ED8' }}
              >
                <MessageCircle size={14} strokeWidth={2.4} />
                Démarrer une conversation
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-px active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.14)', color: '#FFFFFF', backdropFilter: 'blur(8px)' }}
              >
                <UserCircle size={14} strokeWidth={2.2} />
                Mon profil
              </Link>
            </div>
          </div>

          {/* Right: feature tile */}
          <div
            className="hidden rounded-2xl p-5 lg:block"
            style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'rgba(255,255,255,0.78)' }}
            >
              Ce que vous pouvez faire
            </p>
            <ul className="mt-3 space-y-2.5 text-[13px]" style={{ color: '#FFFFFF' }}>
              <li className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.20)' }}
                >
                  <CheckCircle2 size={12} strokeWidth={2.4} />
                </span>
                Poser des questions en langage naturel à l'assistant IA.
              </li>
              <li className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.20)' }}
                >
                  <CheckCircle2 size={12} strokeWidth={2.4} />
                </span>
                Consulter vos informations de profil.
              </li>
            </ul>
            <p
              className="mt-4 text-[11.5px] leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.74)' }}
            >
              La supervision en temps réel des salles, des capteurs et des
              alertes est réservée au personnel hospitalier et aux administrateurs.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile-only version of the same info — shown below lg where
          the right column of the hero is hidden. */}
      <div
        className="rounded-3xl border p-5 lg:hidden"
        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
          Ce que vous pouvez faire
        </p>
        <ul className="mt-3 space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} strokeWidth={2.4} style={{ color: 'var(--color-success)' }} className="mt-0.5 shrink-0" />
            Poser des questions en langage naturel à l'assistant IA.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} strokeWidth={2.4} style={{ color: 'var(--color-success)' }} className="mt-0.5 shrink-0" />
            Consulter vos informations de profil.
          </li>
        </ul>
        <p className="mt-4 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          La supervision en temps réel des salles, des capteurs et des alertes
          est réservée au personnel hospitalier et aux administrateurs.
        </p>
      </div>

      {/* Quick action tiles — three small cards. These fill the lower
          half of the page so the visitor never sees a half-empty screen. */}
      <div className="grid gap-3 md:grid-cols-3">
        <Link
          to="/assistant"
          className="group flex items-center gap-3 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
          >
            <MessageCircle size={16} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Assistant IA
            </p>
            <p className="truncate text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              Interroger la base documentaire
            </p>
          </div>
          <Sparkles size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} className="shrink-0 transition-transform group-hover:scale-110" />
        </Link>

        <Link
          to="/profile"
          className="group flex items-center gap-3 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--bg-hover)' }}
          >
            <UserCircle size={16} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Mon profil
            </p>
            <p className="truncate text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              Vos informations de compte
            </p>
          </div>
          <Sparkles size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} className="shrink-0 transition-transform group-hover:scale-110" />
        </Link>

        <div
          className="flex items-center gap-3 rounded-2xl border p-4"
          style={{ background: 'var(--bg-hover)', borderColor: 'var(--border-color)' }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--bg-card)' }}
          >
            <ShieldCheck size={16} strokeWidth={2.2} style={{ color: 'var(--color-success)' }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Session sécurisée
            </p>
            <p className="truncate text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              Connexion chiffrée de bout en bout
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard Page ──────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const canViewAlertes = permissions.canViewAlertes
  const canViewDocuments = permissions.canViewDocuments
  const canViewSalles = permissions.canViewSalles

  // Visitors get a dedicated welcome screen because the live dashboard
  // would 403 on every endpoint it calls. The check is on
  // `canViewRestrictedDashboard` (visitor-only) rather than
  // `!canViewSalles` so hospital staff still get the full dashboard.
  if (permissions.canViewRestrictedDashboard) {
    return <VisitorWelcome nom={user?.nom?.split(' ')[0] || 'visiteur'} />
  }

  const { status, onMesure, onAlerte } = useLiveSocket()
  const [salles, setSalles] = useState<SalleStatus[]>([])
  const [mesures, setMesures] = useState<Mesure[]>([])
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      // The dashboard is only rendered for roles that can read every
      // surface it shows, so we can call all four endpoints in
      // parallel. allSettled is still used so a single transient
      // failure doesn't blank the whole page.
      const results = await Promise.allSettled([
        getSallesStatus(),
        getMesures({ limit: 80 }),
        getAlertes(false),
        getDocuments(),
      ])
      const [s, m, a, d] = results
      if (s.status === 'fulfilled') setSalles(s.value.data)
      if (m.status === 'fulfilled') setMesures(m.value.data)
      if (a.status === 'fulfilled') setAlertes(a.value.data)
      if (d.status === 'fulfilled') setDocuments(d.value.data)
      if (results.some(r => r.status === 'rejected')) {
        setError('Impossible de charger certaines données.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Keep an automatic safety refresh for reconnects and changes made
    // outside the socket.
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    if (status === 'live') load()
  }, [status, load])

  useEffect(() => {
    const offMesure = onMesure((data: LiveMesureEventData) => {
      setMesures(prev => {
        if (prev.some(m => m.id === data.id)) return prev
        const next: Mesure = {
          id: data.id, esp32_id: data.esp32_id, type: data.type as any,
          source_ip: data.source_ip, salle: data.salle, topic_salle: data.topic_salle,
          valeur: data.valeur, unite: data.unite, timestamp: data.timestamp || new Date().toISOString(),
        }
        return [next, ...prev].slice(0, 80)
      })
      setSalles(prev => prev.map(s => {
        if (data.esp32_id != null && s.esp32_id === data.esp32_id) {
          const sensors = s.sensors.map(sn =>
            sn.type === data.type
              ? { ...sn, state: 'active' as const, last_value: data.valeur,
                  last_unite: data.unite, last_timestamp: data.timestamp,
                  last_seen_label: "à l'instant" }
              : sn
          )
          return { ...s, sensors, online: true, derniere_mesure_le: data.timestamp || s.derniere_mesure_le }
        }
        if (s.esp32_id === null && s.salle === 'ESP32 non enregistrés') {
          const sensors = s.sensors.map(sn =>
            sn.type === data.type
              ? { ...sn, state: 'active' as const, last_value: data.valeur,
                  last_unite: data.unite, last_timestamp: data.timestamp,
                  last_seen_label: "à l'instant" }
              : sn
          )
          return { ...s, sensors, derniere_mesure_le: data.timestamp || s.derniere_mesure_le }
        }
        return s
      }))
    })

    const offAlerte = onAlerte((data: LiveAlerteEventData) => {
      setAlertes(prev => {
        if (prev.some(a => a.id === data.id)) return prev
        const next: Alerte = {
          id: data.id, esp32_id: data.esp32_id, type: data.type as any,
          salle: data.salle, niveau: data.niveau as any, message: data.message,
          traitee: data.traitee, cree_le: data.cree_le,
          explication: data.explication, explication_cree_le: data.explication_cree_le,
        }
        return [next, ...prev]
      })
    })

    return () => { offMesure(); offAlerte() }
  }, [onMesure, onAlerte])

  const byType = (type: string) => mesures.filter(m => m.type === type)
  const latestValue = (type: string) => {
    const m = byType(type)[0]
    return m ? `${m.valeur}` : '--'
  }
  const countByType = (type: string) => salles.filter(s =>
    s.sensors.some(x => x.type === type && x.state === 'active'),
  ).length

  const sparklineFor = useCallback(
    (type: string) => byType(type).slice(0, 12).reverse().map(m => m.valeur),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mesures],
  )

  const trendFor = useCallback(
    (type: string) => {
      const series = byType(type)
      if (series.length < 2) return undefined
      const newest = series[0]?.valeur
      const older = series[Math.min(5, series.length - 1)]?.valeur
      if (newest == null || older == null || older === 0) return undefined
      return (newest - older) / older
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mesures],
  )

  const activeAlerts = alertes.filter(a => !a.traitee).length
  const indexedDocuments = documents.filter(d => d.indexe).length
  const activeMonitoringFamilies = MONITORING_TYPES.filter(t => countByType(t.type) > 0).length
  const registeredSalles = salles.filter(s => s.esp32_id !== null).length
  const onlineSalles = salles.filter(s => s.online).length
  const recentAlertes = alertes.filter(a => !a.traitee).slice(0, 4)

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:space-y-5 md:px-6">
      {/* Welcome Header */}
      <PageHeader
        category="Bienvenue"
        title="Tableau de bord"
        subtitle={`Surveillance en temps réel · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        liveCount={
          registeredSalles > 0
            ? {
                value: `${onlineSalles}/${registeredSalles}`,
                label: 'en ligne',
                tone: onlineSalles > 0 ? 'good' : 'warning',
              }
            : undefined
        }
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-text-secondary transition-all hover:-translate-y-px hover:bg-hover active:scale-[0.97] disabled:opacity-60 dark:border-transparent dark:bg-white dark:text-slate-900 dark:hover:bg-white/90"
            aria-label="Actualiser"
          >
            <RefreshCw size={12} strokeWidth={2.4} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        }
      />

      {error && (
        <div
          className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-[13px] font-medium"
          style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* 2-Column Layout: Main (left) + Right Panel (~330–360px) */}
      <div className="grid gap-5 lg:grid-cols-[1fr_21rem] xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Salles en ligne"
              value={onlineSalles}
              icon={Activity}
              accent="#3B82F6"
              sub={`${registeredSalles} enregistrée(s)`}
              tone="neutral"
            />
            {canViewAlertes && (
              <StatCard
                title="Alertes actives"
                value={activeAlerts}
                icon={Bell}
                accent={activeAlerts > 0 ? '#F59E0B' : '#10B981'}
                sub={activeAlerts > 0 ? 'À traiter' : 'Situation stable'}
                tone={activeAlerts > 0 ? 'warning' : 'good'}
              />
            )}
            {canViewDocuments && (
              <StatCard
                title="Documents"
                value={documents.length}
                icon={FileText}
                accent="#8B5CF6"
                sub={`${indexedDocuments} indexé(s)`}
                tone={indexedDocuments === documents.length && documents.length > 0 ? 'good' : 'neutral'}
              />
            )}
            <StatCard
              title="Capteurs actifs"
              value={activeMonitoringFamilies}
              icon={Settings2}
              accent="#EC4899"
              sub={`sur ${MONITORING_TYPES.length} types`}
              tone="neutral"
            />
          </div>

          {/* Sensor Type Stats */}
          {MONITORING_TYPES.filter(t => countByType(t.type) > 0).length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {MONITORING_TYPES.map(item => {
                const hasData = byType(item.type).length > 0
                const sparkline = sparklineFor(item.type)
                const trend = trendFor(item.type)
                return hasData ? (
                  <StatCard
                    key={item.type}
                    title={item.title}
                    value={latestValue(item.type)}
                    unit={item.unit}
                    icon={item.icon}
                    accent={item.chart}
                    sub={`${countByType(item.type)} salle(s)`}
                    tone="good"
                    sparkline={sparkline}
                    trend={trend}
                  />
                ) : null
              })}
            </div>
          )}

          {/* Charts Section — single chart with all measure types */}
          <CombinedChart mesures={mesures} />

          {/* Admin Section */}
          {canViewSalles && (
            <div
              className="card rounded-3xl border p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
                >
                  <Settings2 size={14} strokeWidth={2.2} style={{ color: 'var(--color-primary)' }} />
                </span>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Gestion des salles
                </h3>
              </div>
              <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {registeredSalles} salle(s) enregistrée(s), {onlineSalles} en ligne.
                Gérez vos équipements et IP non reconnues.
              </p>
              <Link
                to="/admin/salles"
                className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--text-primary)', color: 'var(--bg-card)' }}
              >
                Administration
                <Sparkles size={13} strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>

        {/* Right Info Panel */}
        <div className="space-y-3">
          {/* Recent Alerts (hidden for visitors) */}
          {canViewAlertes && recentAlertes.length > 0 && (
            <div
              className="card rounded-3xl border p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Alertes récentes
                </h3>
                <Link
                  to="/alertes"
                  className="text-[11.5px] font-medium transition-colors hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Tout voir
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {recentAlertes.map(a => {
                  const colors: Record<string, { bg: string; text: string }> = {
                    critique: { bg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', text: 'var(--color-danger)' },
                    attention: { bg: 'color-mix(in srgb, var(--color-warning) 14%, transparent)', text: 'var(--color-warning)' },
                    info: { bg: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', text: 'var(--color-primary)' },
                  }
                  const c = colors[a.niveau] || colors.info
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
                      style={{ background: c.bg }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: c.text }}
                      />
                      <p className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ color: c.text }}>
                        {a.message}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live Activity Feed */}
          <LiveActivityFeed mesures={mesures} max={5} />
        </div>
      </div>
    </div>
  )
}