import { useCallback, useState } from 'react'
import {
  getSallesStatus,
  updateEsp32,
  deleteEsp32,
} from '../services/api'
import type { SalleStatus } from '../types'

/**
 * useSalles — orchestrates ESP32/salle mutations.
 *
 * The AdminSallesPage already manages its own list/loading state with
 * getSallesStatus(); this hook is for components (e.g. Dashboard/SalleCard)
 * that need imperative rename/activate/delete on a single salle without
 * owning the full list. They call `refreshSalles()` afterwards to refetch.
 */
export function useSalles() {
  const [salles, setSalles] = useState<SalleStatus[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)

  const refreshSalles = useCallback(async () => {
    try {
      const r = await getSallesStatus()
      setSalles(r.data)
    } catch {
      // keep previous data; let the caller surface a toast
    }
  }, [])

  const renameSalle = useCallback(async (id: number, name: string) => {
    setBusyId(id)
    try {
      await updateEsp32(id, { salle: name })
    } finally {
      setBusyId(null)
    }
  }, [])

  const toggleActif = useCallback(async (id: number, actif?: boolean) => {
    setBusyId(id)
    try {
      await updateEsp32(id, { actif: actif ?? true })
    } finally {
      setBusyId(null)
    }
  }, [])

  const deleteSalle = useCallback(async (id: number) => {
    setBusyId(id)
    try {
      await deleteEsp32(id)
    } finally {
      setBusyId(null)
    }
  }, [])

  return { salles, busyId, refreshSalles, renameSalle, toggleActif, deleteSalle }
}
