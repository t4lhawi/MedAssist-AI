import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { UnregisteredSource } from '../../types'
import { claimIp } from '../../services/api'
import { MONITORING_TYPES, getMonitoringType } from '../../monitoring'

interface Props {
  sources: UnregisteredSource[]
  onClaimed: () => void
}

export default function UnregisteredList({ sources, onClaimed }: Props) {
  const [busyIp, setBusyIp] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleClaim = async (ip: string) => {
    const salle = window.prompt(
      `Réclamer l'IP ${ip}.\nEntrez le nom de la salle (doit correspondre à la valeur #define SALLE du firmware) :`,
    )
    if (!salle || !salle.trim()) return
    setBusyIp(ip)
    setError('')
    try {
      await claimIp({ ip, salle: salle.trim() })
      onClaimed()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Réclamation impossible.')
    } finally {
      setBusyIp(null)
    }
  }

  if (sources.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <h3 className="text-[14px] font-semibold text-amber-900">
          ESP32 non enregistrés
        </h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          {sources.length}
        </span>
      </div>
      <p className="mb-3 text-[12.5px] text-amber-800/80">
        Ces IP ont publié des mesures mais ne sont pas (ou plus) associées à une salle.
        Réclamez-les pour que leurs données apparaissent dans la grille des salles.
      </p>

      <div className="overflow-hidden rounded-xl border border-amber-200/60 bg-white">
        <table className="w-full text-[13px]">
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
            {sources.map(s => {
              const meta = s.last_type ? getMonitoringType(String(s.last_type)) : null
              return (
                <tr key={s.ip} className="border-t border-amber-100">
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
                    <button
                      onClick={() => handleClaim(s.ip)}
                      disabled={busyIp === s.ip}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-60"
                    >
                      {busyIp === s.ip && <Loader2 size={11} className="animate-spin" />}
                      Réclamer
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-[12.5px] font-medium text-red-600">{error}</p>}

      {/* Type-aware hint */}
      <p className="mt-3 text-[11.5px] text-amber-800/70">
        Types de capteurs connus : {MONITORING_TYPES.map(m => m.title).join(', ')}.
      </p>
    </div>
  )
}
