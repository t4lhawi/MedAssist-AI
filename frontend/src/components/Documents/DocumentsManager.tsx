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
      setError('Seuls les fichiers PDF sont acceptes.')
      return
    }

    setUploading(true)
    setError('')
    try {
      await uploadDocument(file)
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du televersement.')
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <FileText size={18} className="text-primary" />
            Base documentaire
          </h3>
          <p className="mt-1 text-xs text-slate-500">PDF utilises par l'assistant IA</p>
        </div>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          uploading ? 'bg-slate-200 text-slate-500' : 'bg-primary text-white hover:bg-primary-dark'
        }`}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Envoi...' : 'Ajouter PDF'}
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {documents.map(doc => (
          <div key={doc.id} className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:border-slate-200 hover:bg-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
              <FileText size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{doc.nom}</p>
              <p className="text-xs text-slate-500">
                {fmt(doc.taille)} - {format(new Date(doc.uploade_le), 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {doc.indexe ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle size={11} /> Indexe
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                  <Clock size={11} /> En cours
                </span>
              )}
              <button
                onClick={() => handleDelete(doc.id, doc.nom)}
                title="Supprimer"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-danger md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <FileText size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Aucun document</p>
            <p className="mt-1 text-sm text-slate-400">Ajoutez des PDF pour alimenter l'assistant IA.</p>
          </div>
        )}
      </div>
    </div>
  )
}
