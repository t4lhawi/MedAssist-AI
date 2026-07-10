import React from 'react'
import ChatInterface from '../components/Chat/ChatInterface'
import { Shield } from 'lucide-react'

export default function AssistantPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col space-y-4 p-4 md:h-full md:p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Support documentaire</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Assistant IA</h2>
        <p className="mt-1 text-sm text-slate-500">Posez vos questions; les reponses s'appuient sur vos documents officiels.</p>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
        <Shield size={16} className="mt-0.5 shrink-0" />
        Cet assistant aide a retrouver l'information. Il ne remplace pas le jugement medical ou technique d'un professionnel.
      </div>
      <ChatInterface />
    </div>
  )
}
