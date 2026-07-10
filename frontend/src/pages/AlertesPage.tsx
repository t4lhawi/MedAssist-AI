import React, { useEffect, useState } from 'react'
import { getAlertes, traiterAlerte } from '../services/api'
import { Alerte } from '../types'
import { Check, CheckCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const BADGE: Record<string, string> = {
  critique: 'bg-red-50 text-red-700 border-red-200',
  attention: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
}

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [filtre, setFiltre] = useState<'all' | 'active' | 'traitee'>('active')
  const [processing, setProcessing] = useState<number | null>(null)

  const load = async () => {
    const traitee = filtre === 'all' ? undefined : filtre === 'traitee'
    const r = await getAlertes(traitee as any)
    setAlertes(r.data)
  }

  useEffect(() => { load() }, [filtre])

  const traiter = async (id: number) => {
    setProcessing(id)
    try {
      await traiterAlerte(id)
      load()
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Suivi des incidents</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Alertes</h2>
          <p className="mt-1 text-sm text-slate-500">{alertes.length} alerte(s) affichee(s)</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          {(['all', 'active', 'traitee'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                filtre === f ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Traitees'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {alertes.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <CheckCircle size={46} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-semibold text-slate-700">Aucune alerte dans cette categorie</p>
            <p className="mt-1 text-sm text-slate-400">Changez le filtre pour consulter l'historique complet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alertes.map(a => (
              <div key={a.id} className="grid gap-3 p-4 transition hover:bg-slate-50 md:grid-cols-[auto_1fr_auto] md:items-center">
                <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${BADGE[a.niveau]}`}>
                  {a.niveau}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{a.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{format(new Date(a.cree_le), 'dd MMMM yyyy HH:mm', { locale: fr })}</p>
                </div>
                {a.traitee ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    <CheckCircle size={15} /> Traitee
                  </span>
                ) : (
                  <button
                    onClick={() => traiter(a.id)}
                    disabled={processing === a.id}
                    className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
                  >
                    {processing === a.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Traiter
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
