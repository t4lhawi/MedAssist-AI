import React, { useRef, useState } from 'react'
import { Document } from '../../types'
import { uploadDocument, deleteDocument } from '../../services/api'
import { FileText, Upload, Trash2, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props { documents: Document[]; onRefresh: () => void }

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
    if (!file.name.endsWith('.pdf')) { setError('Seuls les PDF sont acceptés'); return }
    setUploading(true); setError('')
    try {
      await uploadDocument(file)
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du téléversement')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    await deleteDocument(id); onRefresh()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <FileText size={18} /> Base documentaire
        </h3>
        <label className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg cursor-pointer transition
          ${uploading ? 'bg-gray-300 text-gray-500' : 'bg-primary text-white hover:bg-primary-dark'}`}>
          <Upload size={14} />
          {uploading ? 'Téléversement...' : 'Ajouter PDF'}
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {documents.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
            <FileText size={20} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">{doc.nom}</p>
              <p className="text-xs text-gray-400">
                {fmt(doc.taille)} · {format(new Date(doc.uploade_le), 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {doc.indexe
                ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle size={10} /> Indexé
                  </span>
                : <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    <Clock size={10} /> En cours…
                  </span>
              }
              <button onClick={() => handleDelete(doc.id, doc.nom)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition p-1">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <FileText size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun document. Téléversez des PDF pour alimenter l'assistant IA.</p>
          </div>
        )}
      </div>
    </div>
  )
}