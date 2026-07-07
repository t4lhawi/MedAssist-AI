import React from 'react'
import { Alerte } from '../../types'
import { traiterAlerte } from '../../services/api'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props { alertes: Alerte[]; onRefresh: () => void }

const COLORS = { critique: 'bg-red-50 border-red-300 text-red-700', attention: 'bg-yellow-50 border-yellow-300 text-yellow-700', info: 'bg-blue-50 border-blue-300 text-blue-700' }
const ICONS = { critique: AlertTriangle, attention: AlertTriangle, info: Info }

export default function AlertsList({ alertes, onRefresh }: Props) {
  const traiter = async (id: number) => {
    await traiterAlerte(id); onRefresh()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <AlertTriangle size={18} className="text-orange-500" /> Alertes actives
      </h3>
      {alertes.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-2 text-green-400" />
          <p>Aucune alerte active</p>
        </div>
      )}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alertes.map(a => {
          const Icon = ICONS[a.niveau]
          return (
            <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${COLORS[a.niveau]}`}>
              <Icon size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{a.message}</p>
                <p className="text-xs opacity-70 mt-0.5">{format(new Date(a.cree_le), 'dd/MM HH:mm', { locale: fr })}</p>
              </div>
              {!a.traitee && (
                <button onClick={() => traiter(a.id)}
                  className="text-xs px-2 py-1 rounded bg-white border shrink-0 hover:bg-gray-50">
                  Traiter
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}