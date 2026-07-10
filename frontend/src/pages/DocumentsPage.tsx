import React, { useEffect, useState } from 'react'
import { getDocuments } from '../services/api'
import { Document } from '../types'
import DocumentsManager from '../components/Documents/DocumentsManager'
import { BookOpen, Database, FileCheck2 } from 'lucide-react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])

  const load = async () => {
    const r = await getDocuments()
    setDocuments(r.data)
  }

  useEffect(() => { load() }, [])

  const indexed = documents.filter(d => d.indexe).length

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Connaissance interne</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Documents</h2>
          <p className="mt-1 text-sm text-slate-500">{documents.length} document(s) - {indexed} indexe(s) dans la base IA</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Total</p>
            <p className="font-bold text-slate-900">{documents.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-xs font-medium text-emerald-700">Indexe</p>
            <p className="font-bold text-emerald-800">{indexed}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DocumentsManager documents={documents} onRefresh={load} />
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <BookOpen size={18} className="text-primary" />
            Cycle documentaire
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                <FileCheck2 size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Ajoutez les PDF valides</p>
                <p className="text-sm text-slate-500">Protocoles, procedures et manuels internes.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Database size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Indexation automatique</p>
                <p className="text-sm text-slate-500">Les contenus deviennent consultables par l'assistant IA.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Les reponses de l'IA dependent directement de la qualite et de l'actualite des documents indexes.
          </div>
        </aside>
      </div>
    </div>
  )
}
