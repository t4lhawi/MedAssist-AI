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
   SalleCard – premium SaaS restyle
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
        group relative rounded-2xl border bg-white dark:bg-card p-3 transition-all duration-200 ease-out
        ${borderClass} ${bgClass}
        hover:shadow-[0_4px_14px_-6px_rgba(17,17,17,0.14)]
        ${isExpanded ? 'grid grid-rows-[auto_auto_1fr]' : 'grid grid-rows-[auto_1fr]'}
      `}
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
    >
      {/* Header: icon + title */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${tone.bg} ${tone.text}`}>
          <mt.icon size={12} strokeWidth={2.5} />
        </span>
        <p className="truncate text-xs font-medium text-[#6B7280] dark:text-text-secondary">{mt.title}</p>
        <span className="ml-auto flex items-center justify-center text-[#D1D5DB] transition-transform duration-150 group-hover:text-[#6B7280] dark:text-text-secondary">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* Main value */}
      <div className="flex items-end gap-1.5 mb-2">
        {state === 'not_installed' ? (
          <span className="text-sm font-medium text-[#9CA3AF] dark:text-text-muted">Non installé</span>
        ) : (
          <>
            <span className="text-xl font-semibold text-[#111111] dark:text-text-primary tabular-nums">
              {formatValue(value, unit, type === 'pression' ? 0 : 1)}
            </span>
            <span className="text-xs text-[#9CA3AF] dark:text-text-muted self-end mb-0.5">{unit}</span>
          </>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-[#ECECEC] animate-slide-down">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280] dark:text-text-secondary">Dernière mise à jour</span>
            <span className={`font-medium ${tone.text}`}>{lastSeen}</span>
          </div>
          {state === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-1.5">
              <AlertTriangle size={11} />
              <span>Erreur de lecture du capteur</span>
            </div>
          )}
          {state === 'warning' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-1.5">
              <AlertTriangle size={11} />
              <span>Données anciennes (&gt; 10 min)</span>
            </div>
          )}
          {state === 'active' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1.5">
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

  const onlineClass = salle.online
    ? 'relative flex h-2.5 w-2.5 animate-pulse-ring'
    : 'flex h-2.5 w-2.5'

  return (
    <div className="group relative rounded-[24px] border border-[#ECECEC] dark:border-border bg-white dark:bg-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(17,17,17,0.16)] overflow-hidden">
      {/* Top accent bar — color coded by room status */}
      <div
        className={`h-1 w-full transition-colors duration-200 ${
          !salle.actif
            ? 'bg-[#ECECEC]'
            : salle.online
            ? 'bg-emerald-500'
            : 'bg-amber-500'
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
                  rounded-full transition-all duration-200
                  ${salle.online ? 'bg-emerald-500' : 'bg-[#D1D5DB]'}
                  ${!salle.actif && 'bg-[#D1D5DB]'}
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
                  className="w-full rounded-xl border border-[#ECECEC] bg-[#F5F5F7] px-2.5 py-1 text-sm font-semibold text-[#111111] dark:text-text-primary outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                />
              ) : (
                <h3 className="truncate text-base font-semibold tracking-tight text-[#111111] dark:text-text-primary">
                  {salle.salle}
                </h3>
              )}

              <div className="mt-1 flex items-center gap-2">
                {salle.ip && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-[#9CA3AF] dark:text-text-muted">
                    <Wifi className="h-3 w-3" />
                    {salle.ip}
                  </span>
                )}
                {!salle.actif && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[10px] font-medium text-[#6B7280] dark:text-text-secondary">
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
            <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <button
                onClick={() => { setNewName(salle.salle); setIsRenaming(true) }}
                disabled={busy}
                title="Renommer"
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] dark:text-text-muted transition-all duration-150 hover:bg-[#F5F5F7] hover:text-[#111111] dark:text-text-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleToggleActif}
                disabled={busy}
                title={salle.actif ? 'Désactiver' : 'Activer'}
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] dark:text-text-muted transition-all duration-150 hover:bg-[#F5F5F7] hover:text-[#111111] dark:text-text-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salle.actif ? <PowerOff size={14} /> : <Power size={14} />}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={busy}
                title="Supprimer"
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] dark:text-text-muted transition-all duration-150 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
              </button>
              {busy && (
                <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF] dark:text-text-muted" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/30 animate-fade-in">
            <div className="w-full max-w-md rounded-[24px] bg-white dark:bg-card p-6 shadow-[0_24px_60px_-16px_rgba(17,17,17,0.28)] animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-semibold text-[#111111] dark:text-text-primary">Supprimer la salle</h3>
              </div>
              <p className="mb-6 text-sm text-[#6B7280] dark:text-text-secondary">
                Voulez-vous vraiment supprimer <strong className="text-[#111111] dark:text-text-primary">{salle.salle}</strong> ?
                Cette action est irréversible et supprimera aussi l'ESP32 associé.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={busy}
                  className="rounded-full border border-[#ECECEC] dark:border-border bg-white dark:bg-card px-4 py-2 text-sm font-medium text-[#374151] dark:text-text-secondary transition-colors duration-150 hover:bg-[#F5F5F7] disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-600 disabled:opacity-50"
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
        @keyframes slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
        @keyframes slide-down { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 200px; } }
        .animate-slide-down { animation: slide-down 0.22s ease-out forwards; }
      `}</style>
    </div>
  )
}