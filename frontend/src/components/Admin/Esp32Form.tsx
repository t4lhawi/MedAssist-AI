import React, { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { createEsp32 } from '../../services/api'

interface Props {
  onCreated: () => void
}

export default function Esp32Form({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [ip, setIp] = useState('')
  const [salle, setSalle] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createEsp32({ ip: ip.trim(), salle: salle.trim(), note: note.trim() || undefined })
      setIp(''); setSalle(''); setNote('')
      setOpen(false)
      onCreated()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : "Impossible d'ajouter l'ESP32.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
      >
        <Plus size={14} />
        Ajouter un ESP32
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13.5px] font-semibold text-slate-800">Enregistrer un nouvel ESP32</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Adresse IP (IPv4)</span>
          <input
            value={ip}
            onChange={e => setIp(e.target.value)}
            placeholder="192.168.1.104"
            required
            pattern="^(\d{1,3}\.){3}\d{1,3}$"
            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-800 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Salle (nom)</span>
          <input
            value={salle}
            onChange={e => setSalle(e.target.value)}
            placeholder="Salle 101"
            required
            minLength={1}
            maxLength={100}
            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-800 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Note (optionnel)</span>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="CHIR-2, étage B…"
            maxLength={200}
            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-800 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] outline-none transition-shadow placeholder:text-slate-400 focus:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-colors hover:bg-slate-100"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </form>
  )
}
