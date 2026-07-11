import React, { useCallback, useEffect, useState } from 'react'
import { Activity, AlertCircle, Bell, Cloud, FileText, RefreshCw } from 'lucide-react'
import StatCard from '../components/Dashboard/StatCard'
import LineChart from '../components/Charts/LineChart'
import AlertsList from '../components/Alerts/AlertsList'
import SensorsList from '../components/Sensors/SensorsList'
import { getAlertes, getCapteurs, getDocuments, getMesures } from '../services/api'
import { Alerte, Capteur, Document, Mesure } from '../types'
import { MONITORING_TYPES } from '../monitoring'

export default function DashboardPage() {
  const [capteurs, setCapteurs] = useState<Capteur[]>([])
  const [mesures, setMesures] = useState<Mesure[]>([])
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [c, m, a, d] = await Promise.all([
        getCapteurs(),
        getMesures(undefined, 80),
        getAlertes(false),
        getDocuments(),
      ])
      setCapteurs(c.data)
      setMesures(m.data)
      setAlertes(a.data)
      setDocuments(d.data)
    } catch {
      setError('Impossible de charger les données du tableau de bord.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const byType = (type: string) => {
    const ids = capteurs.filter(c => c.type === type).map(c => c.id)
    return mesures.filter(m => ids.includes(m.capteur_id))
  }

  const latestValue = (type: string) => {
    const m = byType(type)[0]
    return m ? `${m.valeur}` : '--'
  }

  const countByType = (type: string) => capteurs.filter(c => c.type === type).length
  const activeAlerts = alertes.filter(a => !a.traitee).length
  const indexedDocuments = documents.filter(d => d.indexe).length
  const activeMonitoringFamilies = MONITORING_TYPES.filter(t => countByType(t.type) > 0).length
  const chartTypes = MONITORING_TYPES.filter(t => countByType(t.type) > 0)

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Vue temps réel</p>
          <h2 className="text-[25px] font-semibold tracking-[-0.03em] text-slate-950">Tableau de bord</h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Surveillance température, humidité, pression, chambres froides, qualité d'air et CO2.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Familles surveillées"
          value={activeMonitoringFamilies}
          icon={Activity}
          color="bg-gradient-to-b from-blue-400 to-blue-600"
          sub={`${capteurs.length} capteur(s) actif(s)`}
          tone="neutral"
        />
        <StatCard
          title="Alertes actives"
          value={activeAlerts}
          icon={Bell}
          color={activeAlerts > 0 ? 'bg-gradient-to-b from-amber-400 to-amber-500' : 'bg-gradient-to-b from-emerald-400 to-emerald-500'}
          sub={activeAlerts > 0 ? 'À traiter en priorité' : 'Situation stable'}
          tone={activeAlerts > 0 ? 'warning' : 'good'}
        />
        <StatCard
          title="Documents"
          value={documents.length}
          icon={FileText}
          color="bg-gradient-to-b from-indigo-400 to-indigo-500"
          sub={`${indexedDocuments} indexé(s)`}
          tone={indexedDocuments === documents.length && documents.length > 0 ? 'good' : 'neutral'}
        />
{/*         <StatCard
          title="CO2 réel"
          value={latestValue('co2')}
          unit="ppm"
          icon={Cloud}
          color="bg-gradient-to-b from-slate-500 to-slate-700"
          sub={countByType('co2') > 0 ? `${countByType('co2')} capteur(s)` : 'Option selon budget'}
          tone="neutral"
        /> */}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MONITORING_TYPES.map(item => (
          <StatCard
            key={item.type}
            title={item.title}
            value={latestValue(item.type)}
            unit={item.unit}
            icon={item.icon}
            color={item.color}
            sub={`${countByType(item.type)} capteur(s)`}
            tone={countByType(item.type) > 0 ? 'neutral' : 'warning'}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(chartTypes.length > 0 ? chartTypes : MONITORING_TYPES.slice(0, 2)).map(item => (
          <LineChart
            key={item.type}
            mesures={byType(item.type)}
            title={`${item.title} (${item.unit})`}
            color={item.chart}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SensorsList capteurs={capteurs} onRefresh={load} />
        <AlertsList alertes={alertes} onRefresh={load} />
      </div>
    </div>
  )
}
