import React, { useRef, useState } from 'react'
import { Document } from '../../types'
import { deleteDocument, uploadDocument } from '../../services/api'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  documents: Document[]
  onRefresh: () => void
}

function fmt(bytes: number | null) {
  if (!bytes) return 'Taille inconnue'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function StatusBadge({ indexed }: { indexed: boolean }) {
  return indexed ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      <CheckCircle2 size={12} strokeWidth={2.2} />
      Indexé
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <Clock3 size={12} strokeWidth={2.2} />
      En cours
    </span>
  )
}

export default function DocumentsManager({ documents, onRefresh }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
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
      setDragging(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && !uploading) upload(file)
  }

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    await deleteDocument(id)
    onRefresh()
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-950">Base documentaire</h3>
            <p className="mt-0.5 text-[12.5px] text-slate-500">PDF utilisés par l'assistant IA</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:bg-slate-300"
            title="Ajouter un PDF"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} strokeWidth={2.2} />}
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[18rem_1fr]">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 lg:border-b-0 lg:border-r">
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-[13rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
              dragging
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50/40'
            } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
          >
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white">
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={21} strokeWidth={2} />}
            </span>
            <span className="text-[13.5px] font-semibold text-slate-800">
              {uploading ? 'Téléversement...' : 'Déposer un PDF'}
            </span>
            <span className="mt-1 text-[12.5px] leading-5 text-slate-500">
              ou cliquez pour choisir un fichier validé
            </span>
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-[12.5px] font-medium text-red-600">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          {documents.length === 0 ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <FileText size={24} strokeWidth={1.7} />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">Aucun document</p>
              <p className="mt-1 max-w-sm text-[12.5px] leading-5 text-slate-400">
                Ajoutez des protocoles, procédures ou manuels PDF pour alimenter l'assistant IA.
              </p>
            </div>
          ) : (
            <div className="max-h-[31rem] overflow-y-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
                <span>Document</span>
                <span className="hidden sm:block">Statut</span>
                <span className="sr-only">Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {documents.map(doc => (
                  <div key={doc.id} className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <FileText size={18} strokeWidth={2} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-800">{doc.nom}</p>
                      <p className="mt-0.5 text-[12px] text-slate-400">
                        {fmt(doc.taille)} · {format(new Date(doc.uploade_le), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden sm:inline-flex">
                        <StatusBadge indexed={doc.indexe} />
                      </span>
                      <button
                        onClick={() => handleDelete(doc.id, doc.nom)}
                        title="Supprimer"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 opacity-100 transition hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 size={14} strokeWidth={2.1} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
