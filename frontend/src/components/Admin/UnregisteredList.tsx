import React, { useMemo, useState } from 'react'
import { ArrowUpRight, Hash, Radar, Search, Server } from 'lucide-react'
import type { UnregisteredSource } from '../../types'
import { claimIp } from '../../services/api'
import { usePermissions } from '../../hooks/usePermissions'
import { MONITORING_TYPES, getMonitoringType } from '../../monitoring'
import { TextField } from '../ui/Field'
import Modal, { ModalBody, ModalButton, ModalFooter, ModalHeader } from '../ui/Modal'

interface Props {
  sources: UnregisteredSource[]
  onClaimed: () => void
}

export default function UnregisteredList({ sources, onClaimed }: Props) {
  const [claimingIp, setClaimingIp] = useState<string | null>(null)
  const [salleDraft, setSalleDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  // Claiming an unregistered IP is admin-only. The component is only
  // rendered on the admin salle page today, but the permission gate
  // makes it safe to drop on a read-only view in the future.
  const { permissions } = usePermissions()
  const canClaim = permissions.canManageDevices

  const filtered = useMemo(() => {
    if (!query.trim()) return sources
    const q = query.trim().toLowerCase()
    return sources.filter(
      s =>
        s.ip.toLowerCase().includes(q) ||
        String(s.last_type || '').toLowerCase().includes(q),
    )
  }, [sources, query])

  const openClaim = (ip: string) => {
    setClaimingIp(ip)
    setSalleDraft('')
    setNoteDraft('')
    setError('')
  }

  const cancelClaim = () => {
    if (busy) return
    setClaimingIp(null)
    setError('')
  }

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claimingIp || !salleDraft.trim()) return
    setBusy(true)
    setError('')
    try {
      await claimIp({ ip: claimingIp, salle: salleDraft.trim(), note: noteDraft.trim() || undefined })
      setClaimingIp(null)
      onClaimed()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : "Réclamation impossible. Vérifiez que le nom correspond à la valeur #define SALLE du firmware.",
      )
    } finally {
      setBusy(false)
    }
  }

  // Don't render the panel at all when there are no unknown devices
  if (sources.length === 0) return null

  const claimingSource = sources.find(s => s.ip === claimingIp) ?? null

  return (
    <section
      aria-label="ESP32 non enregistrés"
      className="overflow-hidden rounded-3xl border border-amber-200/70 bg-white dark:bg-card shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_24px_-12px_rgba(245,158,11,0.18)]"
    >
      {/* Header strip — amber accent */}
      <div className="flex flex-wrap items-center gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-transparent px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Radar size={16} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-text-primary">
              ESP32 non enregistrés
            </h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 tabular-nums">
              {sources.length}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-[#6B7280] dark:text-text-secondary">
            Ces IP ont publié des mesures mais ne sont pas (ou plus) associées à une salle. Réclamez-les pour
            afficher leurs données dans la grille.
          </p>
        </div>

        {sources.length > 3 && (
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Search
              size={13}
              strokeWidth={2.2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-text-muted"
            />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filtrer par IP ou type…"
              className="w-full rounded-full border border-transparent bg-[#F5F5F7] py-1.5 pl-8 pr-3 text-[12.5px] text-[#111111] dark:text-text-primary outline-none placeholder:text-[#9CA3AF] dark:text-text-muted transition-colors duration-200 focus:bg-white dark:bg-card focus:border-[#FCD34D] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
            />
          </div>
        )}
      </div>

      {/* Discovery list */}
      <ul className="divide-y divide-[#F0F0F0]">
        {filtered.map(s => {
          const meta = s.last_type ? getMonitoringType(String(s.last_type)) : null
          const Icon = meta?.icon ?? Server
          return (
            <li
              key={s.ip}
              className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors duration-200 hover:bg-[#FAFAFA] dark:bg-hover dark:hover:bg-hover"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5F5F7] text-[#6B7280] dark:text-text-secondary">
                <Icon size={16} strokeWidth={2.2} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13.5px] font-semibold tracking-tight text-[#111111] dark:text-text-primary">
                    {s.ip}
                  </span>
                  <span className="rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[11px] font-medium text-[#6B7280] dark:text-text-secondary">
                    {meta ? meta.title : (s.last_type || 'Inconnu')}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#6B7280] dark:text-text-secondary">
                  <span>
                    Dernière mesure :{' '}
                    <span className="font-medium text-[#374151] dark:text-text-secondary">
                      {s.last_valeur !== null && s.last_valeur !== undefined
                        ? `${s.last_valeur} ${s.last_unite || ''}`
                        : '—'}
                    </span>
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-[#D1D5DB] sm:inline-block" />
                  <span>
                    Total :{' '}
                    <span className="font-medium text-[#374151] dark:text-text-secondary tabular-nums">
                      {s.measurement_count}
                    </span>{' '}
                    mesure{s.measurement_count > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {canClaim && (
                <button
                  type="button"
                  onClick={() => openClaim(s.ip)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(17,17,17,0.35)] transition-all duration-200 hover:-translate-y-px hover:bg-[#1F1F23] active:scale-[0.97]"
                >
                  Réclamer
                  <ArrowUpRight size={12} strokeWidth={2.6} />
                </button>
              )}
            </li>
          )
        })}

        {filtered.length === 0 && (
          <li className="px-6 py-8 text-center text-[12.5px] text-[#6B7280] dark:text-text-secondary">
            Aucune IP ne correspond à « {query} ».
          </li>
        )}
      </ul>

      <div className="border-t border-[#F0F0F0] bg-[#FAFAFA] dark:bg-hover px-6 py-3 text-[11.5px] text-[#6B7280] dark:text-text-secondary">
        Types de capteurs connus :{' '}
        <span className="font-medium text-[#374151] dark:text-text-secondary">
          {MONITORING_TYPES.map(m => m.title).join(', ')}
        </span>
        .
      </div>

      {/* ── Claim modal ─────────────────────────────────────── */}
      <Modal
        open={!!claimingSource}
        onClose={cancelClaim}
        size="md"
        dismissDisabled={busy}
        ariaLabel="Réclamer un ESP32 inconnu"
      >
        <form onSubmit={submitClaim} className="flex max-h-[85vh] flex-col">
          <ModalHeader
            icon={<Server size={18} strokeWidth={2.2} />}
            iconTone="amber"
            title="Réclamer cet ESP32"
            subtitle="Associez cette IP à une salle pour récupérer ses mesures historiques."
            onClose={cancelClaim}
            closeDisabled={busy}
          />

          <ModalBody>
            {/* IP summary */}
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#ECECEC] bg-[#FAFAFA] dark:bg-hover px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-card text-[#6B7280] dark:text-text-secondary shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
                <Server size={14} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[13.5px] font-semibold tracking-tight text-[#111111] dark:text-text-primary">
                  {claimingSource?.ip}
                </p>
                <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-text-secondary">
                  {claimingSource?.measurement_count ?? 0} mesure
                  {(claimingSource?.measurement_count ?? 0) > 1 ? 's' : ''} reçue
                  {(claimingSource?.measurement_count ?? 0) > 1 ? 's' : ''} · dernière valeur :{' '}
                  <span className="font-medium text-[#374151] dark:text-text-secondary">
                    {claimingSource?.last_valeur !== null && claimingSource?.last_valeur !== undefined
                      ? `${claimingSource.last_valeur} ${claimingSource.last_unite || ''}`
                      : '—'}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <TextField
                label="Nom de la salle"
                value={salleDraft}
                onChange={e => setSalleDraft(e.target.value)}
                placeholder="Ex. Salle 101"
                required
                maxLength={100}
                leadingIcon={<Hash size={14} strokeWidth={2.2} />}
                hint={`Doit correspondre exactement à la valeur #define SALLE du firmware pour l'IP ${claimingSource?.ip ?? ''}.`}
                containerClassName="!mb-0"
                autoFocus
              />
              <TextField
                label="Note (optionnel)"
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder="Ex. CHIR-2, étage B…"
                maxLength={200}
                containerClassName="!mb-0"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] font-medium text-red-600"
              >
                {error}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <ModalButton variant="secondary" onClick={cancelClaim} disabled={busy}>
              Annuler
            </ModalButton>
            <ModalButton
              variant="primary"
              type="submit"
              loading={busy}
              disabled={!salleDraft.trim()}
            >
              Réclamer
            </ModalButton>
          </ModalFooter>
        </form>
      </Modal>
    </section>
  )
}
