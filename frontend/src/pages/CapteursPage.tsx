import React, { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { getCapteurs, getMesures } from '../services/api'
import { Capteur, Mesure } from '../types'
import SensorsList from '../components/Sensors/SensorsList'
import LineChart from '../components/Charts/LineChart'

export default function CapteursPage() {
  const [capteurs, setCapteurs] = useState<Capteur[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [mesures, setMesures] = useState<Mesure[]>([])

  const loadCapteurs = async () => {
    const r = await getCapteurs()
    setCapteurs(r.data)
  }

  useEffect(() => { loadCapteurs() }, [])

  useEffect(() => {
    if (selected) getMesures(selected, 100).then(r => setMesures(r.data))
    else setMesures([])
  }, [selected])

  const sel = capteurs.find(c => c.id === selected)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Infrastructure</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Capteurs</h2>
        <p className="mt-1 text-sm text-slate-500">Configuration et historique des mesures terrain.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SensorsList capteurs={capteurs} onRefresh={loadCapteurs} />
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Historique d'un capteur</label>
            <select
              value={selected || ''}
              onChange={e => setSelected(Number(e.target.value) || null)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">Selectionner un capteur</option>
              {capteurs.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.emplacement || 'sans emplacement'})</option>)}
            </select>
          </div>

          {selected && mesures.length > 0 && (
            <LineChart
              mesures={mesures}
              title={`Historique : ${sel?.nom}`}
              color={sel?.type === 'temperature' ? '#EF4444' : sel?.type === 'humidite' ? '#0EA5E9' : '#10B981'}
            />
          )}

          {selected && mesures.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
              <Activity size={32} className="mx-auto mb-2" />
              <p className="text-sm font-medium">Aucune mesure disponible pour ce capteur.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
