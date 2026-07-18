import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  FileText,
  HeartPulse,
  RefreshCw,
  Settings2,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCard from '../components/Dashboard/StatCard'
import LineChart from '../components/Charts/LineChart'
import AlertsList from '../components/Alerts/AlertsList'
import { getAlertes, getDocuments, getMesures, getSallesStatus } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Alerte, Document, Mesure, SalleStatus } from '../types'
import { MONITORING_TYPES, getMonitoringType } from '../monitoring'
import PageHeader from '../components/ui/PageHeader'

/* ─── System health hero ──────────────────────────────────────── */

function SystemHealthHero({
  onlineSalles,
  registeredSalles,
  activeAlerts,
  indexedDocs,
  totalDocs,
}: {
  onlineSalles: number
  registeredSalles: number
  activeAlerts: number
  indexedDocs: number
  totalDocs: number
}) {
  // Simple health score: penalize offline rooms and active alerts.
  const baseScore = registeredSalles > 0 ? (onlineSalles / registeredSalles) * 100 : 0
  const alertPenalty = activeAlerts * 8
  const score = Math.max(0, Math.min(100, Math.round(baseScore - alertPenalty)))

  const scoreTone =
    score >= 85
      ? { color: 'text-emerald-500', label: 'Opérationnel', bg: 'from-emerald-500/10 via-emerald-400/5', ring: 'stroke-emerald-500' }
      : score >= 60
      ? { color: 'text-amber-500', label: 'À surveiller', bg: 'from-amber-500/10 via-amber-400/5', ring: 'stroke-amber-500' }
      : { color: 'text-red-500', label: 'Critique', bg: 'from-red-500/10 via-red-400/5', ring: 'stroke-red-500' }

  const ringDash = 2 * Math.PI * 36 // r=36 → circumference ≈ 226
  const ringOffset = ringDash * (1 - score / 100)

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${scoreTone.bg} to-white p-5 shadow-sm`}>
      {/* decorative pulse circles */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-white/20 blur-2xl" />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        {/* Left: title + score */}
        <div className="flex items-center gap-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                className="stroke-slate-200"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                className={scoreTone.ring}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={ringDash}
                strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[24px] font-semibold leading-none tracking-tight ${scoreTone.color}`}>
                {score}
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">/ 100</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`flex h-2 w-2 rounded-full ${scoreTone.color.replace('text-', 'bg-')} animate-pulse`} />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Santé du système
              </p>
            </div>
            <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              {scoreTone.label}
            </h3>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Surveillance temps réel · rafraîchissement 5 s
            </p>
          </div>
        </div>

        {/* Right: mini stats grid */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <HeroStat
            icon={Activity}
            label="En ligne"
            value={`${onlineSalles}/${registeredSalles}`}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <HeroStat
            icon={Bell}
            label="Alertes"
            value={String(activeAlerts)}
            color={activeAlerts > 0 ? 'text-amber-600' : 'text-slate-500'}
            bg={activeAlerts > 0 ? 'bg-amber-50' : 'bg-slate-100'}
          />
          <HeroStat
            icon={FileText}
            label="Indexés"
            value={`${indexedDocs}/${totalDocs}`}
            color="text-indigo-600"
            bg="bg-indigo-50"
          />
        </div>
      </div>
    </div>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className="flex min-w-[100px] flex-col gap-1.5 rounded-xl border border-white/60 bg-white/70 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className={`flex h-5 w-5 items-center justify-center rounded-md ${bg} ${color}`}>
          <Icon size={11} strokeWidth={2.4} />
        </span>
        <p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className={`text-[18px] font-semibold leading-none tracking-tight tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

/* ─── Live activity feed ──────────────────────────────────────── */

function LiveActivityFeed({ mesures, max = 8 }: { mesures: Mesure[]; max?: number }) {
  // Mesures arrive in DESC timestamp order from the API. We reverse the
  // first `max` for the feed (newest on top) and animate each row in.
  const items = mesures.slice(0, max)

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Sparkles size={20} strokeWidth={1.6} className="text-slate-400" />
        </div>
        <p className="text-[13.5px] font-semibold text-slate-700">En attente de mesures</p>
        <p className="mt-1 text-[12px] text-slate-400">
          Les mesures MQTT apparaîtront ici dès qu'elles arriveront.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-slate-900">
            Activité en direct
          </h3>
        </div>
        <p className="text-[11px] text-slate-400">
          {items.length} dernière{items.length > 1 ? 's' : ''} mesure{items.length > 1 ? 's' : ''}
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((m, idx) => {
          const mt = (m.type && getMonitoringType(m.type)) || MONITORING_TYPES[0]
          const Icon = mt.icon
          const salle = m.salle || m.topic_salle || '—'
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50/60"
              style={{
                animation: `slideInRight 320ms cubic-bezier(0.16, 1, 0.3, 1) both`,
                animationDelay: `${idx * 30}ms`,
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ background: mt.chart }}
              >
                <Icon size={13} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-slate-800">
                  <span className="text-slate-900">{mt.title}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="text-slate-500">{salle}</span>
                </p>
                <p className="text-[10.5px] text-slate-400">
                  {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
                  {Number(m.valeur).toFixed(m.type === 'pression' ? 0 : 1)}
                  <span className="ml-0.5 text-[10.5px] font-medium text-slate-400">{m.unite || mt.unit}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ─── Dashboard page ──────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [salles, setSalles] = useState<SalleStatus[]>([])
  const [mesures, setMesures] = useState<Mesure[]>([])
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Track "freshly arrived" mesures to animate them. We keep a Set of
  // ids that arrived in the latest fetch — entries leave the set on
  // the next tick so the flash plays once.
  const freshIdsRef = useRef<Set<number>>(new Set())
  const prevIdsRef = useRef<Set<number>>(new Set())
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, m, a, d] = await Promise.all([
        getSallesStatus(),
        getMesures({ limit: 80 }),
        getAlertes(false),
        getDocuments(),
      ])
      const newIds = new Set(m.data.map(x => x.id))
      const fresh = new Set<number>()
      newIds.forEach(id => {
        if (!prevIdsRef.current.has(id)) fresh.add(id)
      })
      prevIdsRef.current = newIds
      freshIdsRef.current = fresh
      setSalles(s.data)
      setMesures(m.data)
      setAlertes(a.data)
      setDocuments(d.data)
      setFlashIds(fresh)
      // Clear the flash after the animation finishes.
      window.setTimeout(() => setFlashIds(new Set()), 1200)
    } catch {
      setError('Impossible de charger les données du tableau de bord.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  const byType = (type: string) => mesures.filter(m => m.type === type)

  const latestValue = (type: string) => {
    const m = byType(type)[0]
    return m ? `${m.valeur}` : '--'
  }

  const countByType = (type: string) => salles.filter(s =>
    s.sensors.some(x => x.type === type && x.state === 'active'),
  ).length

  // Build sparkline series (last 12 values, oldest → newest) for each
  // sensor type. The LineChart consumes DESC; we reverse for the chart.
  const sparklineFor = useCallback(
    (type: string) => byType(type).slice(0, 12).reverse().map(m => m.valeur),
    // byType would re-create the array every render, so we depend on
    // the `mesures` reference itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mesures],
  )

  // Compute a simple trend (delta between most recent and 5-prior)
  // expressed as a fraction of the older value, used by StatCard.
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
  const chartTypes = MONITORING_TYPES.filter(t => countByType(t.type) > 0)
  const registeredSalles = salles.filter(s => s.esp32_id !== null).length
  const onlineSalles = salles.filter(s => s.online).length

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
      <PageHeader
        category="Vue temps réel"
        title="Tableau de bord"
        subtitle="Surveillance température, humidité, pression, et qualité d'air."
        liveCount={{
          value: `${onlineSalles}/${registeredSalles}`,
          label: 'salles en ligne',
          tone: onlineSalles > 0 ? 'good' : 'warning',
        }}
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <SystemHealthHero
        onlineSalles={onlineSalles}
        registeredSalles={registeredSalles}
        activeAlerts={activeAlerts}
        indexedDocs={indexedDocuments}
        totalDocs={documents.length}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Salles surveillées"
          value={onlineSalles}
          icon={Activity}
          color="bg-gradient-to-b from-blue-400 to-blue-600"
          sub={`${registeredSalles} enregistrée(s)`}
          tone="neutral"
          sparkline={useMemoSparkline(salles.length ? onlineSalles : 0)}
        />
        <StatCard
          title="Alertes actives"
          value={activeAlerts}
          icon={Bell}
          color={activeAlerts > 0 ? 'bg-gradient-to-b from-amber-400 to-amber-500' : 'bg-gradient-to-b from-emerald-400 to-emerald-500'}
          sub={activeAlerts > 0 ? 'À traiter en priorité' : 'Situation stable'}
          tone={activeAlerts > 0 ? 'warning' : 'good'}
        />
        <StatCard
          title="Documents"
          value={documents.length}
          icon={FileText}
          color="bg-gradient-to-b from-indigo-400 to-indigo-500"
          sub={`${indexedDocuments} indexé(s)`}
          tone={indexedDocuments === documents.length && documents.length > 0 ? 'good' : 'neutral'}
        />
        <StatCard
          title="Familles actives"
          value={activeMonitoringFamilies}
          icon={Settings2}
          color="bg-gradient-to-b from-violet-400 to-violet-500"
          sub={`sur ${MONITORING_TYPES.length}`}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MONITORING_TYPES.map(item => {
          const sparkline = sparklineFor(item.type)
          const trend = trendFor(item.type)
          const hasData = sparkline.length > 0
          return (
            <StatCard
              key={item.type}
              title={item.title}
              value={latestValue(item.type)}
              unit={item.unit}
              icon={item.icon}
              color={item.color}
              sub={hasData ? `${countByType(item.type)} salle(s) active(s)` : 'Aucune mesure reçue'}
              tone={hasData ? 'good' : 'warning'}
              sparkline={sparkline}
              trend={trend}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(chartTypes.length > 0 ? chartTypes : MONITORING_TYPES.slice(0, 2)).map(item => (
          <LineChart
            key={item.type}
            mesures={byType(item.type)}
            title={`${item.title} (${item.unit})`}
            color={item.chart}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {isAdmin ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Settings2 size={14} strokeWidth={2.2} />
                </span>
                <h3 className="text-[15px] font-semibold text-slate-900">Salles &amp; ESP32</h3>
              </div>
              <p className="mt-2 text-[12.5px] text-slate-500">
                {registeredSalles} salle(s) enregistrée(s), {onlineSalles} en ligne. Réclamez les IP non reconnues et renommez vos salles depuis l'administration.
              </p>
              <Link
                to="/admin/salles"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95"
              >
                Ouvrir l'administration
                <TrendingUp size={14} />
              </Link>
            </div>
            <LiveActivityFeed mesures={mesures} />
          </div>
        ) : (
          <LiveActivityFeed mesures={mesures} />
        )}
        <AlertsList alertes={alertes} onRefresh={load} variant="active" />
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

// Tiny inline hook helper so we can build a synthetic sparkline for the
// "Salles surveillées" stat without recomputing it elsewhere. Returns
// a 12-point series of the current value (so the line is flat until
// the next refresh shows real change).
function useMemoSparkline(value: number): number[] {
  return React.useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < 12; i++) arr.push(value)
    return arr
  }, [value])
}
