import React, { useEffect, useState } from "react"
import { getAlertes } from "../services/api"
import { Alerte } from "../types"
import PageHeader from "../components/ui/PageHeader"
import AlertsList from "../components/Alerts/AlertsList"

type FilterKey = "all" | "active" | "traitee"

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Toutes",
  active: "Actives",
  traitee: "Traitées",
}

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [filtre, setFiltre] = useState<FilterKey>("active")

  const load = async () => {
    const traitee = filtre === "all" ? undefined : filtre === "traitee"
    const r = await getAlertes(traitee as any)
    setAlertes(r.data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtre])

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#3B82F6' }}>
            Suivi des incidents
          </p>
          <h1 className="mt-0.5 text-[28px] font-semibold tracking-tight" style={{ color: '#111111' }}>
            Alertes
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: '#6B7280' }}>
            {alertes.length} alerte(s) affichée(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {alertes.filter(a => !a.traitee).length > 0 && (
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
              style={{ background: '#FEF3C7', color: '#D97706' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#F59E0B' }} />
              <span className="tabular-nums">{alertes.filter(a => !a.traitee).length}</span>
              <span>à traiter</span>
            </div>
          )}

          {/* Filter tabs */}
          <div
            className="inline-flex rounded-2xl p-1"
            style={{ background: '#F5F5F7' }}
          >
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className="rounded-xl px-4 py-1.5 text-[12.5px] font-medium transition-all"
                style={
                  filtre === f
                    ? { background: '#FFFFFF', color: '#111111', boxShadow: '0 1px 3px -1px rgba(17,17,17,0.1)' }
                    : { background: 'transparent', color: '#6B7280' }
                }
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div key={filtre} className="content-fade">
        <AlertsList
          alertes={alertes}
          onRefresh={load}
          variant={filtre === "active" ? "active" : filtre === "traitee" ? "processed" : "all"}
        />
      </div>
    </div>
  )
}