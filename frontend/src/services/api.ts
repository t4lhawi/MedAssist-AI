import axios from 'axios'

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

export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password })
export const register = (nom: string, email: string, password: string) =>
  api.post('/api/auth/register', { nom, email, password })
export const getMe = () => api.get('/api/auth/me')

export const getCapteurs = () => api.get('/api/capteurs/')
export const createCapteur = (data: { nom: string; type: string; emplacement: string }) =>
  api.post('/api/capteurs/', data)

export const getMesures = (capteur_id?: number, limit = 100) =>
  api.get('/api/mesures/', { params: { capteur_id, limit } })

export const getAlertes = (traitee?: boolean) =>
  api.get('/api/alertes/', { params: { traitee } })
export const traiterAlerte = (id: number) => api.patch(`/api/alertes/${id}/traiter`)

export const getDocuments = () => api.get('/api/documents/')
export const uploadDocument = (file: File) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post('/api/documents/', fd)
}
export const deleteDocument = (id: number) => api.delete(`/api/documents/${id}`)

export const sendChat = (question: string, historique: {role: string; content: string}[]) =>
  api.post('/api/chat/', { question, historique })
export const getChatHistory = () => api.get('/api/chat/historique')
export const interpreterMesure = (type: string, valeur: number, unite: string, emplacement: string) =>
  api.post('/api/chat/interpreter', null, { params: { capteur_type: type, valeur, unite, emplacement } })

export default api