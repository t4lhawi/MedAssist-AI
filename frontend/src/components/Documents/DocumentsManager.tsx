import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Document } from '../../types'
import { deleteDocument, renameDocument, uploadDocument } from '../../services/api'
import { usePermissions } from '../../hooks/usePermissions'
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileText,
  Filter,
  Grid3x3,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Modal, {
  ModalBody,
  ModalButton,
  ModalFooter,
  ModalHeader,
} from '../ui/Modal'

interface Props {
  documents: Document[]
  onRefresh: () => void
}

/* ─────────────────────────────────────────────────────────────
 *  DocumentsManager — hero upload + toolbar + premium cards
 *
 *  Kept as the single visual block the page renders below the
 *  statistics. Owns its own search/filter/sort/view state, so the
 *  parent only passes `documents` and `onRefresh`.
 * ───────────────────────────────────────────────────────────── */

type StatusFilter = 'all' | 'indexed' | 'pending'
type SortKey = 'recent' | 'oldest' | 'name' | 'size'
type ViewMode = 'list' | 'grid'

function fmt(bytes: number | null) {
  if (!bytes || bytes <= 0) return '0 o'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`
}

function statusMeta(indexed: boolean) {
  return indexed
    ? {
        label: 'Indexé',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        icon: <CheckCircle2 size={12} strokeWidth={2.4} />,
      }
    : {
        label: 'En attente',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
        icon: <Clock3 size={12} strokeWidth={2.4} />,
      }
}

export default function DocumentsManager({ documents, onRefresh }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Permission gates for upload + delete actions. Hospital staff can
  // read the knowledge base but cannot mutate it.
  const { permissions } = usePermissions()
  const canUpload = permissions.canUploadDocuments
  const canDelete = permissions.canDeleteDocuments
  const canRename = permissions.canRenameDocuments

  // Upload state machine
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  // Toolbar state
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [view, setView] = useState<ViewMode>('list')
  const [refreshing, setRefreshing] = useState(false)

  // Delete modal
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Rename modal
  const [pendingRename, setPendingRename] = useState<Document | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renaming, setRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }

    setUploading(true)
    setError('')
    setUploadSuccess(false)
    setUploadProgress(0)
    setUploadName(file.name)
    try {
      // Lightweight fake progress: the backend doesn't expose a stream,
      // so we animate a smooth ramp that finishes just before the
      // request resolves. This keeps the progress bar feeling alive
      // without lying about actual byte progress.
      const startedAt = performance.now()
      const target = 650 // ms — perceived upload duration
      let raf = 0
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / target)
        const eased = 1 - Math.pow(1 - t, 2.4)
        setUploadProgress(Math.round(eased * 95))
        if (t < 1 && uploading !== false /* keep alive */) {
          raf = requestAnimationFrame(tick)
        }
      }
      raf = requestAnimationFrame(tick)

      await uploadDocument(file)
      cancelAnimationFrame(raf)
      setUploadProgress(100)
      setUploadSuccess(true)
      // Brief success flash before the next refresh
      setTimeout(() => {
        onRefresh()
        // Reset the upload area after the list has updated
        setTimeout(() => {
          setUploading(false)
          setUploadSuccess(false)
          setUploadProgress(0)
          setUploadName('')
        }, 250)
      }, 350)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du téléversement.')
      setUploading(false)
      setUploadProgress(0)
      setUploadName('')
    } finally {
      setDragging(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && !uploading) upload(file)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setTimeout(() => setRefreshing(false), 300)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteDocument(pendingDelete.id)
      setPendingDelete(null)
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  // Open the rename modal with the current name pre-filled, minus the
  // ".pdf" extension so the user edits the readable part. The modal
  // refocuses the input on the next paint so they can start typing
  // immediately.
  const openRename = (doc: Document) => {
    setPendingRename(doc)
    setRenameError('')
    const base = doc.nom.replace(/\.pdf$/i, '')
    setRenameValue(base)
    // Defer focus to the next tick — the modal mounts after this state
    // update so the ref isn't valid yet.
    setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }, 0)
  }

  // Client-side mirror of the backend validator so we can show the
  // error inline instead of waiting for a 422. The backend still
  // re-validates authoritatively.
  //
  // We accept the raw user input (which may or may not end in .pdf)
  // and validate it AS the user typed it — the `.pdf` is appended
  // later, only when actually submitting to the API.
  const validateRename = (raw: string): string | null => {
    const v = raw.trim()
    if (!v) return 'Le nom ne peut pas être vide.'
    if (/[\\/]/.test(v)) return 'Le nom ne peut pas contenir de séparateur de chemin.'
    if (v.length > 251) return 'Le nom est trop long (255 caractères max avec .pdf).'
    return null
  }

  const confirmRename = async () => {
    if (!pendingRename) return
    // Validate the raw input first — the modal's helper text promises
    // that ".pdf" is added automatically, so we must NOT require it
    // here. The append happens after validation succeeds.
    const localError = validateRename(renameValue)
    if (localError) {
      setRenameError(localError)
      return
    }
    // Re-append ".pdf" only if the user didn't already type it.
    const base = renameValue.trim().replace(/\.pdf$/i, '')
    const candidat = `${base}.pdf`
    setRenaming(true)
    setRenameError('')
    try {
      await renameDocument(pendingRename.id, candidat)
      setPendingRename(null)
      setRenameValue('')
      onRefresh()
    } catch (err: any) {
      setRenameError(
        err.response?.data?.detail || 'Erreur lors du renommage.',
      )
    } finally {
      setRenaming(false)
    }
  }

  const closeRename = () => {
    if (renaming) return
    setPendingRename(null)
    setRenameValue('')
    setRenameError('')
  }

  /* ─── Filter + sort ───────────────────────────────────────── */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return documents.filter(d => {
      if (statusFilter === 'indexed' && !d.indexe) return false
      if (statusFilter === 'pending' && d.indexe) return false

      if (!q) return true
      if (d.nom.toLowerCase().includes(q)) return true
      // Search by status label
      if (q === 'indexé' || q === 'indexed') return d.indexe
      if (q === 'en cours' || q === 'pending') return !d.indexe
      // Search by date (e.g. "2025", "janv", "12")
      if (d.uploade_le.toLowerCase().includes(q)) return true
      const dateLabel = format(new Date(d.uploade_le), 'dd MMM yyyy', { locale: fr }).toLowerCase()
      if (dateLabel.includes(q)) return true
      return false
    })
  }, [documents, query, statusFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sortKey) {
      case 'recent':
        return arr.sort(
          (a, b) => new Date(b.uploade_le).getTime() - new Date(a.uploade_le).getTime(),
        )
      case 'oldest':
        return arr.sort(
          (a, b) => new Date(a.uploade_le).getTime() - new Date(b.uploade_le).getTime(),
        )
      case 'name':
        return arr.sort((a, b) => a.nom.localeCompare(b.nom))
      case 'size':
        return arr.sort((a, b) => (b.taille ?? 0) - (a.taille ?? 0))
    }
  }, [filtered, sortKey])

  const counts = {
    all: documents.length,
    indexed: documents.filter(d => d.indexe).length,
    pending: documents.filter(d => !d.indexe).length,
  }

  return (
    <section className="space-y-4">
      {/* ─── Hero Upload (admin only) ───────────────────────── */}
      {canUpload && (
        <UploadHero
          inputRef={inputRef}
          dragging={dragging}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadName={uploadName}
          uploadSuccess={uploadSuccess}
          error={error}
          onDragOver={e => {
            e.preventDefault()
            if (!uploading) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onPick={() => inputRef.current?.click()}
          onChange={handleUpload}
        />
      )}

      {/* ─── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-[0_1px_2px_rgba(17,17,17,0.04),0_4px_14px_-8px_rgba(17,17,17,0.06)]">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search
            size={14}
            strokeWidth={2.2}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted"
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher par nom, statut ou date…"
            aria-label="Rechercher des documents"
            className="w-full rounded-xl bg-input py-2 pl-9 pr-9 text-[13px] text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:bg-card focus:shadow-[inset_0_0_0_1.5px_rgba(46,99,255,0.55),0_0_0_4px_rgba(46,99,255,0.08)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-hover hover:text-text-secondary"
            >
              <X size={12} strokeWidth={2.4} />
            </button>
          )}
        </div>

        {/* Status filter (segmented) */}
        <div
          role="tablist"
          aria-label="Filtrer par statut"
          className="flex items-center gap-0.5 rounded-xl bg-elevated p-1"
        >
          <SegmentButton
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            label="Tous"
            count={counts.all}
          />
          <SegmentButton
            active={statusFilter === 'indexed'}
            onClick={() => setStatusFilter('indexed')}
            label="Indexé"
            count={counts.indexed}
            tone="emerald"
          />
          <SegmentButton
            active={statusFilter === 'pending'}
            onClick={() => setStatusFilter('pending')}
            label="En attente"
            count={counts.pending}
            tone="amber"
          />
        </div>

        {/* Sort */}
        <SortMenu value={sortKey} onChange={setSortKey} />

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-xl bg-elevated p-1" role="group" aria-label="Mode d'affichage">
          <ViewButton
            active={view === 'list'}
            onClick={() => setView('list')}
            label="Liste"
            icon={<LayoutList size={13} strokeWidth={2.2} />}
          />
          <ViewButton
            active={view === 'grid'}
            onClick={() => setView('grid')}
            label="Grille"
            icon={<Grid3x3 size={13} strokeWidth={2.2} />}
          />
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Actualiser"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary active:scale-95 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            strokeWidth={2.2}
            className={refreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}
          />
        </button>

        {/* Upload button (admin only — staff read the docs, admins curate) */}
        {canUpload && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-text-primary px-3.5 py-2 text-[12.5px] font-medium text-card shadow-[0_2px_8px_-2px_var(--shadow-2)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_6px_18px_-4px_var(--shadow-2)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud size={14} strokeWidth={2.2} />
            <span>Téléverser un PDF</span>
          </button>
        )}
      </div>

      {/* ─── Documents List / Grid ───────────────────────────── */}
      {sorted.length === 0 ? (
        <EmptyState
          hasQuery={!!query || statusFilter !== 'all'}
          onReset={() => {
            setQuery('')
            setStatusFilter('all')
          }}
        />
      ) : view === 'list' ? (
        <DocumentsList
          docs={sorted}
          onDelete={canDelete ? (d => setPendingDelete(d)) : undefined}
          onRename={canRename ? openRename : undefined}
        />
      ) : (
        <DocumentsGrid
          docs={sorted}
          onDelete={canDelete ? (d => setPendingDelete(d)) : undefined}
          onRename={canRename ? openRename : undefined}
        />
      )}

      {/* ─── Delete confirmation modal ────────────────────────── */}
      <Modal
        open={pendingDelete !== null}
        onClose={() => (deleting ? null : setPendingDelete(null))}
        size="sm"
        dismissDisabled={deleting}
        ariaLabel="Supprimer le document"
      >
        {pendingDelete && (
          <>
            <ModalHeader
              icon={<Trash2 size={16} strokeWidth={2.2} />}
              iconTone="red"
              title="Supprimer ce document ?"
              subtitle="Cette action est irréversible."
              onClose={() => (deleting ? null : setPendingDelete(null))}
              closeDisabled={deleting}
            />
            <ModalBody>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-hover p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-text-secondary shadow-sm">
                  <FileText size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-text-primary">
                    {pendingDelete.nom}
                  </p>
                  <p className="mt-0.5 text-[12px] text-text-secondary">
                    {fmt(pendingDelete.taille)} ·{' '}
                    {format(new Date(pendingDelete.uploade_le), 'dd MMM yyyy', {
                      locale: fr,
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    statusMeta(pendingDelete.indexe).className
                  }`}
                >
                  {statusMeta(pendingDelete.indexe).label}
                </span>
              </div>

              <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">
                Le document sera retiré de la base de connaissances et ne pourra plus
                être cité par l'assistant IA.
              </p>
            </ModalBody>
            <ModalFooter>
              <ModalButton
                variant="secondary"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Annuler
              </ModalButton>
              <ModalButton
                variant="danger"
                onClick={confirmDelete}
                loading={deleting}
                leadingIcon={<Trash2 size={13} strokeWidth={2.2} />}
              >
                Supprimer
              </ModalButton>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* ─── Rename modal (admin only) ───────────────────────── */}
      <Modal
        open={pendingRename !== null}
        onClose={closeRename}
        size="sm"
        dismissDisabled={renaming}
        ariaLabel="Renommer le document"
      >
        {pendingRename && (
          <>
            <ModalHeader
              icon={<Pencil size={16} strokeWidth={2.2} />}
              iconTone="blue"
              title="Renommer le document"
              subtitle="Le fichier sera déplacé et la base de connaissances sera ré-indexée."
              onClose={closeRename}
              closeDisabled={renaming}
            />
            <ModalBody>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  if (!renaming) confirmRename()
                }}
              >
                <label
                  htmlFor="document-rename-input"
                  className="block text-[12px] font-medium text-text-secondary"
                >
                  Nouveau nom
                </label>
                <input
                  id="document-rename-input"
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={e => {
                    setRenameValue(e.target.value)
                    if (renameError) setRenameError('')
                  }}
                  disabled={renaming}
                  spellCheck={false}
                  autoComplete="off"
                  // Submit on Enter — the form handler above catches it.
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (!renaming) confirmRename()
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-blue-500 focus:bg-card focus:shadow-[inset_0_0_0_1.5px_rgba(46,99,255,0.55),0_0_0_4px_rgba(46,99,255,0.08)] disabled:opacity-60"
                  aria-invalid={!!renameError}
                  aria-describedby={renameError ? 'document-rename-error' : undefined}
                />
                <p className="mt-1.5 text-[11.5px] text-text-muted">
                  Le nom doit se terminer par <code className="rounded bg-elevated px-1 py-0.5 text-[10.5px]">.pdf</code>.
                  L'extension est ajoutée automatiquement si vous l'omettez.
                </p>
                {renameError && (
                  <p
                    id="document-rename-error"
                    role="alert"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-[12px] font-medium text-red-700 dark:text-red-300"
                  >
                    <AlertCircle size={12} strokeWidth={2.4} />
                    {renameError}
                  </p>
                )}
              </form>
            </ModalBody>
            <ModalFooter>
              <ModalButton
                variant="secondary"
                onClick={closeRename}
                disabled={renaming}
              >
                Annuler
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={confirmRename}
                loading={renaming}
                leadingIcon={<Pencil size={13} strokeWidth={2.2} />}
              >
                Renommer
              </ModalButton>
            </ModalFooter>
          </>
        )}
      </Modal>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  UploadHero — drag & drop with rich states
 *  States: idle | dragging | uploading | success | error
 * ───────────────────────────────────────────────────────────── */

