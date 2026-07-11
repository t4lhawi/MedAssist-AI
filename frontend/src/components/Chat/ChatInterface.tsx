import React, { useEffect, useRef, useState } from 'react'
import { sendChat } from '../../services/api'
import { ChatMessage } from '../../types'
import {
  ArrowUp,
  BookOpen,
  Check,
  Clipboard,
  MessageCircle,
  Square,
  SquarePen,
  Stethoscope,
} from 'lucide-react'

const SUGGESTIONS = [
  "Quelle est la température recommandée pour une salle de soins ?",
  "Quelles sont les procédures de désinfection des équipements ?",
  "Comment interpréter une humidité de 75% ?",
  "Quels sont les protocoles en cas d'alerte critique ?",
]

const WELCOME_MESSAGE =
  "Je peux répondre à vos questions en m'appuyant sur les documents officiels indexés dans MedAssist AI."

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
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
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

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const interruptedRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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

        <button
          type="button"
          onClick={resetChat}
          title="Nouvelle conversation"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <SquarePen size={14} strokeWidth={2.2} />
          <span className="hidden sm:inline">Nouveau</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center py-8">
              <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <MessageCircle size={20} strokeWidth={2} />
                </div>
                <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-slate-900">
                  Comment puis-je vous aider ?
                </h2>
                <p className="mt-2 max-w-md text-[13.5px] leading-6 text-slate-500">{WELCOME_MESSAGE}</p>

                <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="min-h-[4rem] rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-[13px] font-medium leading-5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
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
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 pl-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)] transition focus-within:border-slate-300 focus-within:shadow-[0_4px_16px_-4px_rgba(15,23,42,0.12)]"
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
            placeholder="Posez votre question..."
            disabled={loading}
            rows={1}
            className="max-h-40 min-h-[2.25rem] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {loading ? (
            <button
              type="button"
              onClick={interrupt}
              title="Arrêter la génération"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 active:scale-95"
            >
              <Square size={12} strokeWidth={2.4} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="Envoyer"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ArrowUp size={16} strokeWidth={2.4} />
            </button>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-400">
          MedAssist peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </footer>
    </section>
  )
}