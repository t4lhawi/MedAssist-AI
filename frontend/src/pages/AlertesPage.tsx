import React, { useEffect, useState } from "react"
import { getAlertes } from "../services/api"
import { Alerte } from "../types"
import AlertsList from "../components/Alerts/AlertsList"

type FilterKey = "all" | "active" | "traitee"

/**
 * The Alerts page is now a thin state shell.
 *
 * - Owns the `filtre` state and the `alertes` array (no other page consumes them).
 * - Triggers a fetch whenever the filter changes.
 * - Hands everything off to <AlertsList />, which provides the new premium
 *   header, overview row, toolbar, grouped timeline, and details drawer.
 *
 * No backend, route, or type changes — same `getAlertes(traitee?)` call.
 */
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
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:px-6">
      <AlertsList
        alertes={alertes}
        onRefresh={load}
        variant={filtre === "active" ? "active" : filtre === "traitee" ? "processed" : "all"}
      />
    </div>
  )
}
