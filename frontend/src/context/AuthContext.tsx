import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getMe, login as apiLogin } from '../services/api'
import { Utilisateur } from '../types'

interface AuthContextType {
  user: Utilisateur | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      getMe().then(r => setUser(r.data)).catch(() => logout()).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const r = await apiLogin(email, password)
    const t = r.data.access_token
    localStorage.setItem('token', t)
    setToken(t)
    const me = await getMe()
    setUser(me.data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    // Drop any persisted chat from the previous session so the next
    // user who opens this tab starts with an empty conversation.
    try { sessionStorage.removeItem('medassist:chat:v1') } catch {}
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)