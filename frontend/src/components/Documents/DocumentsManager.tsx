import React, { useRef, useState } from 'react'
import { Document } from '../../types'
import { uploadDocument, deleteDocument } from '../../services/api'
import { AlertCircle, CheckCircle, Clock, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  documents: Document[]
  onRefresh: () => void
}

function fmt(bytes: number | null) {
  if (!bytes) return '?'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export default function DocumentsManager({ documents, onRefresh }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }

    setUploading(true)
    setError('')
    try {
      await uploadDocument(file)
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du téléversement.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    await deleteDocument(id)
    onRefresh()
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-blue-50 text-blue-600">
              <FileText size={15} strokeWidth={2.2} />
            </span>
            Base documentaire
          </h3>
          <p className="mt-1 pl-9 text-[12.5px] text-slate-400">PDF utilisés par l'assistant IA</p>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all active:scale-95 ${
            uploading
              ? 'bg-slate-100 text-slate-400'
              : 'bg-blue-600 text-white shadow-[0_2px_6px_-1px_rgba(37,99,235,0.4)] hover:bg-blue-700'
          }`}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Envoi...' : 'Ajouter PDF'}
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-500">
              <FileText size={17} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-slate-800">{doc.nom}</p>
              <p className="text-[12px] text-slate-400">
                {fmt(doc.taille)} · {format(new Date(doc.uploade_le), 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {doc.indexe ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-600">
                  <CheckCircle size={11} /> Indexé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600">
                  <Clock size={11} /> En cours
                </span>
              )}
              <button
                onClick={() => handleDelete(doc.id, doc.nom)}
                title="Supprimer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 opacity-100 transition-colors hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center">
            <FileText size={32} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
            <p className="text-[13.5px] font-medium text-slate-500">Aucun document</p>
            <p className="mt-1 text-[12.5px] text-slate-400">Ajoutez des PDF pour alimenter l'assistant IA.</p>
          </div>
        )}
      </div>
    </div>
  )
}