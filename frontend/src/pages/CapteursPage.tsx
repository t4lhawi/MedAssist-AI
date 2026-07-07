import React, { useEffect, useState } from 'react'
import { getCapteurs, getMesures } from '../services/api'
import { Capteur, Mesure } from '../types'
import SensorsList from '../components/Sensors/SensorsList'
import LineChart from '../components/Charts/LineChart'

export default function CapteursPage() {
  const [capteurs, setCapteurs] = useState<Capteur[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [mesures, setMesures] = useState<Mesure[]>([])

  const loadCapteurs = async () => { const r = await getCapteurs(); setCapteurs(r.data) }

  useEffect(() => { loadCapteurs() }, [])

  useEffect(() => {
    if (selected) getMesures(selected, 100).then(r => setMesures(r.data))
    else setMesures([])
  }, [selected])

  const sel = capteurs.find(c => c.id === selected)

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Capteurs</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SensorsList capteurs={capteurs} onRefresh={loadCapteurs} />
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Voir l'historique d'un capteur</label>
            <select value={selected || ''} onChange={e => setSelected(Number(e.target.value) || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">-- Sélectionner un capteur --</option>
              {capteurs.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.emplacement})</option>)}
            </select>
          </div>
          {selected && mesures.length > 0 && (
            <LineChart mesures={mesures} title={`Historique : ${sel?.nom}`}
              color={sel?.type === 'temperature' ? '#EF4444' : sel?.type === 'humidite' ? '#3B82F6' : '#10B981'} />
          )}
          {selected && mesures.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
              Aucune mesure disponible pour ce capteur.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}