import React, { useState } from 'react'
import { Alerte } from '../../types'
import { traiterAlerte } from '../../services/api'
import { AlertTriangle, Check, CheckCircle, Info, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  alertes: Alerte[]
  onRefresh: () => void
}

const COLORS = {
  critique: 'border-red-200 bg-red-50 text-red-800',
  attention: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
}

const ICONS = {
  critique: AlertTriangle,
  attention: AlertTriangle,
  info: Info,
}

export default function AlertsList({ alertes, onRefresh }: Props) {
  const [processing, setProcessing] = useState<number | null>(null)

  const traiter = async (id: number) => {
    setProcessing(id)
    try {
      await traiterAlerte(id)
      onRefresh()
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <AlertTriangle size={18} className="text-amber-500" />
            Alertes actives
          </h3>
          <p className="mt-1 text-xs text-slate-500">{alertes.length} evenement(s) a surveiller</p>
        </div>
      </div>

      {alertes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-400">
          <CheckCircle size={36} className="mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium text-slate-600">Aucune alerte active</p>
          <p className="mt-1 text-xs">Tous les capteurs sont dans un etat normal.</p>
        </div>
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {alertes.map(a => {
            const Icon = ICONS[a.niveau]

            return (
              <div key={a.id} className={`flex items-start gap-3 rounded-lg border p-3 ${COLORS[a.niveau]}`}>
                <Icon size={17} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                      {a.niveau}
                    </span>
                    <span className="text-xs opacity-75">{format(new Date(a.cree_le), 'dd/MM HH:mm', { locale: fr })}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{a.message}</p>
                </div>
                {!a.traitee && (
                  <button
                    onClick={() => traiter(a.id)}
                    disabled={processing === a.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/70 bg-white px-2.5 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {processing === a.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Traiter
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
