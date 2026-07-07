import React, { useEffect, useState } from 'react'
import { getDocuments } from '../services/api'
import { Document } from '../types'
import DocumentsManager from '../components/Documents/DocumentsManager'
import { BookOpen } from 'lucide-react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const load = async () => { const r = await getDocuments(); setDocuments(r.data) }
  useEffect(() => { load() }, [])

  const indexed = documents.filter(d => d.indexe).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
          <p className="text-gray-500 text-sm">{documents.length} document(s) · {indexed} indexé(s) dans la base IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <DocumentsManager documents={documents} onRefresh={load} />
        </div>
        <div className="bg-primary-light rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <BookOpen size={18} /> Comment ça marche ?
          </div>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Téléversez vos PDF (protocoles, procédures, manuels)</li>
            <li>Le système découpe et indexe automatiquement le contenu</li>
            <li>L'assistant IA peut ensuite répondre en citant vos documents</li>
          </ol>
          <hr className="border-primary/20" />
          <p className="text-xs text-gray-500">
            Les réponses de l'IA sont fondées <strong>uniquement</strong> sur vos documents. 
            Plus vous indexez de documents, plus les réponses seront précises.
          </p>
        </div>
      </div>
    </div>
  )
}