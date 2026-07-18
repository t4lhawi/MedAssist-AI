import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import {
  getSallesStatus,
  getUnregisteredSources,
  updateEsp32,
  deleteEsp32,
} from '../services/api'
import type { SalleStatus, UnregisteredSource } from '../types'
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
  }, [load])

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
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filtrer par nom ou IP…"
                className="w-56 rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[12.5px] text-slate-700 shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                    filter === f
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {FILTER_LABELS[f]}
                  <span className="ml-1 text-[10.5px] opacity-70">
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-95 disabled:opacity-60"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
          {error}
        </div>
      )}

      <UnregisteredList sources={unregistered} onClaimed={load} />

      <Esp32Form onCreated={load} />

      {loading && salles.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-[13px] text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          Chargement des salles…
        </div>
      ) : filteredSalles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-[13px] text-slate-500">
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
