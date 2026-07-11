import React from 'react'
import ChatInterface from '../components/Chat/ChatInterface'
import { ShieldAlert } from 'lucide-react'

export default function AssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-7xl flex-col gap-3 p-3 md:h-[calc(100vh-4.25rem)] md:p-4">
      <div className="flex shrink-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Support documentaire</p>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Assistant IA</h2>
        </div>

        <div className="flex max-w-2xl items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium leading-5 text-amber-700 md:text-[12.5px]">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <span>
            Aide à retrouver l'information. Ne remplace pas le jugement médical ou technique d'un professionnel.
          </span>
        </div>
      </div>

      <ChatInterface />
    </div>
  )
}
