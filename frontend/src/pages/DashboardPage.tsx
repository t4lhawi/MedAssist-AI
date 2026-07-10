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

  const derniereVal = (type: string) => {
    const m = byType(type)[0]
    return m ? `${m.valeur}` : '--'
  }

  const activeAlerts = alertes.filter(a => !a.traitee).length
  const indexedDocuments = documents.filter(d => d.indexe).length

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-600">Vue temps réel</p>
          <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-slate-900">Tableau de bord</h2>
          <p className="mt-1 text-[13px] text-slate-400">Surveillance opérationnelle · CHU Mohammed VI Oujda</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Température"
          value={derniereVal('temperature')}
          unit="°C"
          icon={Thermometer}
          color="bg-gradient-to-b from-red-400 to-red-500"
          sub={`${capteurs.filter(c => c.type === 'temperature').length} capteur(s)`}
          tone="neutral"
        />
        <StatCard
          title="Humidité"
          value={derniereVal('humidite')}
          unit="%"
          icon={Droplets}
          color="bg-gradient-to-b from-sky-400 to-sky-500"
          sub={`${capteurs.filter(c => c.type === 'humidite').length} capteur(s)`}
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
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <LineChart mesures={byType('temperature')} title="Température (°C)" color="#EF4444" />
        <LineChart mesures={byType('humidite')} title="Humidité (%)" color="#0EA5E9" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SensorsList capteurs={capteurs} onRefresh={load} />
        <AlertsList alertes={alertes} onRefresh={load} />
      </div>
    </div>
  )
}