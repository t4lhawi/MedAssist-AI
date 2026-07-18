import React, { useEffect, useRef, useState } from 'react'
import {
  Pencil,
  PowerOff,
  Power,
  Trash2,
  Check,
  X,
  Copy,
  Loader2,
  Server,
  ServerOff,
  AlertCircle,
  CircleDot,
  MoreHorizontal,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import type { SalleStatus } from '../../types'
import { MONITORING_TYPES, getMonitoringType } from '../../monitoring'
import { TextField } from '../ui/Field'

interface Props {
  salle: SalleStatus
  onUpdate: (id: number, data: { actif?: boolean; salle?: string; note?: string }) => Promise<void>
  onDelete: (id: number) => Promise<void>
  busy?: boolean
}

type ConnectionState = 'online' | 'offline' | 'inactive'

const CONNECTION_TONE: Record<
  ConnectionState,
  {
    dot: string
    pulse: string
    chip: string
    chipText: string
    accent: string
    label: string
  }
> = {
  online: {
    dot: 'bg-emerald-500',
    pulse: 'bg-emerald-400',
    chip: 'bg-emerald-50 ring-emerald-200/70',
    chipText: 'text-emerald-700',
    accent: 'from-emerald-500/15 via-emerald-400/5',
    label: 'En ligne',
  },
  offline: {
    dot: 'bg-amber-500',
    pulse: 'bg-amber-400',
    chip: 'bg-amber-50 ring-amber-200/70',
    chipText: 'text-amber-700',
    accent: 'from-amber-500/15 via-amber-400/5',
    label: 'Hors ligne',
  },
  inactive: {
    dot: 'bg-slate-400',
    pulse: 'bg-slate-300',
    chip: 'bg-slate-100 ring-slate-200/70',
    chipText: 'text-slate-600',
    accent: 'from-slate-300/15 via-slate-200/5',
    label: 'Inactive',
  },
}

function getConnectionState(salle: SalleStatus): ConnectionState {
  if (!salle.actif) return 'inactive'
  return salle.online ? 'online' : 'offline'
}

export default function SalleCard({ salle, onUpdate, onDelete, busy }: Props) {
  const sensorByType = Object.fromEntries(salle.sensors.map(s => [s.type, s]))

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(salle.salle)
  const [renameError, setRenameError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [editingName])

  // Close overflow menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const startRename = () => {
    setNameDraft(salle.salle)
    setRenameError('')
    setConfirmingDelete(false)
    setMenuOpen(false)
    setEditingName(true)
  }

  const cancelRename = () => {
    setEditingName(false)
    setRenameError('')
  }

  const saveRename = async () => {
    const next = nameDraft.trim()
    if (!next || next === salle.salle) {
      setEditingName(false)
      return
    }
    setActionBusy(true)
    setRenameError('')
    try {
      await onUpdate(salle.esp32_id!, { salle: next })
      setEditingName(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setRenameError(typeof detail === 'string' ? detail : 'Renommage impossible.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveRename() }
    if (e.key === 'Escape') { e.preventDefault(); cancelRename() }
  }

  const handleToggleActif = async () => {
    setMenuOpen(false)
    await onUpdate(salle.esp32_id!, { actif: !salle.actif })
  }

  const startDelete = () => {
    setEditingName(false)
    setMenuOpen(false)
    setDeleteError('')
    setConfirmingDelete(true)
  }

  const confirmDelete = async () => {
    setActionBusy(true)
    setDeleteError('')
    try {
      await onDelete(salle.esp32_id!)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setDeleteError(typeof detail === 'string' ? detail : 'Suppression impossible.')
      setActionBusy(false)
    }
  }

  const copyIp = async () => {
    if (!salle.ip) return
    try {
      await navigator.clipboard.writeText(salle.ip)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  const state = getConnectionState(salle)
  const tone = CONNECTION_TONE[state]
  const StateIcon: LucideIcon = state === 'online' ? Server : state === 'offline' ? ServerOff : ServerOff
  const activeSensors = salle.sensors.filter(x => x.state === 'active').length
  const totalSensors = salle.sensors.length
  const isLive = state === 'online'
  const canEdit = salle.esp32_id !== null

  return (
    <div
      className={`group/card relative overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.15)] ${
        state === 'inactive' ? 'border-slate-200 opacity-75' : 'border-slate-200'
      }`}
    >
      {/* Decorative gradient strip — only when live */}
      {isLive && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${tone.accent} to-transparent`}
        />
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="relative flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-start gap-3">
          {/* Status icon — square with live pulse */}
          <div className="relative shrink-0">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                state === 'online'
                  ? 'bg-emerald-500 text-white shadow-[0_4px_10px_-2px_rgba(16,185,129,0.45)]'
                  : state === 'offline'
                  ? 'bg-amber-500 text-white shadow-[0_4px_10px_-2px_rgba(245,158,11,0.45)]'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <StateIcon size={18} strokeWidth={2.2} />
            </div>
            {isLive && (
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className={`absolute inset-0 animate-ping rounded-full ${tone.pulse} opacity-75`} />
                <span className={`relative inline-flex h-3 w-3 rounded-full ${tone.dot} ring-2 ring-white`} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Status chip + inactive tag */}
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ${tone.chip} ${tone.chipText}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {tone.label}
              </span>
              {state === 'offline' && salle.actif && (
                <span className="text-[10.5px] text-amber-600/80">— activité &gt; 5 min</span>
              )}
            </div>

            {editingName ? (
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <TextField
                    ref={nameInputRef}
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    disabled={actionBusy}
                    fieldSize="sm"
                    error={renameError || null}
                    inputClassName="text-[15px] font-semibold tracking-[-0.01em]"
                    containerClassName="!mb-0"
                  />
                </div>
                <button
                  onClick={saveRename}
                  disabled={actionBusy}
                  title="Enregistrer"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
                >
                  {actionBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.4} />}
                </button>
                <button
                  onClick={cancelRename}
                  disabled={actionBusy}
                  title="Annuler"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 disabled:opacity-50"
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                {salle.salle}
              </h3>
            )}

            {salle.ip && !editingName && (
              <button
                onClick={copyIp}
                title="Copier l'adresse IP"
                className="mt-1 group/ip inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-[11.5px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <CircleDot size={9} strokeWidth={3} className="text-slate-300 group-hover/ip:text-blue-400" />
                {salle.ip}
                <span
                  className={`transition-all duration-200 ${
                    copied ? 'text-emerald-500' : 'text-slate-300 group-hover/ip:text-slate-500'
                  }`}
                >
                  {copied ? <Check size={11} strokeWidth={2.6} /> : <Copy size={11} />}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Overflow menu trigger — visible on hover */}
        {canEdit && !editingName && !confirmingDelete && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(o => !o)}
              title="Actions"
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95 ${
                menuOpen ? 'bg-slate-100 text-slate-700' : 'opacity-0 group-hover/card:opacity-100'
              }`}
            >
              <MoreHorizontal size={15} strokeWidth={2.4} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-44 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-1 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.2),0_4px_8px_-2px_rgba(15,23,42,0.06)] backdrop-blur-xl animate-field-in">
                <button
                  onClick={startRename}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Pencil size={12} strokeWidth={2.4} className="text-slate-500" />
                  Renommer
                </button>
                <button
                  onClick={handleToggleActif}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  {salle.actif ? (
                    <>
                      <PowerOff size={12} strokeWidth={2.4} className="text-slate-500" />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <Power size={12} strokeWidth={2.4} className="text-emerald-600" />
                      Activer
                    </>
                  )}
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={startDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={12} strokeWidth={2.4} />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Inline delete confirmation ──────────────────────── */}
      {confirmingDelete && (
        <div className="relative mx-4 mt-3 overflow-hidden rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50/50 p-3 animate-field-in">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600">
              <AlertCircle size={13} strokeWidth={2.4} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-red-800">
              Supprimer <strong>« {salle.salle} »</strong>
              {salle.ip && <> ({salle.ip})</>} ? Les mesures historiques resteront
              accessibles et pourront être réclamées à nouveau.
            </p>
          </div>
          {deleteError && <p className="mt-2 text-[12px] font-medium text-red-700">{deleteError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={actionBusy}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[12.5px] font-medium text-white shadow-sm transition-all duration-200 hover:bg-red-700 active:scale-95 disabled:opacity-60"
            >
              {actionBusy && <Loader2 size={12} className="animate-spin" />}
              Supprimer définitivement
            </button>
          </div>
        </div>
      )}

      {/* ── Sensor tiles ────────────────────────────────────── */}
      <div className="relative grid grid-cols-2 gap-2 px-4 py-4">
        {MONITORING_TYPES.map((mt, idx) => {
          const s = sensorByType[mt.type]
          const sensorState = s?.state || 'not_installed'
          const isActive = sensorState === 'active'
          const isOffline = sensorState === 'offline'
          const Icon = mt.icon

          return (
            <div
              key={mt.type}
              className={`relative overflow-hidden rounded-xl border p-2.5 transition-all duration-200 ${
                isActive
                  ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]'
                  : isOffline
                  ? 'border-amber-200/70 bg-amber-50/30'
                  : 'border-slate-200 border-dashed bg-slate-50/40'
              }`}
              style={{
                animation: 'tileIn 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
                animationDelay: `${idx * 50}ms`,
              }}
            >
              {/* Top row: icon + label + status dot */}
              <div className="mb-1.5 flex items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : isOffline
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon size={11} strokeWidth={2.4} />
                  </span>
                  <p className="truncate text-[11px] font-medium text-slate-500">{mt.title}</p>
                </div>
                {isActive && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </span>
                )}
              </div>

              {/* Value or "not installed" */}
              {sensorState === 'not_installed' ? (
                <p className="text-[12.5px] font-medium text-slate-400">Non installé</p>
              ) : (
                <>
                  <p
                    className={`text-[15px] font-semibold leading-none tracking-tight ${
                      isActive ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {s?.last_value !== null && s?.last_value !== undefined
                      ? Number(s.last_value).toFixed(s.last_value % 1 === 0 ? 0 : 1)
                      : '—'}
                    <span className="ml-0.5 text-[10.5px] font-medium text-slate-400">
                      {s?.last_unite || mt.unit}
                    </span>
                  </p>
                  <p
                    className={`mt-1 flex items-center gap-1 truncate text-[10px] font-medium ${
                      isActive ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    <Activity size={9} strokeWidth={2.4} />
                    {s?.last_seen_label || (isOffline ? 'Hors ligne' : '—')}
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="relative flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full ${
              activeSensors === totalSensors && totalSensors > 0
                ? 'bg-emerald-100 text-emerald-600'
                : activeSensors > 0
                ? 'bg-amber-100 text-amber-600'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Activity size={9} strokeWidth={2.6} />
          </span>
          <span className="font-medium tabular-nums">
            {activeSensors}
            <span className="text-slate-300">/{totalSensors}</span>
          </span>
          <span className="text-slate-400">capteurs actifs</span>
        </div>

        <span className="text-[10.5px] text-slate-400">
          {salle.derniere_mesure_le
            ? `MAJ ${new Date(salle.derniere_mesure_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : '— aucune mesure —'}
        </span>
      </footer>

      <style>{`
        @keyframes tileIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
