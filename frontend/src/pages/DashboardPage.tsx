import React, { useEffect, useState, useCallback } from 'react'
import { AlertCircle, Bell, Droplets, FileText, RefreshCw, Thermometer } from 'lucide-react'
import StatCard from '../components/Dashboard/StatCard'
import LineChart from '../components/Charts/LineChart'
import AlertsList from '../components/Alerts/AlertsList'
import SensorsList from '../components/Sensors/SensorsList'
import { getCapteurs, getMesures, getAlertes, getDocuments } from '../services/api'
import { Capteur, Mesure, Alerte, Document } from '../types'

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
        getMesures(undefined, 50),
        getAlertes(false),
        getDocuments(),
      ])
      setCapteurs(c.data)
      setMesures(m.data)
      setAlertes(a.data)
      setDocuments(d.data)
    } catch {
      setError('Impossible de charger les donnees du tableau de bord.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const byType = (type: string) => {
    const ids = capteurs.filter(c => c.type === type).map(c => c.id)
    return mesures.filter(m => ids.includes(m.capteur_id))
  }

  const derniereVal = (type: string) => {
    const m = byType(type)[0]
    return m ? `${m.valeur}` : '--'
  }

  const activeAlerts = alertes.filter(a => !a.traitee).length
  const indexedDocuments = documents.filter(d => d.indexe).length

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Vue temps reel</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Tableau de bord</h2>
          <p className="mt-1 text-sm text-slate-500">Surveillance operationnelle - CHU Mohammed VI Oujda</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Temperature"
          value={derniereVal('temperature')}
          unit="deg C"
          icon={Thermometer}
          color="bg-red-500"
          sub={`${capteurs.filter(c => c.type === 'temperature').length} capteur(s)`}
          tone="neutral"
        />
        <StatCard
          title="Humidite"
          value={derniereVal('humidite')}
          unit="%"
          icon={Droplets}
          color="bg-sky-500"
          sub={`${capteurs.filter(c => c.type === 'humidite').length} capteur(s)`}
          tone="neutral"
        />
        <StatCard
          title="Alertes actives"
          value={activeAlerts}
          icon={Bell}
          color={activeAlerts > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
          sub={activeAlerts > 0 ? 'A traiter en priorite' : 'Situation stable'}
          tone={activeAlerts > 0 ? 'warning' : 'good'}
        />
        <StatCard
          title="Documents"
          value={documents.length}
          icon={FileText}
          color="bg-indigo-500"
          sub={`${indexedDocuments} indexe(s)`}
          tone={indexedDocuments === documents.length && documents.length > 0 ? 'good' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LineChart mesures={byType('temperature')} title="Temperature (deg C)" color="#EF4444" />
        <LineChart mesures={byType('humidite')} title="Humidite (%)" color="#0EA5E9" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SensorsList capteurs={capteurs} onRefresh={load} />
        <AlertsList alertes={alertes} onRefresh={load} />
      </div>
    </div>
  )
}
