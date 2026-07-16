import React from 'react'
import { Loader2, Pencil, PowerOff, Power, Trash2 } from 'lucide-react'
import type { SalleStatus } from '../../types'
import { MONITORING_TYPES, getMonitoringType } from '../../monitoring'

interface Props {
  salle: SalleStatus
  onUpdate: (id: number, data: { actif?: boolean; salle?: string; note?: string }) => Promise<void>
  onDelete: (id: number) => Promise<void>
  busy?: boolean
}

const STATE_BORDER: Record<string, string> = {
  active: 'border-emerald-200',
  offline: 'border-amber-200',
  not_installed: 'border-slate-200 border-dashed',
}

const STATE_TONE: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'En ligne' },
  offline: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', label: 'Hors ligne' },
  not_installed: { dot: 'bg-slate-300', bg: 'bg-slate-50', text: 'text-slate-500', label: 'Non installé' },
}

export default function SalleCard({ salle, onUpdate, onDelete, busy }: Props) {
  const sensorByType = Object.fromEntries(salle.sensors.map(s => [s.type, s]))

  const handleRename = async () => {
    const next = window.prompt('Nouveau nom de salle :', salle.salle)
    if (!next || next.trim() === salle.salle) return
    await onUpdate(salle.esp32_id!, { salle: next.trim() })
  }

  const handleToggleActif = async () => {
    await onUpdate(salle.esp32_id!, { actif: !salle.actif })
  }

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer l'ESP32 « ${salle.salle} » (${salle.ip}) ?\nLes mesures historiques resteront dans le bucket « non enregistrés ».`)) return
    await onDelete(salle.esp32_id!)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${salle.online ? 'bg-emerald-500' : 'bg-slate-300'}`}
              title={salle.online ? 'Activité récente' : 'Aucune mesure récente'}
            />
            <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
              {salle.salle}
            </h3>
            {!salle.actif && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
                désactivé
              </span>
            )}
          </div>
          {salle.ip && (
            <p className="mt-1 pl-4 font-mono text-[12px] text-slate-400">{salle.ip}</p>
          )}
        </div>

        {salle.esp32_id !== null && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleRename}
              disabled={busy}
              title="Renommer la salle"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={handleToggleActif}
              disabled={busy}
              title={salle.actif ? 'Désactiver' : 'Activer'}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              {salle.actif ? <PowerOff size={13} /> : <Power size={13} />}
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              title="Supprimer"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Sensor tiles */}
      <div className="grid grid-cols-2 gap-2">
        {MONITORING_TYPES.map(mt => {
          const s = sensorByType[mt.type]
          const state = s?.state || 'not_installed'
          const tone = STATE_TONE[state]
          const Icon = getMonitoringType(mt.type).icon
          return (
            <div
              key={mt.type}
              className={`rounded-xl border bg-white p-2.5 ${STATE_BORDER[state]}`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${tone.bg} ${tone.text}`}
                >
                  <Icon size={11} strokeWidth={2.4} />
                </span>
                <p className="truncate text-[11px] font-medium text-slate-500">{mt.title}</p>
              </div>
              {state === 'not_installed' ? (
                <p className="text-[12.5px] font-medium text-slate-400">Non installé</p>
              ) : (
                <>
                  <p className="text-[14.5px] font-semibold leading-none text-slate-900">
                    {s?.last_value !== null && s?.last_value !== undefined ? s.last_value : '—'}
                    <span className="ml-0.5 text-[10.5px] font-medium text-slate-400">
                      {s?.last_unite || mt.unit}
                    </span>
                  </p>
                  <p className={`mt-1 truncate text-[10.5px] font-medium ${tone.text}`}>
                    {s?.last_seen_label || tone.label}
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
