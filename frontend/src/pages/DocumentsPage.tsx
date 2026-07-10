import React, { useEffect, useState } from 'react'
import { getDocuments } from '../services/api'
import { Document } from '../types'
import DocumentsManager from '../components/Documents/DocumentsManager'
import { AlertTriangle, BookOpen, Database, FileCheck2 } from 'lucide-react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])

  const load = async () => {
    const r = await getDocuments()
    setDocuments(r.data)
  }

  useEffect(() => { load() }, [])

  const indexed = documents.filter(d => d.indexe).length

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-600">Connaissance interne</p>
          <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-slate-900">Documents</h2>
          <p className="mt-1 text-[13px] text-slate-400">{documents.length} document(s) · {indexed} indexé(s) dans la base IA</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl bg-slate-100 px-3.5 py-2">
            <p className="text-[11px] font-medium text-slate-500">Total</p>
            <p className="text-[15px] font-semibold text-slate-900">{documents.length}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3.5 py-2">
            <p className="text-[11px] font-medium text-emerald-600">Indexé</p>
            <p className="text-[15px] font-semibold text-emerald-700">{indexed}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DocumentsManager documents={documents} onRefresh={load} />
        </div>
        <aside className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-blue-50 text-blue-600">
              <BookOpen size={15} strokeWidth={2.2} />
            </span>
            Cycle documentaire
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600">
                <FileCheck2 size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-slate-800">Ajoutez les PDF validés</p>
                <p className="text-[12.5px] text-slate-400">Protocoles, procédures et manuels internes.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600">
                <Database size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-slate-800">Indexation automatique</p>
                <p className="text-[12.5px] text-slate-400">Les contenus deviennent consultables par l'assistant IA.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-3.5 text-[12.5px] font-medium text-amber-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Les réponses de l'IA dépendent directement de la qualité et de l'actualité des documents indexés.
          </div>
        </aside>
      </div>
    </div>
  )
}