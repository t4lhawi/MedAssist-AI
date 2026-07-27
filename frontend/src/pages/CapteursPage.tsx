import React, { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
// @ts-expect-error legacy API — kept for backward compat
import { getCapteurs, getMesures } from '../services/api'
// @ts-expect-error legacy types — kept for backward compat
import { Capteur, Mesure } from '../types'
import SensorsList from '../components/Sensors/SensorsList'
import LineChart from '../components/Charts/LineChart'
import Select from '../components/ui/Select'
import PageHeader from '../components/ui/PageHeader'
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
    if (selected) {
      // @ts-expect-error legacy call signature
      getMesures(selected, 100).then(r => setMesures(r.data))
    } else setMesures([])
  }, [selected])

  const sel = capteurs.find(c => c.id === selected)

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:px-6">
      <PageHeader
        category="Infrastructure"
        title="Capteurs"
        subtitle="Configuration, état et historique des mesures environnementales et chambres froides."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
        <SensorsList capteurs={capteurs} onRefresh={loadCapteurs} />
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <label className="mb-2 block text-[12px] font-semibold text-text-secondary">Historique d'un capteur</label>
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
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <Activity size={28} strokeWidth={1.5} className="mx-auto mb-2 text-text-muted" />
              <p className="text-[13px] font-medium text-text-muted">Aucune mesure disponible pour ce capteur.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
