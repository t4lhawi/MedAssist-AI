import React, { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Check,
  Copy,
  Cpu,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Server,
  ServerOff,
  StickyNote,
  Trash2,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { SalleStatus } from '../../types'
import { usePermissions } from '../../hooks/usePermissions'
import { MONITORING_TYPES } from '../../monitoring'
import { TextField } from '../ui/Field'
import Modal, { ModalBody, ModalButton, ModalFooter, ModalHeader } from '../ui/Modal'

interface Props {
  salle: SalleStatus
  onUpdate: (
    id: number,
    data: { actif?: boolean; salle?: string; note?: string | null; clear_note?: boolean },
  ) => Promise<void>
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
    label: string
  }
> = {
  online: {
    dot: 'bg-emerald-500',
    pulse: 'bg-emerald-400',
    chip: 'bg-elevated text-text-secondary',
    chipText: 'text-text-secondary',
    label: 'En ligne',
  },
  offline: {
    dot: 'bg-amber-500',
    pulse: 'bg-amber-400',
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    chipText: 'text-amber-700 dark:text-amber-300',
    label: 'Hors ligne',
  },
  inactive: {
    dot: 'bg-slate-400 dark:bg-slate-500',
    pulse: 'bg-slate-400 dark:bg-slate-500',
    chip: 'bg-input text-text-secondary',
    chipText: 'text-text-secondary',
    label: 'Inactive',
  },
}

function getConnectionState(salle: SalleStatus): ConnectionState {
  if (!salle.actif) return 'inactive'
  return salle.online ? 'online' : 'offline'
}

/* ─────────────────────────────────────────────────────────────
 *  Sensor tile — soft mini widget used in the room card grid
 * ───────────────────────────────────────────────────────────── */

function SensorTile({
  type,
  title,
  unit,
  icon: Icon,
  state,
  last_value,
  last_unite,
  last_seen_label,
}: {
  type: string
  title: string
  unit: string
  icon: LucideIcon
  state: 'active' | 'offline' | 'not_installed'
  last_value: number | null
  last_unite: string | null
  last_seen_label: string | null
}) {
  const isActive = state === 'active'
  const isOffline = state === 'offline'

  return (
    <div
      data-sensor={type}
      className={`group/sensor relative overflow-hidden rounded-xl border p-2.5 transition-all duration-200 ${
        isActive
          ? 'border-emerald-200 dark:border-emerald-500/30 bg-card hover:border-border-strong hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.08)]'
          : isOffline
          ? 'border-amber-200 dark:border-amber-500/30 bg-elevated'
          : 'border-dashed border-border bg-hover'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                : isOffline
                ? 'bg-input text-amber-600 dark:text-amber-300'
                : 'bg-input text-text-muted'
            }`}
          >
            <Icon size={11} strokeWidth={2.2} />
          </span>
          <p className="truncate text-[10.5px] font-medium text-text-secondary">{title}</p>
        </div>
        {isActive && (
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-label="Capteur actif">
            <span className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
          </span>
        )}
      </div>

      {state === 'not_installed' ? (
        <p className="text-[12px] font-medium text-text-muted">Non installé</p>
      ) : (
        <>
          <p
            className={`text-[15px] font-semibold leading-none tracking-[-0.01em] ${
              isActive ? 'text-text-primary' : 'text-text-secondary'
            }`}
          >
            {last_value !== null && last_value !== undefined
              ? Number(last_value).toFixed(last_value % 1 === 0 ? 0 : 1)
              : '—'}
            <span className="ml-1 text-[10px] font-medium text-text-muted">
              {last_unite || unit}
            </span>
          </p>
          <p
            className={`mt-1 flex items-center gap-1 truncate text-[10px] font-medium ${
              isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-text-secondary'
            }`}
          >
            <Activity size={8} strokeWidth={2.6} />
            {last_seen_label || (isOffline ? 'Hors ligne' : '—')}
          </p>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  Action menu — premium dropdown
 * ───────────────────────────────────────────────────────────── */

function ActionMenu({
  salle,
  onRename,
  onEditNote,
  onDelete,
  onToggleActif,
  busy,
}: {
  salle: SalleStatus
  onRename: () => void
  onEditNote: () => void
  onDelete: () => void
  onToggleActif: () => void
  busy?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary active:scale-95 ${
          open ? 'bg-hover text-text-primary' : ''
        }`}
      >
        <MoreHorizontal size={16} strokeWidth={2.2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-52 origin-top-right overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.18),0_4px_8px_-2px_rgba(15,23,42,0.04)] backdrop-blur-xl"
          style={{ animation: 'menuIn 180ms cubic-bezier(0.25, 0.1, 0.25, 1) both' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onRename()
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-text-primary transition-colors duration-150 hover:bg-hover"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-hover text-text-secondary">
              <Pencil size={12} strokeWidth={2.2} />
            </span>
            Renommer
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEditNote()
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-text-primary transition-colors duration-150 hover:bg-hover"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <StickyNote size={12} strokeWidth={2.2} />
            </span>
            {salle.note ? 'Modifier la note' : 'Ajouter une note'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onToggleActif()
            }}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-text-primary transition-colors duration-150 hover:bg-hover disabled:opacity-50"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md ${
                salle.actif
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {salle.actif ? (
                <PowerOff size={12} strokeWidth={2.2} />
              ) : (
                <Power size={12} strokeWidth={2.2} />
              )}
            </span>
            {salle.actif ? 'Désactiver' : 'Activer'}
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-red-600 dark:text-red-300 transition-colors duration-150 hover:bg-red-500/15"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15 text-red-600 dark:text-red-300">
              <Trash2 size={12} strokeWidth={2.2} />
            </span>
            Supprimer
          </button>
        </div>
      )}

      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

export default function SalleCard({ salle, onUpdate, onDelete, busy }: Props) {
  const sensorByType = Object.fromEntries(salle.sensors.map(s => [s.type, s]))
  // The card is only rendered on the admin salle page, but a future
  // read-only viewer role would still see the card. Hide the kebab
  // menu + action buttons in that case.
  const { permissions } = usePermissions()
  const canManage = permissions.canManageRooms

  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(salle.salle)
  const [renameError, setRenameError] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)

  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(salle.note ?? '')
  const [noteError, setNoteError] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  const [copied, setCopied] = useState(false)
  const [toastActif, setToastActif] = useState<null | 'on' | 'off'>(null)

  const state = getConnectionState(salle)
  const tone = CONNECTION_TONE[state]
  const StateIcon: LucideIcon = state === 'online' ? Server : ServerOff
  const activeSensors = salle.sensors.filter(x => x.state === 'active').length
  const totalSensors = salle.sensors.length
  const isLive = state === 'online'
  const canEdit = salle.esp32_id !== null

  /* ── Rename handlers ─────────────────────────────────────── */
  const openRename = () => {
    setNameDraft(salle.salle)
    setRenameError('')
    setRenaming(true)
  }
  const cancelRename = () => {
    if (renameBusy) return
    setRenaming(false)
    setRenameError('')
  }
  const saveRename = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const next = nameDraft.trim()
    if (!next || next === salle.salle) {
      setRenaming(false)
      return
    }
    setRenameBusy(true)
    setRenameError('')
    try {
      await onUpdate(salle.esp32_id!, { salle: next })
      setRenaming(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setRenameError(typeof detail === 'string' ? detail : 'Renommage impossible.')
    } finally {
      setRenameBusy(false)
    }
  }

  /* ── Note handlers ──────────────────────────────────────── */
  const openEditNote = () => {
    setNoteDraft(salle.note ?? '')
    setNoteError('')
    setEditingNote(true)
  }
  const cancelEditNote = () => {
    if (noteBusy) return
    setEditingNote(false)
    setNoteError('')
  }
  const saveNote = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const next = noteDraft.trim()
    const current = salle.note ?? ''
    // No-op only when both sides are equal (including both empty).
    if (next === current) {
      setEditingNote(false)
      return
    }
    setNoteBusy(true)
    setNoteError('')
    try {
      if (next === '') {
        // Empty input → explicitly clear the note on the server.
        await onUpdate(salle.esp32_id!, { note: null, clear_note: true })
      } else {
        await onUpdate(salle.esp32_id!, { note: next })
      }
      setEditingNote(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setNoteError(typeof detail === 'string' ? detail : 'Modification de la note impossible.')
    } finally {
      setNoteBusy(false)
    }
  }

  /* ── Delete handlers ─────────────────────────────────────── */
  const openDelete = () => {
    setDeleteError('')
    setDeleting(true)
  }
  const cancelDelete = () => {
    if (deleteBusy) return
    setDeleting(false)
    setDeleteError('')
  }
  const confirmDelete = async () => {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await onDelete(salle.esp32_id!)
      // Modal closes on success because the card unmounts
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setDeleteError(typeof detail === 'string' ? detail : 'Suppression impossible.')
      setDeleteBusy(false)
    }
  }

  /* ── Toggle actif with optimistic feedback ──────────────── */
  const handleToggleActif = async () => {
    if (!canEdit) return
    setToastActif(salle.actif ? 'off' : 'on')
    try {
      await onUpdate(salle.esp32_id!, { actif: !salle.actif })
    } finally {
      setTimeout(() => setToastActif(null), 1500)
    }
  }

  /* ── Copy IP ─────────────────────────────────────────────── */
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

  /* Connection quality derived from activeSensors ratio ───── */
  const quality: 'good' | 'fair' | 'poor' =
    totalSensors === 0
      ? 'fair'
      : activeSensors === totalSensors
      ? 'good'
      : activeSensors > 0
      ? 'fair'
      : 'poor'

  const qualityTone =
    quality === 'good'
      ? 'text-emerald-600 dark:text-emerald-300'
      : quality === 'fair'
      ? 'text-amber-600 dark:text-amber-300'
      : 'text-text-secondary'

  return (
    <>
      <article
        className={`group/card relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_24px_-12px_rgba(17,17,17,0.10)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(17,17,17,0.04),0_18px_40px_-12px_rgba(17,17,17,0.18)] ${
          state === 'inactive' ? 'border-border opacity-80' : 'border-border'
        }`}
      >
        {/* ── Status header ─────────────────────────────────── */}
        <header className="flex items-start justify-between gap-2.5 px-4 pt-4">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {/* Status icon */}
            <div className="relative shrink-0">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  state === 'online'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : state === 'offline'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'bg-input text-text-secondary'
                }`}
              >
                <StateIcon size={17} strokeWidth={2} />
              </div>
              {isLive && (
                <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className={`absolute inset-0 animate-ping rounded-full ${tone.pulse} opacity-75`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone.dot} ring-2 ring-white`} />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              {/* Status chip */}
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                  {tone.label}
                </span>
                {state === 'offline' && salle.actif && (
                  <span className="text-[10px] text-amber-600/80 dark:text-amber-300/80">— activité &gt; 5 min</span>
                )}
                {canEdit && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-input px-1.5 py-0.5 text-[9.5px] font-medium text-text-secondary">
                    <Cpu size={8} strokeWidth={2.4} />
                    ESP32
                  </span>
                )}
              </div>

              <h3 className="truncate text-[14.5px] font-semibold tracking-[-0.01em] text-text-primary">
                {salle.salle}
              </h3>

              {salle.ip && (
                <button
                  type="button"
                  onClick={copyIp}
                  title="Copier l'adresse IP"
                  className="mt-0.5 group/ip inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-[10.5px] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                >
                  <Wifi size={9} strokeWidth={2.6} className="text-text-muted group-hover/ip:text-brand" />
                  {salle.ip}
                  <span
                    className={`transition-all duration-200 ${
                      copied ? 'text-emerald-500' : 'text-text-muted group-hover/ip:text-text-secondary'
                    }`}
                  >
                    {copied ? <Check size={10} strokeWidth={2.6} /> : <Copy size={10} />}
                  </span>
                </button>
              )}

              {salle.note && (
                <div
                  className="mt-1 flex items-start gap-1.5 rounded-md bg-hover px-1.5 py-1 text-[10.5px] leading-snug text-text-secondary"
                  title={salle.note}
                >
                  <StickyNote size={10} strokeWidth={2.2} className="mt-0.5 shrink-0 text-text-muted" />
                  <span className="line-clamp-2">{salle.note}</span>
                </div>
              )}
            </div>
          </div>

          {canEdit && canManage && (
            <ActionMenu
              salle={salle}
              onRename={openRename}
              onEditNote={openEditNote}
              onDelete={openDelete}
              onToggleActif={handleToggleActif}
              busy={busy}
            />
          )}
        </header>

        {/* Inline toggle toast (transient feedback) */}
        {toastActif && (
          <div
            role="status"
            className="mx-4 mt-2.5 flex items-center gap-2 rounded-xl border border-border bg-hover px-3 py-1.5 text-[11px] font-medium text-text-secondary"
            style={{ animation: 'fieldIn 200ms ease-out both' }}
          >
            {toastActif === 'on' ? (
              <>
                <Power size={11} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-300" />
                Salle activée
              </>
            ) : (
              <>
                <PowerOff size={11} strokeWidth={2.4} className="text-amber-600 dark:text-amber-300" />
                Salle désactivée
              </>
            )}
          </div>
        )}

        {/* ── Sensor tiles ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3.5">
          {MONITORING_TYPES.map(mt => {
            const s = sensorByType[mt.type]
            return (
              <SensorTile
                key={mt.type}
                type={mt.type}
                title={mt.title}
                unit={mt.unit}
                icon={mt.icon}
                state={(s?.state as 'active' | 'offline' | 'not_installed') || 'not_installed'}
                last_value={s?.last_value ?? null}
                last_unite={s?.last_unite ?? null}
                last_seen_label={s?.last_seen_label ?? null}
              />
            )
          })}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <footer className="mt-auto flex items-center justify-between gap-2.5 border-t border-border bg-hover px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] text-text-secondary">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                activeSensors === totalSensors && totalSensors > 0
                  ? 'bg-elevated text-text-secondary'
                  : activeSensors > 0
                  ? 'bg-elevated text-text-secondary'
                  : 'bg-input text-text-muted'
              }`}
            >
              <Activity size={9} strokeWidth={2.6} />
            </span>
            <span className="font-medium tabular-nums text-text-secondary">
              {activeSensors}
              <span className="text-text-muted">/{totalSensors}</span>
            </span>
            <span>capteurs actifs</span>
          </div>

          <div className="flex items-center gap-2.5 text-[10.5px]">
            <span className={`font-medium ${qualityTone}`}>
              {quality === 'good' ? 'Excellente' : quality === 'fair' ? 'Moyenne' : 'Faible'}
            </span>
            <span className="text-text-muted">·</span>
            <span className="text-text-secondary">
              {salle.derniere_mesure_le
                ? `MAJ ${new Date(salle.derniere_mesure_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Aucune mesure'}
            </span>
          </div>
        </footer>
      </article>

      {/* ── Rename modal ────────────────────────────────────── */}
      <Modal
        open={renaming}
        onClose={cancelRename}
        size="sm"
        dismissDisabled={renameBusy}
        ariaLabel="Renommer la salle"
      >
        <form onSubmit={saveRename} className="flex flex-col">
          <ModalHeader
            icon={<Pencil size={16} strokeWidth={2.2} />}
            iconTone="blue"
            title="Renommer la salle"
            subtitle="Donnez un nouveau nom à cette salle."
            onClose={cancelRename}
            closeDisabled={renameBusy}
          />
          <ModalBody>
            <TextField
              label="Nouveau nom"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              placeholder="Ex. Salle 101"
              maxLength={100}
              required
              autoFocus
              error={renameError || null}
              containerClassName="!mb-0"
            />
          </ModalBody>
          <ModalFooter>
            <ModalButton variant="secondary" onClick={cancelRename} disabled={renameBusy}>
              Annuler
            </ModalButton>
            <ModalButton variant="primary" type="submit" loading={renameBusy} disabled={!nameDraft.trim()}>
              Enregistrer
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Note edit modal ─────────────────────────────────── */}
      <Modal
        open={editingNote}
        onClose={cancelEditNote}
        size="sm"
        dismissDisabled={noteBusy}
        ariaLabel="Modifier la note"
      >
        <form onSubmit={saveNote} className="flex flex-col">
          <ModalHeader
            icon={<StickyNote size={16} strokeWidth={2.2} />}
            iconTone="amber"
            title={salle.note ? 'Modifier la note' : 'Ajouter une note'}
            subtitle="Une note interne pour identifier rapidement la salle."
            onClose={cancelEditNote}
            closeDisabled={noteBusy}
          />
          <ModalBody>
            <TextField
              label="Note"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="Ex. CHIR-2, étage B, salle d'urgences…"
              maxLength={200}
              autoFocus
              error={noteError || null}
              hint="200 caractères max. Laissez vide pour supprimer la note."
              containerClassName="!mb-0"
            />
          </ModalBody>
          <ModalFooter>
            <ModalButton variant="secondary" onClick={cancelEditNote} disabled={noteBusy}>
              Annuler
            </ModalButton>
            <ModalButton
              variant="primary"
              type="submit"
              loading={noteBusy}
              disabled={noteDraft.trim() === (salle.note ?? '')}
            >
              Enregistrer
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Delete confirmation modal ───────────────────────── */}
      <Modal
        open={deleting}
        onClose={cancelDelete}
        size="sm"
        dismissDisabled={deleteBusy}
        ariaLabel="Supprimer la salle"
      >
        <div className="flex flex-col">
          <ModalHeader
            icon={<Trash2 size={16} strokeWidth={2.2} />}
            iconTone="red"
            title="Supprimer la salle"
            subtitle="Cette action est irréversible."
            onClose={cancelDelete}
            closeDisabled={deleteBusy}
          />
          <ModalBody>
            <div className="rounded-2xl border border-border bg-hover p-4">
              <p className="text-[13px] leading-relaxed text-text-secondary">
                Vous allez supprimer définitivement{' '}
                <strong className="font-semibold text-text-primary">« {salle.salle} »</strong>
                {salle.ip && (
                  <>
                    {' '}
                    (<span className="font-mono text-[12.5px]">{salle.ip}</span>)
                  </>
                )}
                . Les mesures historiques resteront accessibles et pourront être
                réclamées à nouveau.
              </p>
            </div>
            {deleteError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-500/15 px-4 py-2.5 text-[12.5px] font-medium text-red-600 dark:text-red-300"
              >
                {deleteError}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalButton variant="secondary" onClick={cancelDelete} disabled={deleteBusy}>
              Annuler
            </ModalButton>
            <ModalButton variant="danger" onClick={confirmDelete} loading={deleteBusy}>
              {deleteBusy ? 'Suppression…' : 'Supprimer'}
            </ModalButton>
          </ModalFooter>
        </div>
      </Modal>
    </>
  )
}
