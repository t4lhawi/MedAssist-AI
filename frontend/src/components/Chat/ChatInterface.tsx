import React, { useEffect, useRef, useState } from 'react'
import { sendChat } from '../../services/api'
import { ChatMessage } from '../../types'
import { BookOpen, Bot, Loader2, Send, User } from 'lucide-react'

const SUGGESTIONS = [
  "Quelle est la temperature recommandee pour une salle de soins ?",
  "Quelles sont les procedures de desinfection des equipements ?",
  "Comment interpreter une humidite de 75% ?",
  "Quels sont les protocoles en cas d'alerte critique ?",
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Bonjour. Je peux repondre a vos questions en m'appuyant sur les documents officiels indexes dans MedAssist AI.",
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
      setMessages(prev => [...prev, { role: 'assistant', content: "Desole, une erreur est survenue. Veuillez reessayer." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:min-h-0">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
          <Bot size={21} />
        </div>
        <div>
          <p className="font-semibold">Assistant IA hospitalier</p>
          <p className="text-xs text-white/65">Reponses fondees sur la base documentaire</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              m.role === 'user' ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'
            }`}>
              {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`flex max-w-[86%] flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${
                m.role === 'user'
                  ? 'bg-primary text-white'
                  : 'border border-slate-200 bg-white text-slate-800'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.sources.map((s, si) => (
                    <span key={si} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                      <BookOpen size={10} /> {s.document} p.{s.page}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
              <Bot size={14} />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <Loader2 size={16} className="animate-spin text-primary" />
              Recherche dans les documents...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:border-primary/30 hover:bg-primary-light hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 border-t border-slate-200 bg-white p-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Posez votre question..."
          disabled={loading}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          title="Envoyer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-dark disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
