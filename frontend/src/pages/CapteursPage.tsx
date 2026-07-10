import React, { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { getCapteurs, getMesures } from '../services/api'
import { Capteur, Mesure } from '../types'
import SensorsList from '../components/Sensors/SensorsList'
import LineChart from '../components/Charts/LineChart'
import Select from '../components/ui/select'

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
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)]">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-600">Infrastructure</p>
        <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-slate-900">Capteurs</h2>
        <p className="mt-1 text-[13px] text-slate-400">Configuration et historique des mesures terrain.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SensorsList capteurs={capteurs} onRefresh={loadCapteurs} />
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)]">
            <label className="mb-2 block text-[12px] font-medium text-slate-500">Historique d'un capteur</label>
            <Select
              value={selected ? String(selected) : ''}
              onChange={v => setSelected(v ? Number(v) : null)}
              placeholder="Sélectionner un capteur"
              options={capteurs.map(c => ({
                value: String(c.id),
                label: `${c.nom} (${c.emplacement || 'sans emplacement'})`,
              }))}
            />
          </div>

          {selected && mesures.length > 0 && (
            <LineChart
              mesures={mesures}
              title={`Historique : ${sel?.nom}`}
              color={sel?.type === 'temperature' ? '#EF4444' : sel?.type === 'humidite' ? '#0EA5E9' : '#10B981'}
            />
          )}

          {selected && mesures.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-10 text-center">
              <Activity size={28} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[13px] font-medium text-slate-400">Aucune mesure disponible pour ce capteur.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}