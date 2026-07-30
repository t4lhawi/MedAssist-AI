import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Markdown from '../ui/Markdown'
import { deleteChatHistoryItem, getChatHistory, sendChat } from '../../services/api'
import { ChatMessage } from '../../types'
import {
  AlertTriangle,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  Clipboard,
  Clock3,
  Copy,
  Droplets,
  Ellipsis,
  FileText,
  Filter,
  History,
  Inbox,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  Share2,
  ShieldCheck,
  Square,
  SquarePen,
  Star,
  Stethoscope,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react'
import { SearchField } from '../ui/Field'
import Modal, { ModalBody, ModalButton, ModalFooter, ModalHeader } from '../ui/Modal'

const SUGGESTIONS = [
  "Quelle est la température recommandée pour une salle de soins ?",
  "Quelles sont les procédures de désinfection des équipements ?",
  "Comment interpréter une humidité de 75% ?",
  "Quels sont les protocoles en cas d'alerte critique ?",
]

const SUGGESTION_META: { title: string; icon: React.ReactNode }[] = [
  { title: 'Température de la salle', icon: <Thermometer size={17} strokeWidth={2.1} /> },
  { title: 'Désinfection', icon: <Droplets size={17} strokeWidth={2.1} /> },
  { title: 'Humidité', icon: <Droplets size={17} strokeWidth={2.1} /> },
  { title: 'Alertes critiques', icon: <AlertTriangle size={17} strokeWidth={2.1} /> },
]

const WELCOME_MESSAGE =
  "Je peux répondre à vos questions à partir des documents officiels indexés dans MedAssist AI."

// Le mapping des éléments markdown est centralisé dans components/ui/Markdown.

type ConversationHistoryItem = {
  id?: string
  question: string
  reponse: string
  sources?: NonNullable<ChatMessage['sources']>
  date: string
}

/* ─────────────────────────────────────────────────────────────
 *  SourceCard — premium document card
 * ───────────────────────────────────────────────────────────── */
function SourceCard({
  source,
}: {
  source: NonNullable<ChatMessage['sources']>[number]
}) {
  const confidence = typeof source.score === 'number' && Number.isFinite(source.score)
    ? Math.max(0, Math.min(100, Math.round(source.score * 100)))
    : null

  return (
    <button
      type="button"
      tabIndex={0}
      className="group/srcc flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_4px_14px_-6px_rgba(37,99,235,0.18)] focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand transition-colors group-hover/srcc:bg-brand/25">
        <FileText size={14} strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-text-primary">{source.document}</span>
        <span className="mt-0.5 block text-[11px] text-text-muted">p. {source.page}</span>
      </span>
      {confidence !== null && (
        <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-ok">
          {confidence}%
        </span>
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  ThinkingIndicator — premium shimmer pill
 * ───────────────────────────────────────────────────────────── */
function ThinkingIndicator() {
  const [phase, setPhase] = useState<'searching' | 'generating'>('searching')

  useEffect(() => {
    const t = window.setTimeout(() => setPhase('generating'), 900)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-soft">
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full text-white avatar-pulse"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
      >
        <Stethoscope size={10} strokeWidth={2.4} />
      </span>
      <span className="shimmer-bar h-1.5 w-16 rounded-full" />
      <span className="text-[12px] font-medium text-text-secondary">
        {phase === 'searching' ? 'Recherche dans les documents indexés…' : 'Génération de la réponse…'}
      </span>
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  AssistantAvatar
 * ───────────────────────────────────────────────────────────── */
function AssistantAvatar({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${pulsing ? 'avatar-pulse' : ''}`}
      style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
    >
      <Stethoscope size={18} strokeWidth={2.2} />
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  UserAvatar
 * ───────────────────────────────────────────────────────────── */
function UserAvatar() {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-elevated text-text-secondary"
    >
      <UserIcon size={14} strokeWidth={2.2} />
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  MessageRow
 * ───────────────────────────────────────────────────────────── */
function MessageRow({
  message,
  copied,
  onCopy,
  feedback,
  onFeedback,
}: {
  message: ChatMessage
  copied: boolean
  onCopy: () => void
  feedback: 'up' | 'down' | undefined
  onFeedback: (value: 'up' | 'down') => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <article className="flex items-end justify-end gap-2">
        <div className="max-w-[80%] rounded-3xl rounded-tr-md bg-elevated px-4 py-2.5 text-[14.5px] leading-7 text-text-primary sm:max-w-[70%]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <UserAvatar />
      </article>
    )
  }

  return (
    <article className="group flex gap-4">
      <AssistantAvatar />
      <div className="flex min-w-0 max-w-[92%] flex-1 flex-col gap-3 sm:max-w-[88%]">
        <div className="text-[15px] leading-7 text-text-primary">
          <Markdown source={message.content} />
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {message.sources.map((source, i) => (
              <SourceCard
                key={`${source.document}-${source.page}-${i}`}
                source={source}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onCopy}
            title={copied ? 'Copié' : 'Copier'}
            aria-label={copied ? 'Copié' : 'Copier le message'}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted opacity-0 transition hover:bg-hover hover:text-text-secondary focus-visible:opacity-100 group-hover:opacity-100"
          >
            {copied ? <Check size={14} strokeWidth={2.2} /> : <Clipboard size={14} strokeWidth={2.2} />}
          </button>
          <button
            type="button"
            disabled
            title="Régénérer (bientôt disponible)"
            aria-label="Régénérer la réponse"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted opacity-0 transition hover:bg-hover hover:text-text-secondary focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
          >
            <RotateCcw size={13} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            disabled
            title="Partager (bientôt disponible)"
            aria-label="Partager le message"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted opacity-0 transition hover:bg-hover hover:text-text-secondary focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
          >
            <Share2 size={13} strokeWidth={2.2} />
          </button>
          <span className="mx-1.5 hidden h-3.5 w-px bg-border sm:inline-block" />
          <button
            type="button"
            onClick={() => onFeedback('up')}
            aria-label="Utile"
            aria-pressed={feedback === 'up'}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition opacity-0 focus-visible:opacity-100 group-hover:opacity-100 ${
              feedback === 'up'
                ? 'bg-ok/15 text-ok opacity-100'
                : 'text-text-muted hover:bg-hover hover:text-text-secondary'
            }`}
          >
            <ThumbsUp size={13} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => onFeedback('down')}
            aria-label="Pas utile"
            aria-pressed={feedback === 'down'}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition opacity-0 focus-visible:opacity-100 group-hover:opacity-100 ${
              feedback === 'down'
                ? 'bg-bad/15 text-bad opacity-100'
                : 'text-text-muted hover:bg-hover hover:text-text-secondary'
            }`}
          >
            <ThumbsDown size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </article>
  )
}

function historyItemKey(item: ConversationHistoryItem, index: number) {
  return item.id ?? `${item.date}-${index}`
}

/* ─────────────────────────────────────────────────────────────
 *  HistoryCardSkeleton — shimmer placeholder used while the
 *  panel is loading. Sized to match a real conversation card
 *  so the list doesn't reflow when the data arrives.
 * ───────────────────────────────────────────────────────────── */
function HistoryCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full rounded-[20px] border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className="history-shimmer h-9 w-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="history-shimmer h-3 w-3/5 rounded" />
          <div className="history-shimmer h-2.5 w-2/5 rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="history-shimmer h-2.5 w-full rounded" />
        <div className="history-shimmer h-2.5 w-4/5 rounded" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  formatHistoryDate — relative "Today · 14:32" label used
 *  on every card. Pure function so the formatter is reused by
 *  the card AND the delete modal without duplicating logic.
 * ───────────────────────────────────────────────────────────── */
function formatHistoryDate(date: string) {
  const d = new Date(date)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const sameYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `Aujourd'hui · ${time}`
  if (sameYesterday) return `Hier · ${time}`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ` · ${time}`
}

/* ─────────────────────────────────────────────────────────────
 *  HistoryCard — premium conversation card
 *  - Soft border, 20px radius, white surface
 *  - Hover lift + blue accent rail
 *  - Selected state uses MedAssist blue
 *  - Hover actions fade in (Open / Copy / Favorite / Delete / More)
 * ───────────────────────────────────────────────────────────── */
type HistoryCardProps = {
  item: ConversationHistoryItem
  index: number
  isSelected: boolean
  isFavorite: boolean
  copied: boolean
  onSelect: () => void
  onRequestDelete: () => void
  onCopyQuestion: () => void
  onToggleFavorite: () => void
}

function HistoryCard({
  item,
  index,
  isSelected,
  isFavorite,
  copied,
  onSelect,
  onRequestDelete,
  onCopyQuestion,
  onToggleFavorite,
}: HistoryCardProps) {
  const sourceCount = item.sources?.length ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-label={`Ouvrir la conversation : ${item.question}`}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-[20px] border bg-card text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-12px_var(--shadow-3)] focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.18)] ${
        isSelected
          ? 'border-brand/50 shadow-[0_8px_24px_-10px_rgba(37,99,235,0.25)] ring-1 ring-brand/40'
          : 'border-border hover:border-border-strong'
      }`}
      style={{
        animation: 'historyItemIn 200ms cubic-bezier(0.25, 0.1, 0.25, 1) both',
        animationDelay: `${Math.min(index, 12) * 25}ms`,
      }}
    >
      {/* Left rail — selected / hover accent. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-3 left-0 w-[3px] origin-top rounded-full transition-transform duration-200 ease-out ${
          isSelected
            ? 'scale-y-100 bg-gradient-to-b from-blue-500 to-indigo-500'
            : 'scale-y-0 bg-gradient-to-b from-blue-500 to-indigo-500 group-hover:scale-y-100'
        }`}
      />

      <div className="flex gap-3 p-4 pl-4">
        {/* Conversation icon — premium gradient mark. */}
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_12px_-4px_rgba(46,99,255,0.45)]"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        >
          <MessageSquare size={15} strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.005em] text-text-primary">
              {item.question}
            </p>
            {isFavorite && (
              <span
                aria-label="Mise en favori"
                title="Mise en favori"
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn"
              >
                <Star size={10} strokeWidth={2.2} fill="currentColor" />
              </span>
            )}
          </div>

          {/* Meta row — date + doc count */}
          <div className="mt-1 flex items-center gap-2 text-[12px] text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={11} strokeWidth={2.2} className="shrink-0" />
              {formatHistoryDate(item.date)}
            </span>
            {sourceCount > 0 && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-text-muted" />
                <span className="inline-flex items-center gap-1 rounded-full bg-hover px-1.5 py-0.5 text-[10.5px] font-medium text-text-secondary">
                  <FileText size={10} strokeWidth={2.2} className="shrink-0" />
                  {sourceCount} doc{sourceCount > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>

          {/* Answer preview */}
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-text-secondary">
            {item.reponse}
          </p>

          {/* Hover actions — fade in on hover/focus. */}
          <div
            className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-200 ease-out focus-within:opacity-100 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Ouvrir"
              aria-label="Ouvrir la conversation"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary"
            >
              <ArrowUp size={12} strokeWidth={2.2} className="rotate-45" />
            </button>
            <button
              type="button"
              title={copied ? 'Copié' : 'Copier la question'}
              aria-label={copied ? 'Copié' : 'Copier la question'}
              onClick={(e) => {
                e.stopPropagation()
                onCopyQuestion()
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary"
            >
              {copied ? <Check size={12} strokeWidth={2.4} /> : <Copy size={12} strokeWidth={2.2} />}
            </button>
            <button
              type="button"
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-pressed={isFavorite}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
                isFavorite
                  ? 'bg-warn/15 text-warn'
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
            >
              <Star
                size={12}
                strokeWidth={2.2}
                fill={isFavorite ? 'currentColor' : 'none'}
              />
            </button>
            <button
              type="button"
              title="Plus d'actions"
              aria-label="Plus d'actions"
              onClick={(e) => e.stopPropagation()}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary"
            >
              <MoreHorizontal size={13} strokeWidth={2.2} />
            </button>
            <span className="mx-1 hidden h-3.5 w-px bg-border sm:inline-block" />
            <button
              type="button"
              title="Supprimer la conversation"
              aria-label="Supprimer la conversation"
              onClick={(e) => {
                e.stopPropagation()
                onRequestDelete()
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-all duration-200 hover:bg-bad/10 hover:text-bad"
            >
              <Trash2 size={12} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 *  HistoryPanel — premium AI conversation manager
 *
 *  Layout (desktop): floating side panel, 440px wide, rounded
 *  left corners, soft shadow, backdrop-blurred overlay.
 *  Layout (mobile):  full-screen bottom sheet.
 *
 *  All existing business logic is preserved:
 *   - load (historyLoading, historyError) is passed in as props
 *   - search filters on the same question/reponse fields
 *   - delete still routes through the parent's confirmDelete
 *   - open (onSelect) and new conversation (onNewConversation)
 *     callbacks are unchanged
 * ───────────────────────────────────────────────────────────── */
type HistoryFilter = 'all' | 'today' | 'week' | 'month' | 'recent'

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'today', label: 'Aujourd\'hui' },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois-ci' },
  { id: 'recent', label: 'Récentes' },
]

function HistoryPanel({
  open,
  onClose,
  history,
  historyLoading,
  historyError,
  onRefresh,
  onSelect,
  onRequestDelete,
  onNewConversation,
}: {
  open: boolean
  onClose: () => void
  history: ConversationHistoryItem[]
  historyLoading: boolean
  historyError: string
  onRefresh: () => void
  onSelect: (item: ConversationHistoryItem) => void
  onRequestDelete: (item: ConversationHistoryItem, index: number) => void
  onNewConversation: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  /* ESC closes — kept from the previous implementation. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Reset transient state when the panel closes so the next
     open starts fresh. */
  useEffect(() => {
    if (!open) {
      setQuery('')
      setFilter('all')
      setActiveId(null)
      setCopiedKey(null)
    }
  }, [open])

  /* Focus management — remember the trigger and autofocus the
     search field for a ChatGPT-style keyboard-first experience. */
  useEffect(() => {
    if (!open) return
    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null
    const t = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 80)
    return () => {
      window.clearTimeout(t)
      const prev = previousFocusRef.current
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [open])

  /* Tab-trap while the panel is open. Keeps keyboard focus
     inside the panel so screen-reader users don't escape the
     modal context. */
  useEffect(() => {
    if (!open) return
    const root = panelRef.current
    if (!root) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  /* Body scroll lock — prevents the page underneath from
     scrolling while the panel is open. */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  /* Filter + search — the query keeps the existing predicate
     (question / reponse contains the term) and the filter
     adds a soft time-window gate. The list is then grouped
     by day so a long list reads as a timeline. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now)
    startOfMonth.setDate(now.getDate() - 30)
    startOfMonth.setHours(0, 0, 0, 0)

    return history.filter(item => {
      if (q) {
        const matches =
          item.question.toLowerCase().includes(q) ||
          item.reponse.toLowerCase().includes(q)
        if (!matches) return false
      }
      const d = new Date(item.date)
      if (filter === 'today' && d < startOfDay) return false
      if (filter === 'week' && d < startOfWeek) return false
      if (filter === 'month' && d < startOfMonth) return false
      if (filter === 'recent' && d < startOfWeek) return false
      return true
    })
  }, [history, query, filter])

  const handleCopyQuestion = async (item: ConversationHistoryItem, index: number) => {
    try {
      await navigator.clipboard.writeText(item.question)
      setCopiedKey(historyItemKey(item, index))
      window.setTimeout(() => setCopiedKey(null), 1400)
    } catch {
      setCopiedKey(null)
    }
  }

  const toggleFavorite = (key: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return createPortal(
    <>
      {/* Backdrop — dark scrim with a soft blur. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] transition-opacity duration-200 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Side panel — desktop floating, mobile full-screen sheet. */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Historique des conversations"
        aria-hidden={!open}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-border bg-card transition-transform duration-[220ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        } sm:left-auto sm:right-3 sm:top-3 sm:bottom-3 sm:max-h-[calc(100vh-1.5rem)] sm:w-[440px] sm:rounded-[28px] history-panel-edge sm:translate-x-0 ${
          open ? 'sm:scale-100 sm:opacity-100' : 'sm:scale-[0.985] sm:opacity-0 sm:translate-x-6'
        }`}
        style={{
          animation: open
            ? 'historyPanelIn 220ms cubic-bezier(0.25, 0.1, 0.25, 1) both'
            : undefined,
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <header
          className="shrink-0 bg-gradient-to-b from-card to-card/80 px-5 pb-3 pt-5"
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_8px_18px_-8px_rgba(46,99,255,0.55)]"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
              >
                <History size={17} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[18px] font-semibold tracking-[-0.01em] text-text-primary">
                  Historique des conversations
                </h2>
                <p className="mt-0.5 text-[12px] leading-5 text-text-secondary">
                  Parcourez et rouvrez vos précédentes conversations avec l'IA
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span
                aria-label={`${history.length} conversations`}
                className="inline-flex h-6 items-center gap-1 rounded-full bg-hover px-2 text-[11px] font-semibold tabular-nums text-text-secondary"
              >
                {history.length}
              </span>
              <button
                type="button"
                onClick={onRefresh}
                title="Actualiser"
                aria-label="Actualiser les conversations"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary active:scale-90"
              >
                <RefreshCw size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={onNewConversation}
                title="Nouvelle conversation"
                aria-label="Démarrer une nouvelle conversation"
                className="hidden h-8 items-center gap-1.5 rounded-full bg-text-primary px-3 text-[12px] font-medium text-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-card-hover active:scale-95 sm:inline-flex"
              >
                <SquarePen size={12} strokeWidth={2.2} />
                Nouvelle
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Fermer"
                aria-label="Fermer le panneau"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary active:scale-90"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* Spotlight search + quick filters share one sticky
              subheader so they stay locked above the list as the
              user scrolls. They only render when there is at
              least one conversation to manage. */}
        </header>

        {history.length > 0 && (
          <div
            className="history-sticky-top shrink-0 border-b border-border px-5 pb-3 pt-2"
          >
            <div className="group/search relative flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 transition-all duration-200 focus-within:border-brand focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]">
              <Search
                size={14}
                strokeWidth={2.2}
                className="shrink-0 text-text-muted transition-colors group-focus-within/search:text-brand"
              />
              <input
                ref={searchInputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher dans vos conversations…"
                aria-label="Rechercher dans les conversations"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-text-primary outline-none placeholder:text-text-muted focus:outline-none focus:ring-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  title="Effacer la recherche"
                  aria-label="Effacer la recherche"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
                >
                  <X size={11} strokeWidth={2.4} />
                </button>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Filtres rapides"
              className="mt-2.5 flex gap-1.5 overflow-x-auto history-scroll"
            >
              {FILTERS.map(f => {
                const active = filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 active:scale-95 ${
                      active
                        ? 'bg-text-primary text-card shadow-soft'
                        : 'bg-card text-text-secondary border border-border hover:-translate-y-0.5 hover:border-border-strong hover:text-text-primary hover:shadow-[0_4px_12px_-6px_rgba(15,23,42,0.12)]'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── List body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 history-scroll">
          {historyLoading ? (
            <div className="space-y-2.5 pt-1">
              {[0, 1, 2, 3].map(i => (
                <HistoryCardSkeleton key={i} />
              ))}
            </div>
          ) : historyError ? (
            <div
              role="alert"
              className="rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3.5 text-[13px] leading-5 text-bad"
            >
              {historyError}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-4 py-14 text-center">
              {/* Soft halo behind the illustration. */}
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-6 rounded-full opacity-70"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.08) 45%, transparent 70%)',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="relative flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-[0_18px_36px_-12px_rgba(46,99,255,0.45)]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
                >
                  <Inbox size={26} strokeWidth={1.9} />
                </span>
              </div>
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.01em] text-text-primary">
                  Aucune conversation pour le moment
                </p>
                <p className="mt-1.5 max-w-[18rem] text-[13px] leading-5 text-text-secondary">
                  Vos conversations avec MedAssist AI apparaîtront ici.
                </p>
              </div>
              <button
                type="button"
                onClick={onNewConversation}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-text-primary px-4 py-2 text-[12.5px] font-medium text-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-card-hover active:scale-95"
              >
                <SquarePen size={13} strokeWidth={2.2} />
                Démarrer une conversation
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-5 rounded-full opacity-70"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(15,23,42,0.06) 0%, transparent 70%)',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-text-muted shadow-soft"
                >
                  <SearchX size={22} strokeWidth={1.9} />
                </span>
              </div>
              <div>
                <p className="text-[14.5px] font-semibold tracking-[-0.005em] text-text-primary">
                  Aucune conversation correspondante
                </p>
                <p className="mt-1 max-w-[18rem] text-[12.5px] leading-5 text-text-secondary">
                  Essayez un autre mot-clé
                  {filter !== 'all' ? ' ou retirez le filtre actif' : ''}.
                </p>
              </div>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft active:scale-95"
                >
                  <X size={11} strokeWidth={2.4} />
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {filtered.map((item, index) => {
                const key = historyItemKey(item, index)
                return (
                  <HistoryCard
                    key={key}
                    item={item}
                    index={index}
                    isSelected={activeId === key}
                    isFavorite={favorites.has(key)}
                    copied={copiedKey === key}
                    onSelect={() => {
                      setActiveId(key)
                      onSelect(item)
                    }}
                    onRequestDelete={() => onRequestDelete(item, index)}
                    onCopyQuestion={() => handleCopyQuestion(item, index)}
                    onToggleFavorite={() => toggleFavorite(key)}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        {history.length > 0 && (
          <footer className="shrink-0 border-t border-border bg-card px-5 py-3 sm:hidden">
            <button
              type="button"
              onClick={onNewConversation}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-text-primary px-4 py-2.5 text-[13px] font-medium text-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-card-hover active:scale-95"
            >
              <SquarePen size={14} strokeWidth={2.2} />
              Nouvelle conversation
            </button>
          </footer>
        )}
      </aside>
    </>,
    document.body
  )
}

export type ChatInterfaceHandle = {
  openHistory: () => void
  startNew: () => void
}

type ChatInterfaceProps = {
  /** Notified whenever the history list size changes — used by the
   *  page-level header to render a badge on the History button. */
  onHistoryCountChange?: (count: number) => void
}

const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(function ChatInterface({ onHistoryCountChange }, ref) {
  // ── sessionStorage persistence ──────────────────────────────────────
  // The chat state (messages, feedback, disclaimer) is kept across
  // navigations and accidental refreshes by mirroring it to
  // sessionStorage. sessionStorage is scoped to the tab, so closing the
  // tab naturally starts a fresh conversation — which is the behavior
  // we want for an "ephemeral" chat session.
  const STORAGE_KEY = 'medassist:chat:v1'

  const loadPersisted = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return fallback
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const value = parsed[key]
      return value === undefined ? fallback : (value as T)
    } catch {
      // Corrupted entry — drop it so we don't keep failing on every read.
      try { window.sessionStorage.removeItem(STORAGE_KEY) } catch {}
      return fallback
    }
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadPersisted<ChatMessage[]>('messages', []))
  const [history, setHistory] = useState<ConversationHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down' | undefined>>(() =>
    loadPersisted<Record<number, 'up' | 'down' | undefined>>('feedback', {}),
  )
  const [pendingDelete, setPendingDelete] = useState<{ item: ConversationHistoryItem; index: number } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [disclaimerDismissed, setDisclaimerDismissed] = useState<boolean>(() =>
    loadPersisted<boolean>('disclaimerDismissed', false),
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const interruptedRef = useRef(false)

  // Mirror the persisted fields back to sessionStorage on every change.
  // We persist messages, feedback, and disclaimerDismissed only — input
  // and transient UI state stay in memory.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, feedback, disclaimerDismissed }),
      )
    } catch {
      // Quota exceeded or storage disabled — degrade gracefully, the
      // in-memory state still works for the current session.
    }
  }, [messages, feedback, disclaimerDismissed])

  const loadHistory = async () => {
    setHistoryLoading(true)
    setHistoryError('')

    try {
      const response = await getChatHistory()
      const items = response.data as ConversationHistoryItem[]
      setHistory(items)
    } catch {
      setHistoryError("Impossible de charger l'historique des conversations.")
    } finally {
      setHistoryLoading(false)
    }
  }

  const deleteHistoryItem = async (item: ConversationHistoryItem, index: number) => {
    const key = historyItemKey(item, index)
    try {
      await deleteChatHistoryItem(item.id ?? key)
      setHistory(prev => prev.filter((h, i) => historyItemKey(h, i) !== key))
    } catch {
      setHistoryError("Impossible de supprimer cette conversation.")
      throw new Error('delete-failed')
    }
  }

  // Expose a tiny imperative API so the page-level header can drive the
  // history panel and the "New conversation" action without lifting all
  // of the chat state up.
  useImperativeHandle(
    ref,
    () => ({
      openHistory: () => setHistoryOpen(true),
      startNew: () => resetChat(),
    }),
    // resetChat is recreated every render but reads fresh state, so an
    // empty dep array is safe: each ref.current.startNew() call invokes
    // the latest closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    loadHistory()
  }, [])

  // Bubble the history count up to the page so the History button can
  // show a live badge. Wrapped in a try/catch in case the parent didn't
  // pass a callback (props are optional).
  useEffect(() => {
    if (!onHistoryCountChange) return
    onHistoryCountChange(history.length)
  }, [history.length, onHistoryCountChange])

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = '0px'
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`
  }, [input])

  const send = async (question?: string) => {
    const q = (question ?? input).trim()
    if (!q || loading) return

    const historique = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
    const userMsg: ChatMessage = { role: 'user', content: q }

    setInput('')
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    interruptedRef.current = false

    try {
      const r = await sendChat(q, historique)
      if (interruptedRef.current) return
      setMessages(prev => [...prev, { role: 'assistant', content: r.data.reponse, sources: r.data.sources }])
      await loadHistory()
    } catch {
      if (interruptedRef.current) return
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur s'est produite. Veuillez réessayer." }])
    } finally {
      if (!interruptedRef.current) setLoading(false)
      inputRef.current?.focus()
    }
  }

  const interrupt = () => {
    interruptedRef.current = true
    setLoading(false)
    setMessages(prev => [...prev, { role: 'assistant', content: 'Génération interrompue.' }])
    inputRef.current?.focus()
  }

  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      window.setTimeout(() => setCopiedIndex(null), 1400)
    } catch {
      setCopiedIndex(null)
    }
  }

  const setMessageFeedback = (index: number, value: 'up' | 'down') => {
    setFeedback(prev => {
      const next = { ...prev }
      if (next[index] === value) {
        delete next[index]
      } else {
        next[index] = value
      }
      return next
    })
  }

  const resetChat = () => {
    setMessages([])
    setInput('')
    setFeedback({})
    setHistoryOpen(false)
    // Clear persisted chat so the next mount doesn't resurrect the
    // conversation we just intentionally abandoned.
    try { window.sessionStorage.removeItem(STORAGE_KEY) } catch {}
    inputRef.current?.focus()
  }

  const openHistoryItem = (item: ConversationHistoryItem) => {
    setMessages([
      { role: 'user', content: item.question },
      { role: 'assistant', content: item.reponse, sources: item.sources },
    ])
    setFeedback({})
    setHistoryOpen(false)
    inputRef.current?.focus()
  }

  const requestDelete = (item: ConversationHistoryItem, index: number) => {
    setPendingDelete({ item, index })
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteHistoryItem(pendingDelete.item, pendingDelete.index)
      setPendingDelete(null)
    } catch {
      // Error is surfaced via historyError; close the modal anyway.
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const truncatedQuestion = pendingDelete
    ? (pendingDelete.item.question.length > 80
        ? `${pendingDelete.item.question.slice(0, 80)}…`
        : pendingDelete.item.question)
    : ''

  const pendingDateLabel = pendingDelete
    ? (() => {
        const d = new Date(pendingDelete.item.date)
        return d.toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      })()
    : ''

  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border shadow-card"
      style={{
        color: 'var(--text-primary)',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 80%, transparent) 0%, color-mix(in srgb, var(--bg-card) 100%, transparent) 26%)',
      }}
    >
      {/* Top-edge highlight — gives the card a soft "lifted" feel
          against the page background so the two surfaces contrast. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 60%, transparent) 0%, color-mix(in srgb, var(--bg-elevated) 0%, transparent) 22%)',
        }}
      />
      {/* Subtle accent glow in the corners — adds depth without color. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60% 55% at 12% 8%, rgba(59,130,246,0.06) 0%, transparent 70%), radial-gradient(55% 50% at 92% 96%, rgba(99,102,241,0.05) 0%, transparent 70%)',
        }}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 sm:px-8 sm:py-8">
          {!disclaimerDismissed && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200/50 bg-amber-50/40 px-4 py-3 backdrop-blur-sm transition-all duration-200 ease-out sm:mb-6 dark:bg-elevated"              
              style={{ animation: 'contentFade 220ms cubic-bezier(0.25, 0.1, 0.25, 1) both' }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warn/20 text-warn">
                <ShieldCheck size={15} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold tracking-[-0.005em] text-warn">
                  Information médicale uniquement
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-warn/80">
                  MedAssist vous aide à retrouver des informations dans les documents hospitaliers indexés. Il ne remplace pas le
                  jugement d'un professionnel médical ou technique qualifié.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisclaimerDismissed(true)}
                aria-label="Masquer l'avertissement"
                title="Masquer"
                className="flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full text-warn/70 transition hover:bg-warn/20 hover:text-warn"
              >
                <X size={13} strokeWidth={2.4} />
              </button>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="relative flex flex-1 flex-col justify-center py-8">

              <div className="relative mx-auto flex w-full max-w-xl flex-col items-center text-center">
                <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text-primary sm:text-[30px]">
                  Comment puis-je vous aider aujourd'hui ?
                </h2>
                <p className="mt-2 max-w-md text-[14px] leading-6 text-text-secondary">{WELCOME_MESSAGE}</p>

                <div className="mt-7 flex max-w-xl flex-wrap items-center justify-center gap-1.5">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(suggestion)}
                      style={{
                        animation: 'suggestionIn 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
                        animationDelay: `${200 + i * 60}ms`,
                      }}
                      className="group/sugg inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[12.5px] font-medium text-text-secondary backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/40 hover:bg-card hover:text-text-primary hover:shadow-[0_6px_18px_-8px_rgba(37,99,235,0.22)] active:scale-[0.97]"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand transition-colors group-hover/sugg:bg-brand/25"
                      >
                        {SUGGESTION_META[i] ? (
                          React.cloneElement(SUGGESTION_META[i].icon as React.ReactElement, {
                            size: 11,
                            strokeWidth: 2.3,
                          })
                        ) : (
                          <BookOpen size={11} strokeWidth={2.3} />
                        )}
                      </span>
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))}
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="mt-7 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    <Clock3 size={13} strokeWidth={2.2} />
                    Reprendre une conversation précédente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-7 pb-4">
              {messages.map((message, i) => (
                <MessageRow
                  key={i}
                  message={message}
                  copied={copiedIndex === i}
                  onCopy={() => copyMessage(message.content, i)}
                  feedback={feedback[i]}
                  onFeedback={(v) => setMessageFeedback(i, v)}
                />
              ))}

              {loading && (
                <article className="flex gap-4" aria-live="polite">
                  <AssistantAvatar pulsing />
                  <ThinkingIndicator />
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 px-4 pb-4 pt-1 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="group/chat relative mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-border bg-card p-2 pl-3.5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08),0_24px_48px_-12px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out focus-within:border-blue-300 focus-within:shadow-[0_8px_28px_-6px_rgba(46,99,255,0.25),0_0_0_4px_rgba(46,99,255,0.06)]"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Posez une question sur les documents hospitaliers indexés…"
            disabled={loading}
            rows={1}
            className="max-h-40 min-h-[2.5rem] min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-[14.5px] leading-6 text-text-primary outline-none placeholder:text-text-muted focus:outline-none focus:ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {loading ? (
            <button
              type="button"
              onClick={interrupt}
              title="Arrêter la génération"
              aria-label="Arrêter la génération"
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-700 active:scale-95"
            >
              <Square size={12} strokeWidth={2.4} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="Envoyer"
              aria-label="Envoyer le message"
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_4px_12px_-2px_rgba(46,99,255,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-2px_rgba(46,99,255,0.55)] active:scale-95 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:shadow-none disabled:text-slate-400 dark:text-text-muted"
              style={{
                background: input.trim()
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : '#E5E7EB',
              }}
            >
              <ArrowUp size={16} strokeWidth={2.6} />
            </button>
          )}
        </form>
        <p className="mx-auto mt-2.5 max-w-3xl text-center text-[11px] text-text-muted">
          MedAssist peut commettre des erreurs. Vérifiez les informations importantes.
        </p>
      </footer>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        historyLoading={historyLoading}
        historyError={historyError}
        onRefresh={loadHistory}
        onSelect={openHistoryItem}
        onRequestDelete={requestDelete}
        onNewConversation={resetChat}
      />

      <Modal
        open={!!pendingDelete}
        onClose={() => (deleting ? undefined : setPendingDelete(null))}
        size="sm"
        dismissDisabled={deleting}
        ariaLabel="Supprimer la conversation"
      >
        <ModalHeader
          icon={<AlertTriangle size={16} strokeWidth={2.2} />}
          iconTone="red"
          title="Supprimer cette conversation ?"
          subtitle="Cette action supprimera définitivement la conversation de votre historique."
        />
        <ModalBody>
          <div className="rounded-2xl border border-border bg-hover px-4 py-3">
            <p className="text-[13.5px] font-medium leading-6 text-text-primary">
              « {truncatedQuestion} »
            </p>
            {pendingDateLabel && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-text-secondary">
                <Calendar size={11} strokeWidth={2.2} className="shrink-0" />
                <span>Créée le {pendingDateLabel}</span>
              </p>
            )}
          </div>
          <p className="mt-3 text-[12.5px] leading-5 text-text-secondary">
            Cette action est irréversible. Vous perdrez la réponse ainsi que les sources
            associées à cette conversation.
          </p>
        </ModalBody>
        <ModalFooter>
          <ModalButton
            variant="ghost"
            onClick={() => setPendingDelete(null)}
            disabled={deleting}
          >
            Annuler
          </ModalButton>
          <ModalButton
            variant="danger"
            onClick={confirmDelete}
            loading={deleting}
            leadingIcon={<Trash2 size={13} strokeWidth={2.4} />}
          >
            Supprimer
          </ModalButton>
        </ModalFooter>
      </Modal>

      <div className="sr-only" aria-live="polite">
        {loading ? "L'assistant génère une réponse" : ''}
      </div>
    </section>
  )
})

export default ChatInterface
