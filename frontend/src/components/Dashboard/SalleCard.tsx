import React, { useState, useCallback, useMemo } from 'react'
import {
  Trash2,
  Pencil,
  Power,
  PowerOff,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Activity,
} from 'lucide-react'
import type { SalleStatus, SensorStatus } from '../../types'
import {
  MONITORING_TYPES,
  getMonitoringType,
  STATE_TONE,
  STATE_LABEL,
  STATE_BORDER,
  STATE_BG,
  type SensorState,
} from '../../monitoring'
import { useToast } from '../../hooks/useToast'
import { useSalles } from '../../hooks/useSalles'
import { formatRelativeTime } from '../../utils/time'

/* ──────────────────────────────────────────────
   SalleCard – Polished UX for Dashboard
   ────────────────────────────────────────────── */

function formatValue(val: number | null | undefined, unit: string, precision = 1) {
  if (val === null || val === undefined) return '—'
  return `${Number(val).toFixed(precision)} ${unit}`
}

function SensorTile({ type, sensor, isExpanded, onToggle }: {
  type: string
  sensor: SensorStatus | undefined
  isExpanded: boolean
  onToggle: () => void
}) {
  const mt = getMonitoringType(type)
  const state = (sensor?.state as SensorState) ?? 'not_installed'
  const tone = STATE_TONE[state]
  const borderClass = STATE_BORDER[state]
  const bgClass = STATE_BG[state]
  const lastSeen = sensor?.last_seen_label ?? tone.label
  const value = sensor?.last_value ?? null
  const unit = sensor?.last_unite ?? mt.unit

  return (
    <div
      className={`
        group relative rounded-2xl border bg-white p-3 transition-all duration-200
        ${borderClass} ${bgClass}
        hover:shadow-md hover:border-slate-300
        ${isExpanded ? 'grid grid-rows-[auto_auto_1fr]' : 'grid grid-rows-[auto_1fr]'}
      `}
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
    >
      {/* Header: icon + title */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${tone.bg} ${tone.text}`}>
          <mt.icon size={12} strokeWidth={2.5} />
        </span>
        <p className="truncate text-xs font-medium text-slate-600">{mt.title}</p>
        {/* Expand indicator */}
        <span className="ml-auto flex items-center justify-center text-slate-300 transition-transform duration-200 group-hover:text-slate-500">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* Main value */}
      <div className="flex items-end gap-1.5 mb-2">
        {state === 'not_installed' ? (
          <span className="text-sm font-medium text-slate-400">Non installé</span>
        ) : (
          <>
            <span className="text-xl font-semibold text-slate-900 tabular-nums">
              {formatValue(value, unit, type === 'pression' ? 0 : 1)}
            </span>
            <span className="text-xs text-slate-400 self-end mb-0.5">{unit}</span>
          </>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-slate-100 animate-slide-down">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Dernière mise à jour</span>
            <span className={`font-medium ${tone.text}`}>{lastSeen}</span>
          </div>
          {state === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
              <AlertTriangle size={11} />
              <span>Erreur de lecture du capteur</span>
            </div>
          )}
          {state === 'warning' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
              <AlertTriangle size={11} />
              <span>Données anciennes (&gt; 10 min)</span>
            </div>
          )}
          {state === 'active' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500" />
              <span>Données à jour</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SalleCard({ salle }: { salle: SalleStatus }) {
  const { toast } = useToast()
  const { renameSalle, toggleActif, deleteSalle, refreshSalles, busyId } = useSalles()

  const [expandedSensors, setExpandedSensors] = useState<Record<string, boolean>>({})
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(salle.salle)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const busy = busyId === salle.esp32_id

  const sensorByType = useMemo(() => {
    const map: Record<string, SensorStatus> = {}
    salle.sensors?.forEach(s => { map[s.type] = s })
    return map
  }, [salle.sensors])

  const handleRename = useCallback(async () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === salle.salle || busy) return
    try {
      await renameSalle(salle.esp32_id!, trimmed)
      toast.success(`Salle renommée en « ${trimmed} »`)
      setIsRenaming(false)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Échec du renommage')
    }
  }, [busy, newName, renameSalle, salle.esp32_id, salle.salle, toast])

  const handleToggleActif = useCallback(async () => {
    if (busy) return
    try {
      await toggleActif(salle.esp32_id!, !salle.actif)
      toast.success(salle.actif ? 'Salle désactivée' : 'Salle activée')
      refreshSalles()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Échec de l'activation")
    }
  }, [busy, refreshSalles, salle, toast, toggleActif])

  const handleDelete = useCallback(async () => {
    if (busy) return
    try {
      await deleteSalle(salle.esp32_id!)
      toast.success('Salle supprimée')
      refreshSalles()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Échec de la suppression')
    } finally {
      setShowDeleteConfirm(false)
    }
  }, [busy, deleteSalle, refreshSalles, salle.esp32_id, toast])

  const toggleSensor = useCallback((type: string) => {
    setExpandedSensors(prev => ({ ...prev, [type]: !prev[type] }))
  }, [])

  // Online indicator with pulse animation
  const onlineClass = salle.online
    ? 'relative flex h-2.5 w-2.5 animate-pulse-ring'
    : 'flex h-2.5 w-2.5'

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 overflow-hidden">
      {/* Top accent bar - color coded by room status */}
      <div
        className={`h-1 w-full transition-colors duration-300 ${
          !salle.actif
            ? 'bg-slate-200'
            : salle.online
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            : 'bg-gradient-to-r from-amber-500 to-amber-400'
        }`}
      />

      <div className="p-4 space-y-4">
        {/* Header: Room name + status + actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Online/Offline indicator with pulse */}
            <div className="relative flex-shrink-0">
              <span
                className={`
                  ${onlineClass}
                  rounded-full transition-all duration-300
                  ${salle.online ? 'bg-emerald-500' : 'bg-slate-300'}
                  ${!salle.actif && 'bg-slate-300'}
                `}
                title={salle.actif ? (salle.online ? 'En ligne · Données récentes' : 'Hors ligne · Aucune donnée récente') : 'Salle désactivée'}
              />
              {salle.online && salle.actif && (
                <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-30 animate-ping" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRename()}
                  onBlur={handleRename}
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              ) : (
                <h3 className="truncate text-base font-semibold tracking-tight text-slate-900">
                  {salle.salle}
                </h3>
              )}

              <div className="mt-1 flex items-center gap-2">
                {salle.ip && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <Wifi className="h-3 w-3" />
                    {salle.ip}
                  </span>
                )}
                {!salle.actif && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    <span className="flex h-3.5 w-3.5 items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="12" x2="9" y2="12" />
                      </svg>
                    </span>
                    Désactivée
                  </span>
                )}
                {salle.actif && !salle.online && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    <WifiOff className="h-3 w-3" />
                    Hors ligne
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {salle.esp32_id !== null && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => { setNewName(salle.salle); setIsRenaming(true) }}
                disabled={busy}
                title="Renommer"
                className="group relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pencil size={14} />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                  Renommer
                </span>
              </button>
              <button
                onClick={handleToggleActif}
                disabled={busy}
                title={salle.actif ? 'Désactiver' : 'Activer'}
                className="group relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salle.actif ? <PowerOff size={14} /> : <Power size={14} />}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                  {salle.actif ? 'Désactiver' : 'Activer'}
                </span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={busy}
                title="Supprimer"
                className="group relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                  Supprimer
                </span>
              </button>
              {busy && (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              )}
            </div>
          )}
        </div>

        {/* Sensor grid - 2 columns */}
        <div className="grid grid-cols-2 gap-2.5">
          {MONITORING_TYPES.map(mt => {
            const sensor = sensorByType[mt.type]
            const isExpanded = expandedSensors[mt.type] ?? false
            return (
              <SensorTile
                key={mt.type}
                type={mt.type}
                sensor={sensor}
                isExpanded={isExpanded}
                onToggle={() => toggleSensor(mt.type)}
              />
            )
          })}
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Supprimer la salle</h3>
              </div>
              <p className="mb-6 text-sm text-slate-600">
                Voulez-vous vraiment supprimer <strong className="text-slate-900">{salle.salle}</strong> ?
                Cette action est irréversible et supprimera aussi l'ESP32 associé.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Suppression...
                    </span>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global styles for animations */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        }
        .animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
        @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
        @keyframes slide-down { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 200px; } }
        .animate-slide-down { animation: slide-down 0.25s ease-out forwards; }
      `}</style>
    </div>
  )
}