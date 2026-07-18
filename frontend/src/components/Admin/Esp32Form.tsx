import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  CircleDot,
  Hash,
  Loader2,
  Plus,
  Server,
  StickyNote,
  X,
} from 'lucide-react'
import { createEsp32 } from '../../services/api'
import { TextField } from '../ui/Field'

interface Props {
  onCreated: () => void
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

function ipError(ip: string): string | null {
  if (!ip) return null
  const m = ip.match(IPV4_RE)
  if (!m) return 'Format attendu : 192.168.1.104'
  const invalidOctet = m.slice(1).some(part => Number(part) > 255)
  if (invalidOctet) return 'Chaque segment doit être compris entre 0 et 255'
  return null
}

/** Tiny badge showing whether a field requirement is filled. */
function StepDot({ filled, label }: { filled: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${
        filled ? 'text-emerald-600' : 'text-slate-400'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full transition-all duration-300 ${
          filled
            ? 'bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {filled ? <CheckCircle2 size={10} strokeWidth={2.8} /> : <CircleDot size={10} />}
      </span>
      {label}
    </span>
  )
}

export default function Esp32Form({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [ip, setIp] = useState('')
  const [salle, setSalle] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // Slight delay so the slide-in animation runs first
      const t = setTimeout(() => firstFieldRef.current?.focus(), 240)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const ipValidation = ipError(ip)
  const ipValid = !!ip && !ipValidation
  const salleValid = !!salle.trim()
  const canSubmit = ipValid && salleValid

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      await createEsp32({ ip: ip.trim(), salle: salle.trim(), note: note.trim() || undefined })
      setJustSaved(true)
      setIp('')
      setSalle('')
      setNote('')
      onCreated()
      setTimeout(() => {
        setJustSaved(false)
        setOpen(false)
      }, 1100)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : "Impossible d'ajouter l'ESP32. Vérifiez la connexion et réessayez.")
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (saving) return
    setOpen(false)
    setError('')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group/add inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.5)] transition-all duration-200 ease-out hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_6px_18px_-4px_rgba(37,99,235,0.55)] active:scale-95"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover/add:rotate-90">
          <Plus size={12} strokeWidth={2.6} />
        </span>
        Ajouter un ESP32
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] animate-field-in"
    >
      {/* Decorative gradient strip on the left edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-blue-400 to-indigo-500"
      />
      {/* Soft background blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-50/60 blur-2xl"
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="relative flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.45)]">
            <Server size={18} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-blue-600">
              Nouvel équipement
            </p>
            <h3 className="mt-0.5 text-[16px] font-semibold tracking-[-0.01em] text-slate-900">
              Enregistrer un ESP32
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Saisissez l'IP du microcontrôleur et le nom de la salle à laquelle l'associer.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer le formulaire"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-90"
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      </header>

      {/* ── Fields ──────────────────────────────────────────── */}
      <div className="relative space-y-4 px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Adresse IP (IPv4)"
            value={ip}
            onChange={e => setIp(e.target.value)}
            placeholder="192.168.1.104"
            required
            error={ipValidation}
            success={ipValid}
            leadingIcon={<Server size={14} strokeWidth={2.2} />}
            inputMode="numeric"
            autoComplete="off"
            ref={firstFieldRef}
            containerClassName="!mb-0"
            inputClassName="font-mono tracking-wider"
          />
          <TextField
            label="Salle (nom)"
            value={salle}
            onChange={e => setSalle(e.target.value)}
            placeholder="Salle 101"
            required
            minLength={1}
            maxLength={100}
            success={salleValid}
            leadingIcon={<Hash size={14} strokeWidth={2.2} />}
            containerClassName="!mb-0"
          />
        </div>

        <TextField
          label="Note (optionnel)"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ex. CHIR-2, étage B, salle d'urgences…"
          maxLength={200}
          leadingIcon={<StickyNote size={14} strokeWidth={2.2} />}
          hint="Une note interne pour identifier rapidement la salle (étage, service…)."
          containerClassName="!mb-0"
        />

        {/* ── Validation steps ────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Validation
          </span>
          <span className="hidden h-3 w-px bg-slate-200 sm:block" />
          <StepDot filled={ipValid} label="IP valide" />
          <StepDot filled={salleValid} label="Salle renseignée" />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600 animate-field-in">
            <X size={14} className="mt-0.5 shrink-0" strokeWidth={2.4} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-3">
        {justSaved ? (
          <span className="inline-flex animate-field-in items-center gap-1.5 text-[12.5px] font-semibold text-emerald-600">
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
              <CheckCircle2 size={18} strokeWidth={2.4} className="relative" />
            </span>
            ESP32 enregistré avec succès
          </span>
        ) : (
          <span className="text-[11.5px] text-slate-400">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500">
              ⏎
            </kbd>{' '}
            pour enregistrer ·{' '}
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500">
              Esc
            </kbd>{' '}
            pour fermer
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !canSubmit}
            title={!canSubmit && !saving ? 'Renseignez une IP valide et un nom de salle' : undefined}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.5)] transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_4px_14px_-2px_rgba(37,99,235,0.55)] active:scale-95 disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:shadow-none disabled:text-slate-400"
          >
            {saving ? (
              <>
                <Loader2 size={12} className="animate-spin" strokeWidth={2.6} />
                Enregistrement…
              </>
            ) : (
              <>
                <CheckCircle2 size={12} strokeWidth={2.6} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </footer>
    </form>
  )
}