interface UploadHeroProps {
  inputRef: React.RefObject<HTMLInputElement>
  dragging: boolean
  uploading: boolean
  uploadProgress: number
  uploadName: string
  uploadSuccess: boolean
  error: string
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
  onPick: () => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function UploadHero({
  inputRef,
  dragging,
  uploading,
  uploadProgress,
  uploadName,
  uploadSuccess,
  error,
  onDragOver,
  onDragLeave,
  onDrop,
  onPick,
  onChange,
}: UploadHeroProps) {
  // Visual state derived from props
  const state: 'idle' | 'dragging' | 'uploading' | 'success' | 'error' = error
    ? 'error'
    : uploadSuccess
    ? 'success'
    : uploading
    ? 'uploading'
    : dragging
    ? 'dragging'
    : 'idle'

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border bg-card transition-all duration-200 ${
        state === 'dragging'
          ? 'border-blue-400 dark:border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_12px_32px_-8px_rgba(59,130,246,0.18)]'
          : 'border-border shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_24px_-12px_rgba(17,17,17,0.10)]'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem]">
        {/* ─── Left: drop zone ─────────────────────────────── */}
        <label
          htmlFor="documents-upload-input"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative flex min-h-[14rem] cursor-pointer flex-col items-center justify-center gap-3 px-6 py-8 text-center transition-colors duration-200 ${
            state === 'dragging'
              ? 'bg-blue-500/15'
              : state === 'success'
              ? 'bg-emerald-500/15'
              : state === 'error'
              ? 'bg-red-500/15'
              : 'bg-card hover:bg-hover'
          } ${uploading ? 'pointer-events-none' : ''}`}
        >
          {/* Illustration */}
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200 ${
              state === 'dragging'
                ? 'bg-blue-600 text-white scale-105'
                : state === 'success'
                ? 'bg-emerald-600 text-white'
                : state === 'error'
                ? 'bg-red-500/15 text-red-600 dark:text-red-300'
                : 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
            }`}
          >
            {state === 'uploading' ? (
              <Loader2 size={26} strokeWidth={2.2} className="animate-spin" />
            ) : state === 'success' ? (
              <CheckCircle2 size={28} strokeWidth={2.2} />
            ) : state === 'error' ? (
              <AlertCircle size={26} strokeWidth={2.2} />
            ) : (
              <UploadCloud size={28} strokeWidth={1.9} />
            )}
          </div>

