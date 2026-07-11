import React, { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { getCapteurs, getMesures } from '../services/api'
import { Capteur, Mesure } from '../types'
import SensorsList from '../components/Sensors/SensorsList'
import LineChart from '../components/Charts/LineChart'
import Select from '../components/ui/Select'
import { getMonitoringType } from '../monitoring'

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
    <div className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Infrastructure</p>
        <h2 className="text-[25px] font-semibold tracking-[-0.03em] text-slate-950">Capteurs</h2>
        <p className="text-[13px] text-slate-500">
          Configuration, état et historique des mesures environnementales et chambres froides.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
        <SensorsList capteurs={capteurs} onRefresh={loadCapteurs} />
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[12px] font-semibold text-slate-500">Historique d'un capteur</label>
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
              color={getMonitoringType(sel?.type).chart}
            />
          )}

          {selected && mesures.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Activity size={28} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[13px] font-medium text-slate-400">Aucune mesure disponible pour ce capteur.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
