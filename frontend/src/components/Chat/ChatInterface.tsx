import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Markdown from '../ui/Markdown'
import { deleteChatHistoryItem, getChatHistory, sendChat } from '../../services/api'
import { ChatMessage } from '../../types'
import {
  ArrowUp,
  BookOpen,
  Check,
  Clipboard,
  Clock3,
  MessageCircle,
  RotateCcw,
  Search,
  Square,
  SquarePen,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react'
import { SearchField } from '../ui/Field'

const SUGGESTIONS = [
  "Quelle est la température recommandée pour une salle de soins ?",
  "Quelles sont les procédures de désinfection des équipements ?",
  "Comment interpréter une humidité de 75% ?",
  "Quels sont les protocoles en cas d'alerte critique ?",
]

const WELCOME_MESSAGE =
  "Je peux répondre à vos questions en m'appuyant sur les documents officiels indexés dans MedAssist AI."

// Le mapping des éléments markdown est centralisé dans components/ui/Markdown.

type ConversationHistoryItem = {
  id?: string
  question: string
  reponse: string
  sources?: NonNullable<ChatMessage['sources']>
  date: string
}

function SourceChip({ source }: { source: NonNullable<ChatMessage['sources']>[number] }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
      <BookOpen size={11} strokeWidth={2.1} className="shrink-0 text-slate-400" />
      <span className="truncate">{source.document}</span>
      <span className="shrink-0 text-slate-400">p.{source.page}</span>
    </span>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-2">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
    </span>
  )
}

function MessageRow({
  message,
  copied,
  onCopy,
}: {
  message: ChatMessage
  copied: boolean
  onCopy: () => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <article className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-slate-100 px-4 py-2.5 text-[14.5px] leading-7 text-slate-800 sm:max-w-[70%]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </article>
    )
  }

  return (
    <article className="group flex gap-3.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
        <Stethoscope size={14} strokeWidth={2.2} />
      </div>

      <div className="flex min-w-0 max-w-[92%] flex-1 flex-col gap-2.5 sm:max-w-[85%]">
        <div className="text-[14.5px] leading-7 text-slate-800">
          <Markdown source={message.content} />
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {message.sources.map((source, i) => (
              <SourceChip key={`${source.document}-${source.page}-${i}`} source={source} />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onCopy}
          title={copied ? 'Copié' : 'Copier'}
          className="inline-flex h-7 w-7 items-center justify-center self-start rounded-md text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 sm:opacity-0"
        >
          {copied ? <Check size={14} strokeWidth={2.2} /> : <Clipboard size={14} strokeWidth={2.2} />}
        </button>
      </div>
    </article>
  )
}

function historyItemKey(item: ConversationHistoryItem, index: number) {
  return item.id ?? `${item.date}-${index}`
}

function HistoryCard({
  item,
  index,
  onSelect,
  onDelete,
}: {
  item: ConversationHistoryItem
  index: number
  onSelect: () => void
  onDelete: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const formatHistoryDate = (date: string) =>
    new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-3.5 py-3">
        <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-rose-700">
          Supprimer « {item.question} » ?
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setConfirming(false)
            }}
            disabled={deleting}
            className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-slate-500 transition hover:bg-white disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting ? '...' : 'Supprimer'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect()
      }}
      className="group relative w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate pr-6 text-[13px] font-medium text-slate-900">
          {item.question}
        </p>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 transition group-hover:opacity-0">
          {item.sources?.length ?? 0} source{(item.sources?.length ?? 0) > 1 ? 's' : ''}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] text-slate-400">{formatHistoryDate(item.date)}</p>
      <p className="mt-2 line-clamp-2 text-[12.5px] leading-5 text-slate-600">{item.reponse}</p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setConfirming(true)
        }}
        title="Supprimer cette conversation"
        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 size={13} strokeWidth={2.2} />
      </button>
    </div>
  )
}

