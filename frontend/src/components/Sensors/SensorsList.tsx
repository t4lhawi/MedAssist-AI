import React, { useState } from 'react'
import { Capteur, Mesure } from '../../types'
import { createCapteur, getMesures } from '../../services/api'
import { Activity, Droplets, Loader2, Plus, Thermometer, Wind, X } from 'lucide-react'

interface Props {
  capteurs: Capteur[]
  onRefresh: () => void
}

const ICONS: Record<string, React.ElementType> = {
  temperature: Thermometer,
  humidite: Droplets,
  air: Wind,
}

const UNITS: Record<string, string> = {
  temperature: 'deg C',
  humidite: '%',
  air: 'ppm',
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <Activity size={18} className="text-primary" />
            Capteurs
          </h3>
          <p className="mt-1 text-xs text-slate-500">{capteurs.length} capteur(s) configure(s)</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Fermer' : 'Ajouter'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 rounded-lg border border-primary/20 bg-primary-light p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Nom du capteur</span>
              <input
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex: Temperature salle 101"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Type</span>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="temperature">Temperature</option>
                <option value="humidite">Humidite</option>
                <option value="air">Qualite de l'air</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Emplacement</span>
              <input
                value={form.emplacement}
                onChange={e => setForm({ ...form, emplacement: e.target.value })}
                placeholder="Salle 101"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {capteurs.map(c => {
          const Icon = ICONS[c.type] || Activity
          const derniere = dernieres[c.id]

          return (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{c.nom}</p>
                <p className="truncate text-xs text-slate-500">{c.emplacement || 'Emplacement non renseigne'}</p>
              </div>
              <div className="shrink-0 text-right">
                {derniere ? (
                  <p className="text-sm font-bold text-primary">{derniere.valeur} {UNITS[c.type] || ''}</p>
                ) : (
                  <p className="text-xs font-medium text-slate-400">Aucune mesure</p>
                )}
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  c.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${c.actif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {c.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          )
        })}

        {capteurs.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <Activity size={30} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">Aucun capteur enregistre</p>
          </div>
        )}
      </div>
    </div>
  )
}
