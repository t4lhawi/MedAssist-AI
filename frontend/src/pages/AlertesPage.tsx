import React, { useEffect, useState } from "react"
import { getAlertes } from "../services/api"
import { Alerte } from "../types"
import AlertsList from "../components/Alerts/AlertsList"

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