          <div className="space-y-1">
            <p
              className={`text-[15px] font-semibold tracking-[-0.01em] ${
                state === 'error' ? 'text-red-700 dark:text-red-300' : 'text-text-primary'
              }`}
            >
              {state === 'uploading'
                ? 'Téléversement en cours…'
                : state === 'success'
                ? 'Document ajouté avec succès'
                : state === 'error'
                ? 'Téléversement échoué'
                : state === 'dragging'
                ? 'Relâchez pour téléverser'
                : 'Déposez vos PDF ici'}
            </p>
            <p className="text-[12.5px] text-text-secondary">
              {state === 'uploading' && uploadName
                ? uploadName
                : state === 'success'
                ? 'L’indexation automatique démarre dans quelques instants.'
                : state === 'error'
                ? error
                : 'ou cliquez pour choisir un fichier — glisser-déposer accepté'}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                onPick()
              }}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full bg-text-primary px-4 py-2 text-[12.5px] font-medium text-card shadow-[0_2px_8px_-2px_var(--shadow-2)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_6px_18px_-4px_var(--shadow-2)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud size={14} strokeWidth={2.2} />
              Choisir un PDF
            </button>
            <span className="text-[11.5px] text-text-muted">PDF uniquement</span>
          </div>

          <input
            id="documents-upload-input"
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={onChange}
            disabled={uploading}
            aria-label="Téléverser un PDF"
          />
        </label>

        {/* ─── Right: progress + meta ──────────────────────── */}
        <div className="flex flex-col gap-4 border-t border-border bg-hover/60 p-5 lg:border-l lg:border-t-0">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-[11.5px] font-medium text-text-secondary">
              <span className="uppercase tracking-wide">
                {state === 'success' ? 'Complété' : 'Progression'}
              </span>
              <span
                className={`tabular-nums ${
                  state === 'success'
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : state === 'error'
                    ? 'text-red-600 dark:text-red-300'
                    : 'text-text-primary'
                }`}
              >
                {state === 'success' ? '100%' : `${uploadProgress}%`}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-elevated">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  state === 'success'
                    ? 'bg-emerald-500'
                    : state === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{
                  width: `${state === 'success' ? 100 : uploadProgress}%`,
                }}
              />
            </div>
            {state === 'uploading' && uploadName && (
              <p className="mt-2 truncate text-[11.5px] text-text-secondary">
                <span className="font-medium text-text-secondary">Envoi :</span> {uploadName}
              </p>
            )}
            {state === 'success' && uploadName && (
              <p className="mt-2 truncate text-[11.5px] text-emerald-700 dark:text-emerald-300">
                <span className="font-medium">Ajouté :</span> {uploadName}
              </p>
            )}
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-2 text-[11.5px]">
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
                Format
              </p>
              <p className="mt-0.5 font-medium text-text-primary">PDF</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
                Taille max
              </p>
              <p className="mt-0.5 font-medium text-text-primary">20 Mo</p>
            </div>
            <div className="col-span-2 rounded-xl border border-border bg-card px-3 py-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
                Indexation
              </p>
              <p className="mt-0.5 font-medium text-text-primary">
                Automatique après téléversement
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

