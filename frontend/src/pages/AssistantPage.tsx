import React from 'react'
import ChatInterface from '../components/Chat/ChatInterface'
import { Shield } from 'lucide-react'

export default function AssistantPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Assistant IA</h2>
        <p className="text-gray-500 text-sm">Posez vos questions — les réponses sont fondées sur vos documents officiels</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
        <Shield size={13} />
        Cet assistant est un outil d'aide à l'information. Il ne remplace pas le jugement médical ou technique d'un professionnel.
      </div>
      <ChatInterface />
    </div>
  )
}