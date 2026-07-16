import axios from 'axios'
import type {
  Esp32Device,
  SalleStatus,
  UnregisteredSource,
  Alerte,
  Document,
} from '../types'

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Auth ───────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password })
export const register = (nom: string, email: string, password: string) =>
  api.post('/api/auth/register', { nom, email, password })
export const getMe = () => api.get('/api/auth/me')

// ─── Admin · ESP32 registry ────────────────────────────────────
export const listEsp32 = () => api.get<Esp32Device[]>('/api/admin/esp32/')
export const createEsp32 = (data: {
  ip: string
  salle: string
  note?: string
  actif?: boolean
}) => api.post<Esp32Device>('/api/admin/esp32/', data)
export const updateEsp32 = (
  id: number,
  data: Partial<{ salle: string; note: string; actif: boolean }>,
) => api.patch<Esp32Device>(`/api/admin/esp32/${id}`, data)
export const deleteEsp32 = (id: number) => api.delete(`/api/admin/esp32/${id}`)

// ─── Admin · Salle grid (consumed by /admin/salles) ─────────────
export const getSallesStatus = () => api.get<SalleStatus[]>('/api/admin/esp32/salles-status')
export const getUnregisteredSources = () =>
  api.get<UnregisteredSource[]>('/api/admin/esp32/unregistered')
export const claimIp = (data: { ip: string; salle: string; note?: string }) =>
  api.post<Esp32Device>('/api/admin/esp32/claim', data)

// ─── Mesures (legacy — kept for AlertesPage + dashboard chart) ─
export const getMesures = (params?: {
  esp32_id?: number
  type?: string
  salle?: string
  limit?: number
}) => api.get('/api/mesures/', { params: { ...(params || {}) } })

// ─── Alertes ────────────────────────────────────────────────────
export const getAlertes = (traitee?: boolean) =>
  api.get<Alerte[]>('/api/alertes/', { params: { traitee } })
export const traiterAlerte = (id: number) => api.patch(`/api/alertes/${id}/traiter`)

// ─── Documents ──────────────────────────────────────────────────
export const getDocuments = () => api.get<Document[]>('/api/documents/')
export const uploadDocument = (file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post('/api/documents/', fd)
}
export const deleteDocument = (id: number) => api.delete(`/api/documents/${id}`)

// ─── Chat ───────────────────────────────────────────────────────
export const sendChat = (
  question: string,
  historique: { role: string; content: string }[],
  signal?: AbortSignal,
) =>
  api.post('/api/chat/', { question, historique }, { signal })
export const getChatHistory = () => api.get('/api/chat/historique')
export const deleteChatHistory = () => api.delete('/api/chat/historique')
export const deleteChatHistoryItem = (id: number | string) =>
  api.delete(`/api/chat/historique/${id}`)
export const interpreterMesure = (
  type: string,
  valeur: number,
  unite: string,
  emplacement: string,
) =>
  api.post('/api/chat/interpreter', null, {
    params: { capteur_type: type, valeur, unite, emplacement },
  })

export default api