/* ─── Toolbar sub-components ───────────────────────────────────── */

function SegmentButton({
  active,
  onClick,
  label,
  count,
  tone = 'blue',
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
  tone?: 'blue' | 'emerald' | 'amber'
}) {
  const activeBg: Record<typeof tone, string> = {
    blue: 'bg-card text-text-primary shadow-sm',
    emerald: 'bg-card text-emerald-700 dark:text-emerald-300 shadow-sm',
    amber: 'bg-card text-amber-700 dark:text-amber-300 shadow-sm',
  }
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
        active
          ? activeBg[tone]
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
            active
              ? tone === 'emerald'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : tone === 'amber'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'bg-elevated text-text-secondary'
              : 'bg-elevated text-text-secondary'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function ViewButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ${
        active
          ? 'bg-card text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {icon}
    </button>
  )
}

function SortMenu({
  value,
  onChange,
}: {
  value: SortKey
  onChange: (v: SortKey) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const labels: Record<SortKey, string> = {
    recent: 'Plus récents',
    oldest: 'Plus anciens',
    name: 'Nom (A → Z)',
    size: 'Taille',
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-transparent bg-elevated px-3 text-[12.5px] font-medium text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary"
      >
        <ArrowUpDown size={13} strokeWidth={2.2} />
        <span className="hidden sm:inline">{labels[value]}</span>
        <span className="sm:hidden">Tri</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1.5 w-44 origin-top-right overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]"
          style={{ animation: 'dropIn 160ms var(--ease-out) both' }}
        >
          {(Object.keys(labels) as SortKey[]).map(k => (
            <button
              key={k}
              role="menuitem"
              onClick={() => {
                onChange(k)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors duration-150 ${
                value === k
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-text-secondary hover:bg-hover'
              }`}
            >
              <span>{labels[k]}</span>
              {value === k && <CheckCircle2 size={12} className="text-blue-600 dark:text-blue-400" strokeWidth={2.4} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Document list (list view) ────────────────────────────────── */

function DocumentsList({
  docs,
  onDelete,
  onRename,
}: {
  docs: Document[]
  onDelete?: (d: Document) => void
  onRename?: (d: Document) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(17,17,17,0.04),0_4px_14px_-8px_rgba(17,17,17,0.06)]">
      <ul className="divide-y divide-border">
        {docs.map(d => (
          <DocumentListRow key={d.id} doc={d} onDelete={onDelete} onRename={onRename} />
        ))}
      </ul>
    </div>
  )
}

function DocumentListRow({
  doc,
  onDelete,
  onRename,
}: {
  doc: Document
  onDelete?: (d: Document) => void
  onRename?: (d: Document) => void
}) {
  const meta = statusMeta(doc.indexe)
  return (
    <li className="group relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-hover">
      {/* File icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-elevated dark:to-input text-slate-500 dark:text-text-secondary ring-1 ring-slate-200/70 dark:ring-border">
        <FileText size={18} strokeWidth={2} />
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-text-primary">{doc.nom}</p>
        <p className="mt-0.5 truncate text-[12px] text-text-secondary">
          {fmt(doc.taille)} ·{' '}
          {format(new Date(doc.uploade_le), 'dd MMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Status badge */}
      <span
        className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${meta.className}`}
      >
        {doc.indexe ? null : (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
        )}
        {meta.icon}
        {meta.label}
      </span>

      {/* Actions */}
      {(onDelete || onRename) && (
        <div className="flex shrink-0 items-center gap-1">
          <DocumentActionsMenu doc={doc} onDelete={onDelete} onRename={onRename} />
          {onDelete && (
            <ActionIconButton
              title="Supprimer"
              aria-label="Supprimer"
              tone="red"
              onClick={() => onDelete(doc)}
            >
              <Trash2 size={14} strokeWidth={2.2} />
            </ActionIconButton>
          )}
        </div>
      )}
    </li>
  )
}

function ActionIconButton({
  children,
  title,
  tone = 'slate',
  onClick,
  ...rest
}: {
  children: React.ReactNode
  title: string
  tone?: 'slate' | 'red'
  onClick?: () => void
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const palette = {
    slate:
      'text-text-secondary hover:bg-hover hover:text-text-primary',
    red: 'text-text-secondary hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-300',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      {...rest}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${palette}`}
    >
      {children}
    </button>
  )
}

/* ─── Document grid (grid view) ────────────────────────────────── */

function DocumentsGrid({
  docs,
  onDelete,
  onRename,
}: {
  docs: Document[]
  onDelete?: (d: Document) => void
  onRename?: (d: Document) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map(d => (
        <DocumentCard key={d.id} doc={d} onDelete={onDelete} onRename={onRename} />
      ))}
    </div>
  )
}

function DocumentCard({
  doc,
  onDelete,
  onRename,
}: {
  doc: Document
  onDelete?: (d: Document) => void
  onRename?: (d: Document) => void
}) {
  const meta = statusMeta(doc.indexe)
  return (
    <article className="group card-lift relative rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-elevated dark:to-input text-slate-500 dark:text-text-secondary ring-1 ring-slate-200/70 dark:ring-border">
          <FileText size={22} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-all text-[13.5px] font-semibold leading-snug text-text-primary">
            {doc.nom}
          </p>
          <p className="mt-1 text-[12px] text-text-secondary">{fmt(doc.taille)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-text-secondary">
        <span>{format(new Date(doc.uploade_le), 'dd MMM yyyy', { locale: fr })}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${meta.className}`}
        >
          {doc.indexe ? null : (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
          )}
          {meta.icon}
          {meta.label}
        </span>
      </div>

      {(onDelete || onRename) && (
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-3">
          <DocumentActionsMenu doc={doc} onDelete={onDelete} onRename={onRename} />
          {onDelete && (
            <ActionIconButton
              title="Supprimer"
              aria-label="Supprimer"
              tone="red"
              onClick={() => onDelete(doc)}
            >
              <Trash2 size={14} strokeWidth={2.2} />
            </ActionIconButton>
          )}
        </div>
      )}
    </article>
  )
}

/* ─── Per-row overflow menu (the "3 dots" button) ──────────────── */

function DocumentActionsMenu({
  doc,
  onDelete,
  onRename,
}: {
  doc: Document
  onDelete?: (d: Document) => void
  onRename?: (d: Document) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Build a download URL for the PDF. Falls back to opening the doc
  // route on the same origin if a dedicated file endpoint is missing.
  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
  const fileUrl = `${apiBase}/api/documents/${doc.id}/file`

  const handleDownload = async () => {
    setOpen(false)
    // The endpoint is auth-protected, so we can't just navigate to it
    // (`window.location.href` would send no Authorization header and
    // the backend would 401). Fetch the file with axios (which adds
    // the Bearer token), then hand the Blob to a hidden <a download>
    // so the browser saves it with the original filename.
    try {
      const api = (await import('../../services/api')).default
      const res = await api.get(`/api/documents/${doc.id}/file`, {
        responseType: 'blob',
      })
      const blobUrl = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = doc.nom
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoke after the click is processed so the browser still has
      // the URL when the save dialog opens.
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 0)
    } catch (err) {
      console.error('Download failed', err)
    }
  }

  const handleCopyName = async () => {
    setOpen(false)
    try {
      await navigator.clipboard.writeText(doc.nom)
    } catch {
      // Clipboard may be blocked (insecure context, missing permission);
      // fall back to a hidden textarea + execCommand which still works
      // in older browsers.
      const ta = document.createElement('textarea')
      ta.value = doc.nom
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* swallow — better to do nothing than throw in a UI handler */
      }
      document.body.removeChild(ta)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <ActionIconButton
        title="Plus d'actions"
        aria-label="Plus d'actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(v => !v)}
      >
        <MoreHorizontal size={14} strokeWidth={2.2} />
      </ActionIconButton>
      {open && (
        <div
          id={menuId}
          role="menu"
          // The panel is right-aligned to the trigger so it doesn't
          // overflow the row on small screens.
          className="absolute right-0 top-full z-30 mt-1.5 w-44 origin-top-right overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]"
          style={{ animation: 'dropIn 160ms var(--ease-out) both' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleDownload}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-text-secondary transition-colors duration-150 hover:bg-hover"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-elevated text-text-secondary">
              <Download size={12} strokeWidth={2.2} />
            </span>
            <span>Télécharger</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyName}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-text-secondary transition-colors duration-150 hover:bg-hover"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-elevated text-text-secondary">
              <Copy size={12} strokeWidth={2.2} />
            </span>
            <span>Copier le nom</span>
          </button>
          {onRename && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onRename(doc)
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-text-secondary transition-colors duration-150 hover:bg-hover"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-elevated text-text-secondary">
                <Pencil size={12} strokeWidth={2.2} />
              </span>
              <span>Renommer</span>
            </button>
          )}
          {onDelete && (
            <>
              <div className="my-1 h-px bg-elevated" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onDelete(doc)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-red-600 dark:text-red-300 transition-colors duration-150 hover:bg-red-500/15"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500/15 text-red-600 dark:text-red-300">
                  <Trash2 size={12} strokeWidth={2.2} />
                </span>
                <span>Supprimer</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Empty / no-results state ─────────────────────────────────── */

function EmptyState({
  hasQuery,
  onReset,
}: {
  hasQuery: boolean
  onReset: () => void
}) {
  if (hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-4 py-14 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-input text-text-muted ring-1 ring-border">
          <Filter size={22} strokeWidth={1.7} />
        </div>
        <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-text-primary">
          Aucun document correspondant
        </p>
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-text-secondary">
          Essayez d'ajuster votre recherche ou le filtre de statut pour voir plus de résultats.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-text-secondary transition-all duration-200 hover:bg-hover active:scale-[0.97]"
        >
          <RefreshCw size={12} strokeWidth={2.2} />
          Réinitialiser les filtres
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
      {/* Illustration */}
      <div className="relative mb-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-elevated dark:to-input text-slate-400 dark:text-text-muted ring-1 ring-slate-200/70 dark:ring-border">
          <FileText size={36} strokeWidth={1.4} />
        </div>
        <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(59,130,246,0.5)]">
          <UploadCloud size={13} strokeWidth={2.2} />
        </span>
      </div>

      <p className="text-[16px] font-semibold tracking-[-0.01em] text-text-primary">
        Aucun document pour l'instant.
      </p>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-secondary">
        Téléversez des protocoles et manuels PDF pour améliorer l'assistant IA.
      </p>

      <p className="mt-5 text-[12.5px] font-medium text-text-primary">
        Téléversez votre premier document
      </p>
    </div>
  )
}
