import React, { useState } from 'react'
import { Alerte } from '../../types'
import { traiterAlerte } from '../../services/api'
import { AlertTriangle, Check, CheckCircle, Info, Loader2, ShieldCheck, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getMonitoringType } from '../../monitoring'

interface Props {
  alertes: Alerte[]
  onRefresh: () => void
  /** When true, render a more "everything is fine" empty state. */
  variant?: 'active' | 'all' | 'processed'
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

function relativeTime(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

export default function AlertsList({ alertes, onRefresh, variant = 'all' }: Props) {
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

  const isEmpty = alertes.length === 0
  const emptyTitle =
    variant === 'active'
      ? 'Tout est sous contrôle'
      : variant === 'processed'
      ? 'Aucune alerte traitée pour l\'instant'
      : 'Aucune alerte enregistrée'
  const emptySub =
    variant === 'active'
      ? "Les alertes en cours apparaîtront ici automatiquement."
      : variant === 'processed'
      ? "Les alertes que vous marquez comme traitées apparaîtront ici."
      : "L'historique est vide pour le moment."

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-slate-900">
            Alertes
          </h3>
          {alertes.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
              {alertes.length}
            </span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="px-4 py-12 text-center">
          <div className="relative mx-auto mb-4 h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-100 opacity-50" />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 ring-4 ring-emerald-50">
              {variant === 'processed' ? (
                <CheckCircle size={28} className="text-emerald-500" />
              ) : (
                <ShieldCheck size={28} className="text-emerald-500" />
              )}
            </div>
          </div>
          <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-slate-800">{emptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-[26ch] text-[12.5px] text-slate-400">{emptySub}</p>
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          {alertes.map((a, idx) => {
            const Icon = ICONS[a.niveau]
            const s = STYLES[a.niveau]
            const sensor = getMonitoringType((a as any).capteur_type || undefined)
            const SensorIcon = sensor.icon
            const date = new Date(a.cree_le)

            return (
              <div
                key={a.id}
                className={`group flex items-start gap-3 border-b border-slate-100 p-3.5 last:border-b-0 transition-colors hover:bg-slate-50/60 ${
                  processing === a.id ? 'opacity-60' : ''
                }`}
                style={{
                  animation: 'alertSlideIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
                  animationDelay: `${idx * 30}ms`,
                }}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.bg} ${s.text}`}>
                  <Icon size={13} strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badge}`}>
                      {a.niveau}
                    </span>
                    <span className="text-[11px] text-slate-400" title={format(date, "dd MMMM yyyy HH:mm", { locale: fr })}>
                      {relativeTime(date)}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium leading-relaxed text-slate-700">{a.message}</p>
                  {((a as any).capteur_type || (a as any).capteur_nom || (a as any).capteur_emplacement) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                      {(a as any).capteur_type && (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <SensorIcon size={11} strokeWidth={2.2} />
                          {sensor.title}
                        </span>
                      )}
                      {(a as any).capteur_nom && <span>{(a as any).capteur_nom}</span>}
                      {(a as any).capteur_emplacement && <span>{(a as any).capteur_emplacement}</span>}
                    </div>
                  )}
                </div>
                {!a.traitee && (
                  <button
                    onClick={() => traiter(a.id)}
                    disabled={processing === a.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition-all hover:bg-slate-700 active:scale-95 disabled:opacity-60"
                  >
                    {processing === a.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.4} />}
                    Traiter
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
