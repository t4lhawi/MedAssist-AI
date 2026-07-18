import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './components/Auth/LoginPage'
import Navbar from './components/Dashboard/Navbar'
import Sidebar from './components/Dashboard/Sidebar'
import DashboardPage from './pages/DashboardPage'
import AdminSallesPage from './pages/AdminSallesPage'
import AlertesPage from './pages/AlertesPage'
import DocumentsPage from './pages/DocumentsPage'
import AssistantPage from './pages/AssistantPage'
import { getAlertes } from './services/api'

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4.5-3-8-6.5-8-10.5A5.5 5.5 0 0 1 9.5 5c1 0 2 .3 2.5 1 .5-.7 1.5-1 2.5-1A5.5 5.5 0 0 1 20 10.5c0 4-3.5 7.5-8 10.5Z" />
    </svg>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin/salles" element={<AdminSallesPage />} />
        <Route path="/alertes" element={<AlertesPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
      </Routes>
    </div>
  )
}

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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(37,99,235,0.2), transparent 50%)',
          }}
        />
        <div className="relative text-center text-white">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_4px_16px_-2px_rgba(37,99,235,0.5)]">
            <Logo size={26} />
          </div>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">MedAssist AI · CHU Mohammed VI Oujda</p>
          <p className="mt-3 flex items-center justify-center gap-2 text-[13px] text-white/45">
            <Loader2 size={14} className="animate-spin" />
            Chargement...
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Navbar alertCount={alertCount} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar alertCount={alertCount} />
        <main className="flex-1 overflow-y-auto bg-slate-50 pb-20 md:pb-0">
          <AnimatedRoutes />
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