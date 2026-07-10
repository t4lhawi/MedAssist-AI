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

const STYLES = {
  critique: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  attention: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  info: { bg: 'bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700' },
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
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-amber-50 text-amber-500">
              <AlertTriangle size={15} strokeWidth={2.2} />
            </span>
            Alertes actives
          </h3>
          <p className="mt-1 pl-9 text-[12.5px] text-slate-400">{alertes.length} événement(s) à surveiller</p>
        </div>
      </div>

      {alertes.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle size={22} className="text-emerald-500" />
          </div>
          <p className="text-[13.5px] font-medium text-slate-600">Aucune alerte active</p>
          <p className="mt-1 text-[12.5px] text-slate-400">Tous les capteurs sont dans un état normal.</p>
        </div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {alertes.map(a => {
            const Icon = ICONS[a.niveau]
            const s = STYLES[a.niveau]

            return (
              <div key={a.id} className={`flex items-start gap-3 rounded-xl p-3 ${s.bg}`}>
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70 ${s.text}`}>
                  <Icon size={13} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badge}`}>
                      {a.niveau}
                    </span>
                    <span className="text-[11.5px] text-slate-400">{format(new Date(a.cree_le), 'dd/MM HH:mm', { locale: fr })}</span>
                  </div>
                  <p className="text-[13.5px] font-medium leading-relaxed text-slate-700">{a.message}</p>
                </div>
                {!a.traitee && (
                  <button
                    onClick={() => traiter(a.id)}
                    disabled={processing === a.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)] active:scale-95 disabled:opacity-60"
                  >
                    {processing === a.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
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