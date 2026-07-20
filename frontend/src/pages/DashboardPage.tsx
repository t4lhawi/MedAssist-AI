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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCard from '../components/Dashboard/StatCard'
import SallesOverview from '../components/Dashboard/SallesOverview'
import CombinedChart from '../components/Charts/CombinedChart'
import AlertsList from '../components/Alerts/AlertsList'
import { getAlertes, getDocuments, getMesures, getSallesStatus } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useLiveSocket } from '../context/LiveSocketContext'
import { Alerte, Document, Mesure, SalleStatus, LiveMesureEventData, LiveAlerteEventData } from '../types'
import { MONITORING_TYPES, getMonitoringType } from '../monitoring'
import PageHeader from '../components/ui/PageHeader'

/* ─── Premium Dashboard Welcome Header ──────────────────────── */

function DashHeader({
  loading,
  onRefresh,
  onlineSalles,
  registeredSalles,
}: {
  loading: boolean
  onRefresh: () => void
  onlineSalles: number
  registeredSalles: number
}) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
          Bienvenue
        </p>
        <h1
          className="mt-0.5 text-[28px] font-semibold tracking-tight"
          style={{ color: '#111111' }}
        >
          Tableau de bord
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: '#6B7280' }}>
          Surveillance en temps réel · {dateStr}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: '#F5F5F7' }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: '2s' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[12px] font-medium" style={{ color: '#6B7280' }}>
            <span className="font-semibold" style={{ color: '#111111' }}>{onlineSalles}</span>
            <span style={{ color: '#9CA3AF' }}>/{registeredSalles} en ligne</span>
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all"
          style={{
            background: '#111111',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px -2px rgba(17,17,17,0.25)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#374151'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#111111'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2} />
          Actualiser
        </button>
      </div>
    </div>
  )
}

/* ─── Right Info Panel ──────────────────────────────────────── */

/* ─── Live Activity Feed ──────────────────────────────────────── */

function LiveActivityFeed({ mesures, max = 6 }: { mesures: Mesure[]; max?: number }) {
  const items = mesures.slice(0, max)

  if (items.length === 0) {
    return (
      <div
        className="card flex flex-col items-center justify-center rounded-3xl border p-8 text-center"
        style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
      >
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: '#F5F5F7' }}
        >
          <Sparkles size={20} strokeWidth={1.6} style={{ color: '#D1D5DB' }} />
        </div>
        <p className="text-[13.5px] font-semibold" style={{ color: '#6B7280' }}>
          En attente de mesures
        </p>
        <p className="mt-1 text-[12px]" style={{ color: '#9CA3AF' }}>
          Les mesures MQTT apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div
      className="card overflow-hidden rounded-3xl border"
      style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#F5F5F7' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: '2s' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h3 className="text-[13.5px] font-semibold tracking-tight" style={{ color: '#111111' }}>
            Activité en direct
          </h3>
        </div>
        <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
          {items.length} dernière{items.length > 1 ? 's' : ''} mesure{items.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: '#F5F5F7' }}>
        {items.map((m, idx) => {
          const mt = (m.type && getMonitoringType(m.type)) || MONITORING_TYPES[0]
          const Icon = mt.icon
          const salle = m.salle || m.topic_salle || '—'

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFAFA]"
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
                <p className="truncate text-[13px] font-medium" style={{ color: '#374151' }}>
                  <span style={{ color: '#111111' }}>{mt.title}</span>
                  <span className="mx-1.5" style={{ color: '#D1D5DB' }}>·</span>
                  <span style={{ color: '#6B7280' }}>{salle}</span>
                </p>
                <p className="text-[10.5px]" style={{ color: '#9CA3AF' }}>
                  {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: '#111111' }}>
                  {Number(m.valeur).toFixed(m.type === 'pression' ? 0 : 1)}
                  <span className="ml-0.5 text-[10.5px] font-medium" style={{ color: '#9CA3AF' }}>
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

/* ─── Dashboard Page ──────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { onMesure, onAlerte } = useLiveSocket()
  const [salles, setSalles] = useState<SalleStatus[]>([])
  const [mesures, setMesures] = useState<Mesure[]>([])
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, m, a, d] = await Promise.all([
        getSallesStatus(),
        getMesures({ limit: 80 }),
        getAlertes(false),
        getDocuments(),
      ])
      setSalles(s.data)
      setMesures(m.data)
      setAlertes(a.data)
      setDocuments(d.data)
    } catch {
      setError('Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

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
      <DashHeader
        loading={loading}
        onRefresh={load}
        onlineSalles={onlineSalles}
        registeredSalles={registeredSalles}
      />

      {error && (
        <div
          className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-[13px] font-medium"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
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
            <StatCard
              title="Alertes actives"
              value={activeAlerts}
              icon={Bell}
              accent={activeAlerts > 0 ? '#F59E0B' : '#10B981'}
              sub={activeAlerts > 0 ? 'À traiter' : 'Situation stable'}
              tone={activeAlerts > 0 ? 'warning' : 'good'}
            />
            <StatCard
              title="Documents"
              value={documents.length}
              icon={FileText}
              accent="#8B5CF6"
              sub={`${indexedDocuments} indexé(s)`}
              tone={indexedDocuments === documents.length && documents.length > 0 ? 'good' : 'neutral'}
            />
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
          {isAdmin && (
            <div
              className="card rounded-3xl border p-5"
              style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-xl"
                  style={{ background: '#EEF2FF' }}
                >
                  <Settings2 size={14} strokeWidth={2.2} style={{ color: '#4F46E5' }} />
                </span>
                <h3 className="text-[15px] font-semibold" style={{ color: '#111111' }}>
                  Salles & ESP32
                </h3>
              </div>
              <p className="mt-2 text-[13px]" style={{ color: '#6B7280' }}>
                {registeredSalles} salle(s) enregistrée(s), {onlineSalles} en ligne.
                Gérez vos équipements et IP non reconnues.
              </p>
              <Link
                to="/admin/salles"
                className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#111111' }}
              >
                Administration
                <Sparkles size={13} strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>

        {/* Right Info Panel */}
        <div className="space-y-3">
          {/* Recent Alerts */}
          {recentAlertes.length > 0 && (
            <div
              className="card rounded-3xl border p-4"
              style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold" style={{ color: '#111111' }}>
                  Alertes récentes
                </h3>
                <Link
                  to="/alertes"
                  className="text-[11.5px] font-medium transition-colors hover:underline"
                  style={{ color: '#3B82F6' }}
                >
                  Tout voir
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {recentAlertes.map(a => {
                  const colors: Record<string, { bg: string; text: string }> = {
                    critique: { bg: '#FEF2F2', text: '#DC2626' },
                    attention: { bg: '#FFFBEB', text: '#D97706' },
                    info: { bg: '#EFF6FF', text: '#2563EB' },
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