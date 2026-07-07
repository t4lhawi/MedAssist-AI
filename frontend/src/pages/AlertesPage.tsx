import React, { useEffect, useState } from 'react'
import { getAlertes, traiterAlerte } from '../services/api'
import { Alerte } from '../types'
import { AlertTriangle, CheckCircle, Info, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const BADGE: Record<string, string> = {
  critique: 'bg-red-100 text-red-700 border-red-200',
  attention: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [filtre, setFiltre] = useState<'all' | 'active' | 'traitee'>('active')

  const load = async () => {
    const traitee = filtre === 'all' ? undefined : filtre === 'traitee'
    const r = await getAlertes(traitee as any); setAlertes(r.data)
  }
  useEffect(() => { load() }, [filtre])

  const traiter = async (id: number) => { await traiterAlerte(id); load() }

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Alertes</h2>
          <p className="text-gray-500 text-sm">{alertes.length} alerte(s) affichée(s)</p>
        </div>
        <div className="flex gap-2">
          {(['all','active','traitee'] as const).map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition
                ${filtre === f ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Traitées'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        {alertes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
            <p className="font-medium">Aucune alerte dans cette catégorie</p>
          </div>
        )}
        {alertes.map(a => (
          <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${BADGE[a.niveau]}`}>
              {a.niveau}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{a.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">{format(new Date(a.cree_le), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
            </div>
            {a.traitee
              ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Traitée</span>
              : <button onClick={() => traiter(a.id)}
                  className="text-sm bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary-dark">
                  Traiter
                </button>
            }
          </div>
        ))}
      </div>
    </div>
  )
}