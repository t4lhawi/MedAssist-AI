import React, { useState } from 'react'
import { Capteur, Mesure } from '../../types'
import { createCapteur, getMesures } from '../../services/api'
import { Activity, Plus, Thermometer, Droplets, Wind } from 'lucide-react'

interface Props { capteurs: Capteur[]; onRefresh: () => void }

const ICONS: Record<string, React.ElementType> = {
  temperature: Thermometer, humidite: Droplets, air: Wind
}
const UNITS: Record<string, string> = { temperature: '°C', humidite: '%', air: 'ppm' }

export default function SensorsList({ capteurs, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', type: 'temperature', emplacement: '' })
  const [dernieres, setDernieres] = useState<Record<number, Mesure | null>>({})

  React.useEffect(() => {
    capteurs.forEach(async c => {
      const r = await getMesures(c.id, 1)
      setDernieres(prev => ({ ...prev, [c.id]: r.data[0] || null }))
    })
  }, [capteurs])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createCapteur(form)
    setShowForm(false); setForm({ nom: '', type: 'temperature', emplacement: '' })
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Activity size={18} /> Capteurs</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-dark">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 p-3 bg-primary-light rounded-lg space-y-2">
          <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})}
            placeholder="Nom du capteur" required className="w-full border rounded px-3 py-1.5 text-sm" />
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
            className="w-full border rounded px-3 py-1.5 text-sm">
            <option value="temperature">Température</option>
            <option value="humidite">Humidité</option>
            <option value="air">Qualité de l'air</option>
          </select>
          <input value={form.emplacement} onChange={e => setForm({...form, emplacement: e.target.value})}
            placeholder="Emplacement (ex: Salle 101)" className="w-full border rounded px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="bg-primary text-white px-3 py-1.5 rounded text-sm">Enregistrer</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-3 py-1.5 rounded text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {capteurs.map(c => {
          const Icon = ICONS[c.type] || Activity
          const derniere = dernieres[c.id]
          return (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                <Icon size={14} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{c.nom}</p>
                <p className="text-xs text-gray-400">{c.emplacement}</p>
              </div>
              <div className="text-right">
                {derniere ? (
                  <p className="font-bold text-primary text-sm">{derniere.valeur} {UNITS[c.type] || ''}</p>
                ) : <p className="text-xs text-gray-400">Aucune mesure</p>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.actif ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {c.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          )
        })}
        {capteurs.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Aucun capteur enregistré</p>}
      </div>
    </div>
  )
}