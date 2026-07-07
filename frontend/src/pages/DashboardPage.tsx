import React, { useEffect, useState, useCallback } from 'react'
import { Thermometer, Droplets, Bell, FileText } from 'lucide-react'
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

  const load = useCallback(async () => {
    const [c, m, a, d] = await Promise.all([
      getCapteurs(), getMesures(undefined, 50), getAlertes(false), getDocuments()
    ])
    setCapteurs(c.data); setMesures(m.data); setAlertes(a.data); setDocuments(d.data)
  }, [])

  useEffect(() => { load() }, [load])

  // Regrouper les mesures par type
  const byType = (type: string) => {
    const ids = capteurs.filter(c => c.type === type).map(c => c.id)
    return mesures.filter(m => ids.includes(m.capteur_id))
  }
  const derniereVal = (type: string) => {
    const m = byType(type)[0]
    return m ? `${m.valeur}` : '--'
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Tableau de bord</h2>
        <p className="text-gray-500 text-sm mt-1">Surveillance en temps réel · CHU Mohammed VI Oujda</p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Température" value={derniereVal('temperature')} unit="°C"
          icon={Thermometer} color="bg-red-500" sub={`${capteurs.filter(c=>c.type==='temperature').length} capteur(s)`} />
        <StatCard title="Humidité" value={derniereVal('humidite')} unit="%"
          icon={Droplets} color="bg-blue-500" sub={`${capteurs.filter(c=>c.type==='humidite').length} capteur(s)`} />
        <StatCard title="Alertes actives" value={alertes.filter(a=>!a.traitee).length}
          icon={Bell} color={alertes.filter(a=>!a.traitee).length > 0 ? 'bg-orange-500' : 'bg-green-500'}
          sub="Non traitées" />
        <StatCard title="Documents" value={documents.length}
          icon={FileText} color="bg-purple-500"
          sub={`${documents.filter(d=>d.indexe).length} indexé(s)`} />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart mesures={byType('temperature')} title="Température (°C)" color="#EF4444" />
        <LineChart mesures={byType('humidite')} title="Humidité (%)" color="#3B82F6" />
      </div>

      {/* Capteurs + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SensorsList capteurs={capteurs} onRefresh={load} />
        <AlertsList alertes={alertes} onRefresh={load} />
      </div>
    </div>
  )
}