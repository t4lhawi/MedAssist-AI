import React, { useEffect, useRef, useState } from 'react'
import { sendChat } from '../../services/api'
import { ChatMessage } from '../../types'
import {
  BookOpen,
  Bot,
  Check,
  Clipboard,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  User,
} from 'lucide-react'

const SUGGESTIONS = [
  'Quelle température cible pour une chambre froide de médicaments ?',
  'Comment interpréter une pression anormale dans une zone technique ?',
  "Quels seuils surveiller pour la qualité de l'air et le CO2 ?",
  "Quels sont les protocoles en cas d'alerte critique ?",
]

const WELCOME_MESSAGE =
  "Bonjour. Je peux répondre à vos questions en m'appuyant sur les documents officiels indexés dans MedAssist AI."

function SourceChip({ source }: { source: NonNullable<ChatMessage['sources']>[number] }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
      <BookOpen size={12} strokeWidth={2.1} className="shrink-0" />
      <span className="truncate">{source.document}</span>
      <span className="shrink-0 text-blue-400">p.{source.page}</span>
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

  return (
    <article className={`group flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_8px_20px_-12px_rgba(37,99,235,0.9)]">
          <Bot size={16} strokeWidth={2.1} />
        </div>
      )}

      <div className={`flex min-w-0 max-w-[88%] flex-col gap-2 sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          {!isUser && <p className="text-[12px] font-semibold text-slate-500">MedAssist</p>}
          {isUser && <p className="text-[12px] font-semibold text-slate-400">Vous</p>}
        </div>

        <div
          className={`relative rounded-[1.35rem] px-4 py-3 text-[14px] leading-7 shadow-sm ${
            isUser
              ? 'rounded-tr-md bg-slate-900 text-white shadow-slate-900/10'
              : 'rounded-tl-md border border-slate-200 bg-white text-slate-800 shadow-black/[0.03]'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        <div className={`flex flex-wrap items-center gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && message.sources && message.sources.length > 0 && message.sources.map((source, i) => (
            <SourceChip key={`${source.document}-${source.page}-${i}`} source={source} />
          ))}

          {!isUser && (
            <button
              type="button"
              onClick={onCopy}
              title={copied ? 'Copié' : 'Copier'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100"
            >
              {copied ? <Check size={14} strokeWidth={2.2} /> : <Clipboard size={14} strokeWidth={2.2} />}
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <User size={16} strokeWidth={2.1} />
        </div>
      )}
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

    try {
      const r = await sendChat(q, historique)
      setMessages(prev => [...prev, { role: 'assistant', content: r.data.reponse, sources: r.data.sources }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue. Veuillez réessayer.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
      <header className="flex items-center justify-between gap-3 px-1 py-2 sm:px-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_26px_-16px_rgba(37,99,235,1)]">
            <Sparkles size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-slate-900">
              Assistant IA hospitalier
            </h3>
            <p className="truncate text-[12px] text-slate-400">Réponses fondées sur la base documentaire</p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetChat}
          title="Nouvelle conversation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <Plus size={18} strokeWidth={2.2} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-transparent">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-2 py-4 sm:px-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center py-8">
              <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_34px_-20px_rgba(37,99,235,1)]">
                  <MessageCircle size={25} strokeWidth={2} />
                </div>
                <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[30px]">
                  Comment puis-je vous aider ?
                </h2>
                <p className="mt-3 max-w-xl text-[14px] leading-7 text-slate-500">{WELCOME_MESSAGE}</p>

                <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(suggestion)}
                    className="min-h-[4.5rem] rounded-2xl bg-white px-4 py-3 text-left text-[13px] font-medium leading-6 text-slate-700 shadow-sm transition hover:bg-blue-50/70 hover:text-blue-700 active:scale-[0.99]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-5">
              {messages.map((message, i) => (
                <MessageRow
                  key={i}
                  message={message}
                  copied={copiedIndex === i}
                  onCopy={() => copyMessage(message.content, i)}
                />
              ))}

              {loading && (
                <article className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_8px_20px_-12px_rgba(37,99,235,0.9)]">
                    <Bot size={16} strokeWidth={2.1} />
                  </div>
                  <div className="flex min-w-0 max-w-[88%] flex-col gap-2 sm:max-w-[78%]">
                    <p className="text-[12px] font-semibold text-slate-500">MedAssist</p>
                    <div className="inline-flex w-fit items-center gap-2 rounded-[1.35rem] rounded-tl-md bg-white px-4 py-3 text-[13px] font-medium text-slate-500 shadow-sm">
                      <Loader2 size={15} className="animate-spin text-blue-600" />
                      Recherche dans les documents...
                    </div>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <footer className="bg-transparent px-0 py-2 sm:px-1">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="mx-auto flex max-w-4xl items-end gap-2 rounded-[1.35rem] border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-blue-300 focus-within:shadow-[0_18px_45px_-34px_rgba(37,99,235,0.9)]"
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
            className="max-h-40 min-h-[2.5rem] min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-[14px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            title="Envoyer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_24px_-15px_rgba(37,99,235,1)] transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} strokeWidth={2.2} />}
          </button>
        </form>
      </footer>
    </section>
  )
}
