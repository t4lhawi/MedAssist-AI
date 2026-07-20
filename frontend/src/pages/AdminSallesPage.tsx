import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import {
  getSallesStatus,
  getUnregisteredSources,
  updateEsp32,
  deleteEsp32,
} from '../services/api'
import { useLiveSocket } from '../context/LiveSocketContext'
import type { SalleStatus, UnregisteredSource, LiveMesureEventData } from '../types'
import SalleCard from '../components/Admin/SalleCard'
import UnregisteredList from '../components/Admin/UnregisteredList'
import Esp32Form from '../components/Admin/Esp32Form'
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
      data: { actif?: boolean; salle?: string; note?: string },
    ) => {
      setBusyId(id)
      try {
        await updateEsp32(id, data)
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
    <div className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
      <PageHeader
        category="Infrastructure"
        title="Salles & ESP32"
        subtitle={`${salles.length} salle(s) enregistrée(s) · ${unregistered.length} IP non reconnue(s)`}
        liveCount={{
          value: `${counts.online}/${salles.length}`,
          label: 'en ligne',
          tone: counts.online > 0 ? 'good' : counts.offline > 0 ? 'warning' : 'neutral',
        }}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={13}
                strokeWidth={2.2}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#9CA3AF' }}
              />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filtrer par nom ou IP…"
                className="w-56 rounded-full border border-transparent py-1.5 pl-8 pr-3 text-[12.5px] transition-colors outline-none placeholder:text-[#9CA3AF]"
                style={{ background: '#F5F5F7', color: '#111111' }}
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
            <div className="inline-flex rounded-full p-1" style={{ background: '#F5F5F7' }}>
              {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-200 active:scale-95"
                  style={
                    filter === f
                      ? { background: '#FFFFFF', color: '#111111', boxShadow: '0 1px 2px rgba(17,17,17,0.08)' }
                      : { background: 'transparent', color: '#6B7280' }
                  }
                  onMouseEnter={(e) => {
                    if (filter !== f) (e.currentTarget as HTMLElement).style.color = '#111111'
                  }}
                  onMouseLeave={(e) => {
                    if (filter !== f) (e.currentTarget as HTMLElement).style.color = '#6B7280'
                  }}
                >
                  {FILTER_LABELS[f]}
                  <span className="ml-1 text-[10.5px] opacity-60">
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all active:scale-95 disabled:opacity-60"
              style={{ background: '#FFFFFF', border: '1px solid #ECECEC', color: '#374151' }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
          {error}
        </div>
      )}

      <UnregisteredList sources={unregistered} onClaimed={load} />

      <Esp32Form onCreated={load} />

      {loading && salles.length === 0 ? (
        <div
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed bg-white py-12 text-[13px]"
          style={{ borderColor: '#ECECEC', color: '#6B7280' }}
        >
          <Loader2 size={14} className="animate-spin" />
          Chargement des salles…
        </div>
      ) : filteredSalles.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed bg-white py-12 text-center text-[13px]"
          style={{ borderColor: '#ECECEC', color: '#6B7280' }}
        >
          {salles.length === 0
            ? 'Aucune salle enregistrée pour le moment.'
            : 'Aucune salle ne correspond à votre filtre.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredSalles.map(s => (
            <SalleCard
              key={s.esp32_id ?? s.salle}
              salle={s}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              busy={busyId === s.esp32_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
