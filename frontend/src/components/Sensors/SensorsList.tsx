import React, { useState } from 'react'
import { Capteur, Mesure } from '../../types'
import { createCapteur, getMesures } from '../../services/api'
import { Activity, Loader2, Plus, X } from 'lucide-react'
import Select from '../ui/Select'
import { MONITORING_TYPES, getMonitoringType } from '../../monitoring'

interface Props {
  capteurs: Capteur[]
  onRefresh: () => void
}

export default function SensorsList({ capteurs, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', type: 'temperature', emplacement: '' })
  const [dernieres, setDernieres] = useState<Record<number, Mesure | null>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    let cancelled = false

    capteurs.forEach(async c => {
      try {
        const r = await getMesures(c.id, 1)
        if (!cancelled) {
          setDernieres(prev => ({ ...prev, [c.id]: r.data[0] || null }))
        }
      } catch {
        if (!cancelled) {
          setDernieres(prev => ({ ...prev, [c.id]: null }))
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [capteurs])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createCapteur(form)
      setShowForm(false)
      setForm({ nom: '', type: 'temperature', emplacement: '' })
      onRefresh()
    } catch {
      setError("Impossible d'ajouter le capteur.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Activity size={15} strokeWidth={2.2} />
            </span>
            Capteurs
          </h3>
          <p className="mt-1 pl-9 text-[12.5px] text-slate-400">{capteurs.length} capteur(s) configuré(s)</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Fermer' : 'Ajouter'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Nom du capteur</span>
              <input
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex: CO2 chambre froide 02"
                required
                className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-800 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Type</span>
              <Select
                value={form.type}
                onChange={v => setForm({ ...form, type: v })}
                options={MONITORING_TYPES.map(({ type, title }) => ({ value: type, label: type === 'chambre_froide' ? 'Chambre froide précise' : title }))}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Emplacement</span>
              <input
                value={form.emplacement}
                onChange={e => setForm({ ...form, emplacement: e.target.value })}
                placeholder="Salle 101, bloc, chambre froide..."
                className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-800 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]"
              />
            </label>
          </div>

          {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-colors hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="space-y-1">
        {capteurs.map(c => {
          const meta = getMonitoringType(c.type)
          const Icon = meta.icon
          const derniere = dernieres[c.id]

          return (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-slate-800">{c.nom}</p>
                <p className="truncate text-[12px] text-slate-400">
                  {meta.title} · {c.emplacement || 'Emplacement non renseigné'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {derniere ? (
                  <p className="text-[14px] font-semibold text-slate-900">
                    {derniere.valeur} <span className="text-[12px] font-medium text-slate-400">{derniere.unite || meta.unit}</span>
                  </p>
                ) : (
                  <p className="text-[12px] font-medium text-slate-300">Aucune mesure</p>
                )}
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    c.actif ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${c.actif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {c.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          )
        })}

        {capteurs.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <Activity size={28} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
            <p className="text-[13.5px] font-medium text-slate-500">Aucun capteur enregistré</p>
          </div>
        )}
      </div>
    </div>
  )
}
