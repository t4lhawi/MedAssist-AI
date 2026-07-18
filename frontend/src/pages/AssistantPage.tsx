import React from 'react'
import ChatInterface from '../components/Chat/ChatInterface'
import { ShieldAlert, Sparkles } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'

export default function AssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-7xl flex-col gap-3 p-3 md:h-[calc(100vh-4.25rem)] md:p-4">
      <PageHeader
        category="Support documentaire"
        title="Assistant IA"
        subtitle="Posez vos questions, les réponses s'appuient sur les PDF indexés."
        liveCount={{
          value: 'IA',
          label: 'documentaire',
          tone: 'good',
        }}
        actions={
          <div className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 text-[11.5px] font-semibold text-blue-700 ring-1 ring-blue-100/50">
            <Sparkles size={12} strokeWidth={2.4} />
            RAG · {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </div>
        }
      />

      <div className="flex max-w-2xl items-start gap-2.5 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-50/50 px-3.5 py-2.5 text-[12px] font-medium leading-5 text-amber-800 shadow-sm md:text-[12.5px]">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600">
          <ShieldAlert size={13} strokeWidth={2.2} />
        </span>
        <span>
          Aide à retrouver l'information. <span className="font-semibold">Ne remplace pas</span> le jugement médical ou technique d'un professionnel.
        </span>
      </div>

      <ChatInterface />
    </div>
  )
}
