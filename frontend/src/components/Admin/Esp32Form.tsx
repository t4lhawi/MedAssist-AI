import React, { useState } from 'react'
import {
  CheckCircle2,
  CircleDot,
  Hash,
  Plus,
  Server,
  StickyNote,
} from 'lucide-react'
import { createEsp32 } from '../../services/api'
import { TextField } from '../ui/Field'
import Modal, { ModalBody, ModalButton, ModalFooter, ModalHeader } from '../ui/Modal'

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
        filled ? 'text-emerald-600' : 'text-[#6B7280] dark:text-text-secondary'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full transition-all duration-300 ${
          filled
            ? 'bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
            : 'bg-[#F5F5F7] text-[#9CA3AF] dark:text-text-muted'
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

  const reset = () => {
    setIp('')
    setSalle('')
    setNote('')
    setError('')
  }

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
      onCreated()
      // Auto-close after a brief confirmation flash
      setTimeout(() => {
        setJustSaved(false)
        setOpen(false)
        reset()
      }, 800)
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
    // Defer reset so the close animation doesn't show an empty form mid-flight
    setTimeout(reset, 220)
  }

  return (
    <>
      {/* Trigger button — appears in the toolbar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/add inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(17,17,17,0.4)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#1F1F23] hover:shadow-[0_6px_18px_-4px_rgba(17,17,17,0.45)] active:scale-[0.97]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 group-hover/add:rotate-90">
          <Plus size={12} strokeWidth={2.6} />
        </span>
        Enregistrer un ESP32
      </button>

      <Modal
        open={open}
        onClose={close}
        size="lg"
        dismissDisabled={saving}
        ariaLabel="Enregistrer un ESP32"
      >
        <form onSubmit={submit} className="flex max-h-[85vh] flex-col">
          <ModalHeader
            icon={<Server size={18} strokeWidth={2.2} />}
            iconTone="blue"
            title="Enregistrer un ESP32"
            subtitle="Saisissez l'IP du microcontrôleur et le nom de la salle à laquelle l'associer."
            onClose={close}
            closeDisabled={saving}
          />

          <ModalBody>
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

            <div className="mt-4">
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
            </div>

            {/* Validation steps */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-[#ECECEC] bg-[#FAFAFA] dark:bg-hover px-4 py-2.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-text-secondary">
                Validation
              </span>
              <span className="hidden h-3 w-px bg-[#ECECEC] sm:block" />
              <StepDot filled={ipValid} label="IP valide" />
              <StepDot filled={salleValid} label="Salle renseignée" />
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] font-medium text-red-600"
              >
                {error}
              </div>
            )}

            {justSaved && !error && (
              <div
                role="status"
                className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] font-medium text-emerald-700"
              >
                <CheckCircle2 size={14} strokeWidth={2.4} />
                ESP32 enregistré avec succès
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <ModalButton variant="secondary" onClick={close} disabled={saving}>
              Annuler
            </ModalButton>
            <ModalButton
              variant="primary"
              type="submit"
              loading={saving}
              disabled={!canSubmit}
              title={!canSubmit && !saving ? 'Renseignez une IP valide et un nom de salle' : undefined}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}
