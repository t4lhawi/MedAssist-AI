import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  PowerOff,
  Radio,
  RefreshCw,
  Search,
  Server,
} from 'lucide-react'
import {
  getSallesStatus,
  getUnregisteredSources,
  updateEsp32,
  deleteEsp32,
} from '../services/api'
import { usePermissions } from '../hooks/usePermissions'
import { useLiveSocket } from '../context/LiveSocketContext'
import type { SalleStatus, UnregisteredSource, LiveMesureEventData } from '../types'
import SalleCard from '../components/Admin/SalleCard'
import UnregisteredList from '../components/Admin/UnregisteredList'
import Esp32Form from '../components/Admin/Esp32Form'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'

type Filter = 'all' | 'online' | 'offline' | 'inactive'

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Toutes',
  online: 'En ligne',
  offline: 'Hors ligne',
  inactive: 'Inactives',
}

export default function AdminSallesPage() {
  const { onMesure } = useLiveSocket()
  // This entire page is admin-only (RequireAuth gates it at the
  // route level), so every action is allowed here. The permission
  // check is still pulled so we can hide the "Enregistrer un ESP32"
  // trigger if a future role is ever granted read-only access.
  const { permissions } = usePermissions()
  const canManageDevices = permissions.canManageDevices
  const [salles, setSalles] = useState<SalleStatus[]>([])
  const [unregistered, setUnregistered] = useState<UnregisteredSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [s, u] = await Promise.all([getSallesStatus(), getUnregisteredSources()])
      setSalles(s.data)
      setUnregistered(u.data)
    } catch (e: any) {
      setError(
        e?.response?.data?.detail
          ? String(e.response.data.detail)
          : 'Impossible de charger les salles.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Slow safety poll — same rationale as the dashboard. Salle
    // renames / deletes / claims aren't pushed over WS, so we still
    // need a periodic refresh to pick them up. 30s is fine for an
    // admin page.
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  // Live: patch the matching salle tile in place when a new mesure
  // arrives. The "ESP32 non enregistrés" synthetic entry (esp32_id
  // null) also gets updated so the unregistered bucket ticks live.
  useEffect(() => {
    const off = onMesure((data: LiveMesureEventData) => {
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
    return () => off()
  }, [onMesure])

  const handleUpdate = useCallback(
    async (
      id: number,
      data: { actif?: boolean; salle?: string; note?: string | null; clear_note?: boolean },
    ) => {
      setBusyId(id)
      try {
        await updateEsp32(id, data as any)
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      setBusyId(id)
      try {
        await deleteEsp32(id)
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  const filteredSalles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return salles.filter(s => {
      if (filter === 'online' && !s.online) return false
      if (filter === 'offline' && (s.online || !s.actif)) return false
      if (filter === 'inactive' && s.actif) return false
      if (q) {
        const hay = `${s.salle} ${s.ip ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [salles, filter, query])

  const counts = useMemo(() => {
    let online = 0, offline = 0, inactive = 0
    for (const s of salles) {
      if (!s.actif) inactive++
      else if (s.online) online++
      else offline++
    }
    return { all: salles.length, online, offline, inactive }
  }, [salles])

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:px-6">
      {/* ── Page header ──────────────────────────────────────── */}
      <PageHeader
        category="Infrastructure"
        title="Gestion des salles"
        subtitle={
          <span>
            <span className="font-medium text-[#374151] dark:text-text-secondary">
              {salles.length} salle{salles.length > 1 ? 's' : ''} enregistrée{salles.length > 1 ? 's' : ''}
            </span>
            <span className="mx-1.5 text-[#D1D5DB]">·</span>
            <span className="font-medium text-[#374151] dark:text-text-secondary">
              {counts.online} connectée{counts.online > 1 ? 's' : ''}
            </span>
            <span className="mx-1.5 text-[#D1D5DB]">·</span>
            <span
              className={`font-medium ${
                unregistered.length > 0 ? 'text-amber-600' : 'text-[#374151] dark:text-text-secondary'
              }`}
            >
              {unregistered.length} appareil{unregistered.length > 1 ? 's' : ''} inconnu
              {unregistered.length > 1 ? 's' : ''}
            </span>
          </span>
        }
        liveCount={
          salles.length > 0
            ? {
                value: `${counts.online}/${salles.length}`,
                label: 'en direct',
                tone:
                  counts.online > 0
                    ? 'good'
                    : counts.offline > 0
                    ? 'warning'
                    : 'neutral',
              }
            : undefined
        }
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Actualiser"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ECECEC] dark:border-border bg-white dark:bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-[#374151] dark:text-text-secondary shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-all duration-200 hover:-translate-y-px hover:bg-[#FAFAFA] dark:bg-hover dark:hover:bg-hover active:scale-[0.97] disabled:opacity-60"
            style={{ background: 'white', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white' }}
          >
            <RefreshCw size={12} strokeWidth={2.4} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        }
      />

      {/* ── Quick statistics ──────────────────────────────────── */}
      <section
        aria-label="Statistiques rapides"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <StatCard
          label="Salles connectées"
          value={counts.online}
          hint={`/ ${salles.length}`}
          icon={<Radio size={14} strokeWidth={2.2} />}
          tone="emerald"
          trend={counts.online > 0 ? 'up' : 'flat'}
          trendLabel={counts.online > 0 ? 'Live' : '—'}
        />
        <StatCard
          label="Salles hors ligne"
          value={counts.offline}
          hint={counts.offline > 0 ? 'à vérifier' : 'aucune'}
          icon={<PowerOff size={14} strokeWidth={2.2} />}
          tone="amber"
          trend={counts.offline > 0 ? 'down' : 'flat'}
          trendLabel={counts.offline > 0 ? 'Action' : 'OK'}
        />
        <StatCard
          label="Salles inactives"
          value={counts.inactive}
          hint="désactivées"
          icon={<Server size={14} strokeWidth={2.2} />}
          tone="slate"
          trend="flat"
          trendLabel="Inactif"
        />
        <StatCard
          label="ESP32 inconnus"
          value={unregistered.length}
          hint="à réclamer"
          icon={<AlertTriangle size={14} strokeWidth={2.2} />}
          tone={unregistered.length > 0 ? 'amber' : 'emerald'}
          trend={unregistered.length > 0 ? 'up' : 'flat'}
          trendLabel={unregistered.length > 0 ? 'À traiter' : 'OK'}
        />
      </section>

      {/* ── Filter toolbar ────────────────────────────────────── */}
      <section
        aria-label="Filtres"
        className="flex flex-col gap-3 rounded-3xl border border-[#ECECEC] dark:border-border bg-white dark:bg-card p-3 shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_24px_-12px_rgba(17,17,17,0.08)] sm:flex-row sm:items-center sm:justify-between sm:p-4"
      >
        {/* Search — Spotlight style */}
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={14}
            strokeWidth={2.2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-text-muted"
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une salle ou une IP…"
            aria-label="Rechercher"
            className="w-full rounded-full border border-transparent bg-[#F5F5F7] py-2 pl-9 pr-3 text-[13px] text-[#111111] dark:text-text-primary outline-none placeholder:text-[#9CA3AF] dark:text-text-muted transition-all duration-200 focus:bg-white dark:bg-card focus:border-[#3B82F6]/40 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.10)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented filters */}
          <div
            role="tablist"
            aria-label="Filtrer par statut"
            className="inline-flex rounded-full bg-[#F5F5F7] p-1"
          >
            {(Object.keys(FILTER_LABELS) as Filter[]).map(f => {
              const active = filter === f
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-200 active:scale-[0.97] ${
                    active
                      ? 'bg-white dark:bg-card text-[#111111] dark:text-text-primary shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                      : 'text-[#6B7280] dark:text-text-secondary hover:text-[#111111] dark:text-text-primary'
                  }`}
                >
                  {f === 'online' && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? 'bg-emerald-500' : 'bg-[#9CA3AF]'
                      }`}
                    />
                  )}
                  {f === 'offline' && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? 'bg-amber-500' : 'bg-[#9CA3AF]'
                      }`}
                    />
                  )}
                  {f === 'inactive' && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? 'bg-[#6B7280]' : 'bg-[#9CA3AF]'
                      }`}
                    />
                  )}
                  {FILTER_LABELS[f]}
                  <span
                    className={`tabular-nums text-[11px] ${
                      active ? 'text-[#6B7280] dark:text-text-secondary' : 'text-[#9CA3AF] dark:text-text-muted'
                    }`}
                  >
                    {counts[f]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Add ESP32 trigger (admin only) */}
          {canManageDevices && <Esp32Form onCreated={load} />}
        </div>
      </section>

      {/* ── Error banner ─────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600"
        >
          {error}
        </div>
      )}

      {/* ── Unknown ESP32 discovery section (admin only — claiming IPs
            is a privileged action). Hidden for read-only viewers if
            any are ever introduced. */}
      {canManageDevices && (
        <UnregisteredList sources={unregistered} onClaimed={load} />
      )}

      {/* ── Room grid ─────────────────────────────────────────── */}
      {loading && salles.length === 0 ? (
        <div
          className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-[#ECECEC] dark:border-border bg-white dark:bg-card py-16 text-[13px] text-[#6B7280] dark:text-text-secondary"
        >
          <Loader2 size={14} className="animate-spin" />
          Chargement des salles…
        </div>
      ) : filteredSalles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#ECECEC] dark:border-border bg-white dark:bg-card py-16 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F7] text-[#6B7280] dark:text-text-secondary">
            <Server size={20} strokeWidth={2} />
          </span>
          <p className="text-[13.5px] font-medium text-[#374151] dark:text-text-secondary">
            {salles.length === 0
              ? 'Aucune salle enregistrée pour le moment.'
              : 'Aucune salle ne correspond à votre filtre.'}
          </p>
          {salles.length === 0 && (
            <p className="mt-1 text-[12.5px] text-[#6B7280] dark:text-text-secondary">
              Cliquez sur « Enregistrer un ESP32 » pour ajouter votre première salle.
            </p>
          )}
        </div>
      ) : (
        <section
          aria-label="Grille des salles"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {filteredSalles.map(s => (
            <SalleCard
              key={s.esp32_id ?? s.salle}
              salle={s}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              busy={busyId === s.esp32_id}
            />
          ))}
        </section>
      )}
    </div>
  )
}
