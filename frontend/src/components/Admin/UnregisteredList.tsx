import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, X, Check, Hash } from 'lucide-react'
import type { UnregisteredSource } from '../../types'
import { claimIp } from '../../services/api'
import { MONITORING_TYPES, getMonitoringType } from '../../monitoring'
import { SearchField, TextField } from '../ui/Field'

interface Props {
  sources: UnregisteredSource[]
  onClaimed: () => void
}

export default function UnregisteredList({ sources, onClaimed }: Props) {
  const [claimingIp, setClaimingIp] = useState<string | null>(null)
  const [salleDraft, setSalleDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return sources
    const q = query.trim().toLowerCase()
    return sources.filter(s => s.ip.toLowerCase().includes(q) || String(s.last_type || '').toLowerCase().includes(q))
  }, [sources, query])

  useEffect(() => {
    if (claimingIp) inputRef.current?.focus()
  }, [claimingIp])

  const openClaim = (ip: string) => {
    setClaimingIp(ip)
    setSalleDraft('')
    setError('')
  }

  const cancelClaim = () => {
    setClaimingIp(null)
    setError('')
  }

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claimingIp || !salleDraft.trim()) return
    setBusy(true)
    setError('')
    try {
      await claimIp({ ip: claimingIp, salle: salleDraft.trim() })
      setClaimingIp(null)
      onClaimed()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : "Réclamation impossible. Vérifiez que le nom correspond à la valeur #define SALLE du firmware.")
    } finally {
      setBusy(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') cancelClaim()
  }

  if (sources.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <h3 className="text-[14px] font-semibold text-amber-900">
          ESP32 non enregistrés
        </h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          {sources.length}
        </span>

        {sources.length > 5 && (
          <div className="ml-auto">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Filtrer par IP ou type…"
              className="w-56"
            />
          </div>
        )}
      </div>
      <p className="mb-3 text-[12.5px] text-amber-800/80">
        Ces IP ont publié des mesures mais ne sont pas (ou plus) associées à une salle.
        Réclamez-les pour que leurs données apparaissent dans la grille des salles.
      </p>

      <div className="overflow-x-auto rounded-xl border border-amber-200/60 bg-white">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="bg-amber-50/60 text-left text-[11.5px] font-medium uppercase tracking-wide text-amber-900/70">
            <tr>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Dernier type</th>
              <th className="px-3 py-2">Dernière mesure</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const meta = s.last_type ? getMonitoringType(String(s.last_type)) : null
              const isClaiming = claimingIp === s.ip
              return (
                <React.Fragment key={s.ip}>
                  <tr className={`border-t border-amber-100 ${isClaiming ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-3 py-2 font-mono text-[12.5px] text-slate-800">{s.ip}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {meta ? meta.title : (s.last_type || '—')}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {s.last_valeur !== null && s.last_valeur !== undefined
                        ? `${s.last_valeur} ${s.last_unite || ''}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{s.measurement_count}</td>
                    <td className="px-3 py-2 text-right">
                      {isClaiming ? (
                        <button
                          onClick={cancelClaim}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-200"
                        >
                          <X size={11} />
                          Annuler
                        </button>
                      ) : (
                        <button
                          onClick={() => openClaim(s.ip)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
                        >
                          Réclamer
                        </button>
                      )}
                    </td>
                  </tr>

                  {isClaiming && (
                    <tr className="border-t border-amber-100 bg-amber-50/40">
                      <td colSpan={5} className="px-3 py-3">
                        <form onSubmit={submitClaim} className="flex flex-wrap items-start gap-2">
                          <div className="min-w-[220px] flex-1">
                            <TextField
                              ref={inputRef}
                              value={salleDraft}
                              onChange={e => setSalleDraft(e.target.value)}
                              onKeyDown={handleKeyDown}
                              disabled={busy}
                              placeholder="Nom de la salle, ex : Salle 101"
                              leadingIcon={<Hash size={14} strokeWidth={2.2} />}
                              variant="amber"
                              error={error || null}
                              hint={`Doit correspondre exactement à la valeur #define SALLE du firmware pour l'IP ${s.ip}.`}
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={busy || !salleDraft.trim()}
                            className="mt-[26px] inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-2 text-[12.5px] font-medium text-white shadow-sm transition hover:bg-amber-700 active:scale-95 disabled:opacity-60"
                          >
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Confirmer
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-[12.5px] text-slate-400">
                  Aucune IP ne correspond à « {query} ».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11.5px] text-amber-800/70">
        Types de capteurs connus : {MONITORING_TYPES.map(m => m.title).join(', ')}.
      </p>
    </div>
  )
}