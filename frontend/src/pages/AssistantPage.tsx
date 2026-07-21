import React, { useRef, useState } from 'react'
import ChatInterface, { ChatInterfaceHandle } from '../components/Chat/ChatInterface'
import {
  Sparkles,
  BookOpen,
  Calendar,
  MessageSquare,
  Clock3,
  SquarePen,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'

export default function AssistantPage() {
  const [historyCount, setHistoryCount] = useState(0)
  const chatRef = useRef<ChatInterfaceHandle>(null)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })

  return (
    <div
      className="mx-auto flex max-w-7xl flex-col gap-5 p-4 md:px-6"
      style={{ color: '#111111', height: 'calc(100vh - 3.5rem)' }}
    >
      <PageHeader
        category="Espace IA"
        title="Assistant IA"
        subtitle="Posez des questions sur les documents hospitaliers indexés"
        actions={
          <div className="flex flex-col items-end gap-2">
            {/* Status row — three quiet pills aligned to the right */}
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <BookOpen size={11} strokeWidth={2.2} className="shrink-0 text-slate-400" />
                <span className="tabular-nums">Documents indexés</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <Sparkles size={10} strokeWidth={2.4} />
                RAG · En ligne
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <Calendar size={11} strokeWidth={2.2} className="shrink-0 text-slate-400" />
                <span className="tabular-nums">{today}</span>
              </span>
            </div>

            {/* Action row — History + New conversation buttons.
                They drive the chat canvas through the imperative handle. */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => chatRef.current?.openHistory()}
                title="Historique des conversations"
                aria-label="Ouvrir l'historique des conversations"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_6px_18px_-8px_rgba(15,23,42,0.15)]"
              >
                <Clock3 size={13} strokeWidth={2.2} />
                <span className="hidden sm:inline">Historique</span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-4 min-w-[1rem] items-center justify-center gap-0.5 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold tabular-nums text-slate-600"
                >
                  <MessageSquare size={9} strokeWidth={2.4} className="text-slate-400" />
                  {historyCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => chatRef.current?.startNew()}
                title="Nouvelle conversation"
                aria-label="Démarrer une nouvelle conversation"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[12.5px] font-medium text-white shadow-[0_2px_8px_-2px_rgba(17,17,17,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_20px_-4px_rgba(17,17,17,0.45)]"
              >
                <SquarePen size={13} strokeWidth={2.2} />
                <span className="hidden sm:inline">Nouvelle conversation</span>
              </button>
            </div>
          </div>
        }
      />

      <ChatInterface ref={chatRef} onHistoryCountChange={setHistoryCount} />
    </div>
  )
}
