import React, { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Settings2, ShieldCheck } from 'lucide-react'
import {
  deleteEsp32,
  getSallesStatus,
  getUnregisteredSources,
  updateEsp32,
} from '../services/api'
import type { SalleStatus, UnregisteredSource } from '../types'
import Esp32Form from '../components/Admin/Esp32Form'
import SalleCard from '../components/Admin/SalleCard'
import UnregisteredList from '../components/Admin/UnregisteredList'

export default function AdminSallesPage() {
  const [salles, setSalles] = useState<SalleStatus[]>([])
  const [unregistered, setUnregistered] = useState<UnregisteredSource[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pollMs, setPollMs] = useState(5000)

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, u] = await Promise.all([
        getSallesStatus(),
        getUnregisteredSources(),
      ])
      setSalles(s.data)
      setUnregistered(u.data)
    } catch {
      setError('Impossible de charger les salles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, pollMs)
    return () => clearInterval(id)
  }, [load, pollMs])

  const handleUpdate = async (
    id: number,
    data: { actif?: boolean; salle?: string; note?: string },
  ) => {
    setBusy(true)
    try {
      await updateEsp32(id, data)
      await load()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Mise à jour impossible.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: number) => {
    setBusy(true)
    try {
      await deleteEsp32(id)
      await load()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Suppression impossible.')
    } finally {
      setBusy(false)
    }
  }

  const registeredSalles = salles.filter(s => s.esp32_id !== null)
  const unregisteredSalles = salles.filter(s => s.esp32_id === null)

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
            <ShieldCheck size={12} />
            Administration
          </p>
          <h2 className="text-[25px] font-semibold tracking-[-0.03em] text-slate-950">
            Salles &amp; ESP32
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Enregistrez vos ESP32, suivez l'état en temps réel et réclamez les IP non reconnues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pollMs}
            onChange={e => setPollMs(Number(e.target.value))}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 shadow-sm outline-none"
            title="Fréquence de rafraîchissement"
          >
            <option value={2000}>2 s</option>
            <option value={5000}>5 s</option>
            <option value={15000}>15 s</option>
            <option value={60000}>60 s</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Unregistered bucket — always at the top so it's visible */}
      <UnregisteredList sources={unregistered} onClaimed={load} />

      {/* Add ESP32 form */}
      <Esp32Form onCreated={load} />

      {/* Section title */}
      <div className="flex items-center gap-2 pt-2">
        <Settings2 size={15} className="text-slate-400" />
        <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-slate-800">
          Salles enregistrées
        </h3>
        <span className="text-[12px] text-slate-400">
          ({registeredSalles.length})
        </span>
      </div>

      {/* Salles grid */}
      {registeredSalles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <Settings2 size={28} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
          <p className="text-[13.5px] font-medium text-slate-500">
            Aucun ESP32 enregistré.
          </p>
          <p className="mt-1 text-[12px] text-slate-400">
            Ajoutez-en un via le formulaire ci-dessus, ou réclamez un IP détecté dans la section « non enregistrés ».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {registeredSalles.map(s => (
            <SalleCard
              key={s.esp32_id ?? `salle-${s.salle}`}
              salle={s}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              busy={busy}
            />
          ))}
        </div>
      )}

      {/* Synthetic Unregistered salle card (if backend returned one) */}
      {unregisteredSalles.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <AlertCircle size={15} className="text-amber-500" />
            <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-slate-800">
              Mesures sans salle identifiée
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unregisteredSalles.map(s => (
              <SalleCard
                key={`unreg-${s.salle}`}
                salle={s}
                onUpdate={async () => {}}
                onDelete={async () => {}}
                busy={true}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
