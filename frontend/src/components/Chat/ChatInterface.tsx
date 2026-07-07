import React, { useState, useRef, useEffect } from 'react'
import { sendChat } from '../../services/api'
import { ChatMessage } from '../../types'
import { Send, Bot, User, BookOpen, Loader2 } from 'lucide-react'

const SUGGESTIONS = [
  "Quelle est la température recommandée pour une salle de soins ?",
  "Quelles sont les procédures de désinfection des équipements ?",
  "Comment interpréter une humidité de 75% ?",
  "Quels sont les protocoles en cas d'alerte critique ?",
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Bonjour ! Je suis MedAssist AI, votre assistant intelligent. Je peux répondre à vos questions en me basant sur les documents officiels de l'établissement. Comment puis-je vous aider ?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue. Veuillez réessayer.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: '70vh' }}>
      {/* En-tête */}
      <div className="flex items-center gap-3 p-4 border-b bg-primary text-white rounded-t-xl">
        <Bot size={22} />
        <div>
          <p className="font-semibold">Assistant IA Hospitalier</p>
          <p className="text-xs opacity-70">Réponses fondées sur vos documents officiels</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
              ${m.role === 'user' ? 'bg-primary text-white' : 'bg-primary-light text-primary'}`}>
              {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                {m.content}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.sources.map((s, si) => (
                    <span key={si} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      <BookOpen size={9} /> {s.document} p.{s.page}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2.5">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              className="text-xs bg-primary-light text-primary px-3 py-1.5 rounded-full hover:bg-blue-100 transition text-left">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Saisie */}
      <div className="p-4 border-t flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Posez votre question…" disabled={loading}
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark disabled:opacity-40 transition">
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}