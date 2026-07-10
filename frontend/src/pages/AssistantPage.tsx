import React from 'react'
import ChatInterface from '../components/Chat/ChatInterface'
import { ShieldAlert } from 'lucide-react'

export default function AssistantPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col space-y-4 p-4 md:h-full md:p-6">
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)]">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-600">Support documentaire</p>
        <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-slate-900">Assistant IA</h2>
        <p className="mt-1 text-[13px] text-slate-400">Posez vos questions ; les réponses s'appuient sur vos documents officiels.</p>
      </div>
      <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-700">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
        Cet assistant aide à retrouver l'information. Il ne remplace pas le jugement médical ou technique d'un professionnel.
      </div>
      <ChatInterface />
    </div>
  )
}