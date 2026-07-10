import React, { useEffect, useRef, useState } from 'react'
import { sendChat } from '../../services/api'
import { ChatMessage } from '../../types'
import { BookOpen, Bot, Loader2, Send, Sparkles, User } from 'lucide-react'

const SUGGESTIONS = [
  "Quelle est la température recommandée pour une salle de soins ?",
  "Quelles sont les procédures de désinfection des équipements ?",
  "Comment interpréter une humidité de 75% ?",
  "Quels sont les protocoles en cas d'alerte critique ?",
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Bonjour. Je peux répondre à vos questions en m'appuyant sur les documents officiels indexés dans MedAssist AI.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (question?: string) => {
    const q = question || input.trim()
    if (!q || loading) return

    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const historique = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const r = await sendChat(q, historique)
      setMessages(prev => [...prev, { role: 'assistant', content: r.data.reponse, sources: r.data.sources }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur est survenue. Veuillez réessayer." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)] md:min-h-0">
      <div className="flex items-center gap-3 border-b border-black/5 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_2px_8px_-1px_rgba(37,99,235,0.5)]">
          <Sparkles size={18} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-[-0.01em]">Assistant IA hospitalier</p>
          <p className="text-[11.5px] text-white/50">Réponses fondées sur la base documentaire</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-b from-blue-500 to-blue-600 text-white'
              }`}
            >
              {m.role === 'user' ? <User size={13} strokeWidth={2.2} /> : <Bot size={13} strokeWidth={2.2} />}
            </div>
            <div className={`flex max-w-[86%] flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-tr-md bg-blue-600 text-white'
                    : 'rounded-tl-md bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_6px_-2px_rgba(0,0,0,0.06)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.sources.map((s, si) => (
                    <span
                      key={si}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600"
                    >
                      <BookOpen size={10} /> {s.document} p.{s.page}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white">
              <Bot size={13} strokeWidth={2.2} />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-white px-4 py-2.5 text-[13px] text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_6px_-2px_rgba(0,0,0,0.06)]">
              <Loader2 size={14} className="animate-spin text-blue-500" />
              Recherche dans les documents...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="border-t border-black/5 bg-white px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-left text-[12px] font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-black/5 bg-white p-3.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Posez votre question..."
          disabled={loading}
          className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-[13.5px] text-slate-800 outline-none transition-shadow placeholder:text-slate-400 focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          title="Envoyer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_2px_6px_-1px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-700 active:scale-90 disabled:opacity-30 disabled:shadow-none"
        >
          <Send size={15} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}