function HistoryPanel({
  open,
  onClose,
  history,
  historyLoading,
  historyError,
  onRefresh,
  onSelect,
  onDeleteItem,
}: {
  open: boolean
  onClose: () => void
  history: ConversationHistoryItem[]
  historyLoading: boolean
  historyError: string
  onRefresh: () => void
  onSelect: (item: ConversationHistoryItem) => void
  onDeleteItem: (item: ConversationHistoryItem, index: number) => Promise<void>
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return history
    return history.filter(
      item =>
        item.question.toLowerCase().includes(q) || item.reponse.toLowerCase().includes(q)
    )
  }, [history, query])

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Historique des conversations"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em] text-slate-900">
            <Clock3 size={16} strokeWidth={2.2} className="text-blue-600" />
            Historique
            {history.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500">
                {history.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              title="Actualiser"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <RotateCcw size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Rechercher dans l'historique..."
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {historyLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-3"
                >
                  <div className="h-3 w-2/3 rounded bg-slate-200" />
                  <div className="mt-2 h-2.5 w-1/3 rounded bg-slate-200" />
                  <div className="mt-3 h-2.5 w-full rounded bg-slate-200" />
                  <div className="mt-1.5 h-2.5 w-4/5 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : historyError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-4 text-[12.5px] leading-5 text-rose-700">
              {historyError}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center">
              <Clock3 size={18} strokeWidth={1.8} className="text-slate-300" />
              <p className="text-[12.5px] leading-5 text-slate-500">
                Aucune conversation enregistrée pour le moment.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-[12.5px] text-slate-500">
              Aucun résultat pour « {query} ».
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item, index) => (
                <HistoryCard
                  key={historyItemKey(item, index)}
                  item={item}
                  index={index}
                  onSelect={() => onSelect(item)}
                  onDelete={() => onDeleteItem(item, index)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body
  )
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<ConversationHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const interruptedRef = useRef(false)

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    loadHistory()
  }, [])

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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue. Veuillez réessayer.' }])
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

  const resetChat = () => {
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const openHistoryItem = (item: ConversationHistoryItem) => {
    setMessages([
      { role: 'user', content: item.question },
      { role: 'assistant', content: item.reponse, sources: item.sources },
    ])
    setHistoryOpen(false)
    inputRef.current?.focus()
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Stethoscope size={15} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-slate-900">
              Assistant IA hospitalier
            </h3>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            title="Historique des conversations"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Clock3 size={14} strokeWidth={2.2} />
            <span className="hidden sm:inline">Historique</span>
            {history.length > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-600">
                {history.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={resetChat}
            title="Nouvelle conversation"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <SquarePen size={14} strokeWidth={2.2} />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="relative flex flex-1 flex-col justify-center overflow-hidden py-8">
              {/* Decorative background — soft gradient blobs. */}
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background:
                    'radial-gradient(circle at 18% 22%, rgba(46,99,255,0.08), transparent 50%), radial-gradient(circle at 82% 78%, rgba(91,140,255,0.06), transparent 55%)',
                }}
              />

              <div className="relative mx-auto flex w-full max-w-xl flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_8px_24px_-8px_rgba(46,99,255,0.5)]">
                  <MessageCircle size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">
                  Comment puis-je vous aider ?
                </h2>
                <p className="mt-2 max-w-md text-[13.5px] leading-6 text-slate-500">{WELCOME_MESSAGE}</p>

                <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(suggestion)}
                      style={{
                        animation: 'suggestionIn 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
                        animationDelay: `${200 + i * 60}ms`,
                      }}
                      className="group/sugg min-h-[4rem] rounded-xl border border-slate-200 bg-white/80 px-3.5 py-3 text-left text-[13px] font-medium leading-5 text-slate-600 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-[0_4px_16px_-4px_rgba(37,99,235,0.18)] active:scale-[0.99]"
                    >
                      <span className="block transition-colors group-hover/sugg:text-slate-900">{suggestion}</span>
                    </button>
                  ))}
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    <Clock3 size={13} strokeWidth={2.2} />
                    Reprendre une conversation précédente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-4">
              {messages.map((message, i) => (
                <MessageRow
                  key={i}
                  message={message}
                  copied={copiedIndex === i}
                  onCopy={() => copyMessage(message.content, i)}
                />
              ))}

              {loading && (
                <article className="flex gap-3.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Stethoscope size={14} strokeWidth={2.2} />
                  </div>
                  <TypingDots />
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
          className="group/chat relative mx-auto flex max-w-3xl items-end gap-1.5 rounded-3xl border border-slate-200 bg-white p-2 pl-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)] transition-all duration-200 ease-out focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-[0_8px_28px_-6px_rgba(46,99,255,0.25),0_0_0_4px_rgba(46,99,255,0.06)]"
        >
          <span className="pointer-events-none mb-1.5 mr-0.5 hidden shrink-0 items-center gap-1.5 self-end rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 sm:inline-flex">
            <Stethoscope size={10} strokeWidth={2.4} />
            IA
          </span>
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
            placeholder="Posez votre question…"
            disabled={loading}
            rows={1}
            className="max-h-40 min-h-[2.5rem] min-w-0 flex-1 resize-none bg-transparent py-2 text-[14px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {input.trim() && !loading && (
            <span className="pointer-events-none mb-2 hidden self-end text-[10px] font-medium uppercase tracking-wide text-slate-300 sm:inline">
              ⏎ pour envoyer
            </span>
          )}
          {loading ? (
            <button
              type="button"
              onClick={interrupt}
              title="Arrêter la génération"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-700 active:scale-95"
            >
              <Square size={12} strokeWidth={2.4} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="Envoyer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(46,99,255,0.5)] transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_6px_18px_-2px_rgba(46,99,255,0.55)] active:scale-95 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:shadow-none disabled:text-slate-400"
            >
              <ArrowUp size={16} strokeWidth={2.6} />
            </button>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-400">
          MedAssist peut faire des erreurs. Vérifiez les informations importantes.
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
        onDeleteItem={deleteHistoryItem}
      />
    </section>
  )
}