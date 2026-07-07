import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './components/Auth/LoginPage'
import Navbar from './components/Dashboard/Navbar'
import Sidebar from './components/Dashboard/Sidebar'
import DashboardPage from './pages/DashboardPage'
import CapteursPage from './pages/CapteursPage'
import AlertesPage from './pages/AlertesPage'
import DocumentsPage from './pages/DocumentsPage'
import AssistantPage from './pages/AssistantPage'
import { useEffect, useState } from 'react'
import { getAlertes } from './services/api'

function Layout() {
  const { user, loading } = useAuth()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    if (user) {
      getAlertes(false).then(r => setAlertCount(r.data.length)).catch(() => {})
      const t = setInterval(() => {
        getAlertes(false).then(r => setAlertCount(r.data.length)).catch(() => {})
      }, 30000)
      return () => clearInterval(t)
    }
  }, [user])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">🏥</div>
        <p className="text-lg font-semibold">MedAssist AI</p>
        <p className="text-sm opacity-60 mt-1">Chargement…</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" />

  return (
    <div className="flex flex-col h-screen">
      <Navbar alertCount={alertCount} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
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
