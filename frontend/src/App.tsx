import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Hospital, Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './components/Auth/LoginPage'
import Navbar from './components/Dashboard/Navbar'
import Sidebar from './components/Dashboard/Sidebar'
import DashboardPage from './pages/DashboardPage'
import CapteursPage from './pages/CapteursPage'
import AlertesPage from './pages/AlertesPage'
import DocumentsPage from './pages/DocumentsPage'
import AssistantPage from './pages/AssistantPage'
import { getAlertes } from './services/api'

function Layout() {
  const { user, loading } = useAuth()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const refreshAlertCount = () => {
      getAlertes(false)
        .then(r => setAlertCount(r.data.length))
        .catch(() => {})
    }

    refreshAlertCount()
    const t = setInterval(refreshAlertCount, 30000)
    return () => clearInterval(t)
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Hospital size={30} />
          </div>
          <p className="text-lg font-semibold">MedAssist AI</p>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-white/65">
            <Loader2 size={14} className="animate-spin" />
            Chargement...
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Navbar alertCount={alertCount} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-100 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/capteurs" element={<CapteursPage />} />
            <Route path="/alertes" element={<AlertesPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
