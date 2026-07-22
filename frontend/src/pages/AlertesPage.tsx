import React, { useEffect, useState } from "react"
import { getAlertes } from "../services/api"
import { Alerte } from "../types"
import AlertsList from "../components/Alerts/AlertsList"

/**
 * The Alerts page is now a thin state shell.
 *
 * - Fetches the *full* alerts list once and lets <AlertsList /> apply
 *   the "Toutes / Actives / Traitées" filter client-side.
 * - Hands everything off to <AlertsList />, which provides the premium
 *   header, overview row, toolbar, grouped timeline, and details drawer.
 *
 * Why fetch everything instead of slicing via ``?traitee=`` server-side?
 * The stat cards above the list (alertes critiques / attention / info /
 * traitées aujourd'hui) need to reflect the global picture at all
 * times — if the page re-fetched a slice, switching to "Traitées" would
 * zero out the active counters and the user would see the stats
 * jump around as they toggled filters. Fetching once keeps the stats
 * stable while the user explores the list below.
 */
export default function AlertesPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([])

  const load = async () => {
    const r = await getAlertes()
    setAlertes(r.data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:px-6">
      <AlertsList
        alertes={alertes}
        onRefresh={load}
        variant="active"
      />
    </div>
  )
}
