import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LiveSocketProvider } from './context/LiveSocketContext'
import LoginPage from './components/Auth/LoginPage'
import Navbar from './components/Dashboard/Navbar'
import Sidebar, { MobileNav } from './components/Dashboard/Sidebar'
import DashboardPage from './pages/DashboardPage'
import AdminSallesPage from './pages/AdminSallesPage'
import AlertesPage from './pages/AlertesPage'
import DocumentsPage from './pages/DocumentsPage'
import AssistantPage from './pages/AssistantPage'
import ProfilePage from './pages/ProfilePage'
import { getAlertes } from './services/api'

const LOGO = '../assets/favicon.ico';


function Logo({ size = 175 }: { size?: number }) {
  return (
      <img 
        src={LOGO} 
        alt="Logo" 
        width={size} 
        height={size} 
      />
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    // Re-keying on pathname remounts the matched route subtree so the
    // `.page-transition` entry animation replays on every navigation.
    // Chat state survives the remount because ChatInterface re-hydrates
    // from sessionStorage on mount (see ChatInterface.tsx).
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin/salles" element={<AdminSallesPage />} />
        <Route path="/alertes" element={<AlertesPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/profile" element={<ProfilePage />} />
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
    const t = setInterval(refreshAlertCount, 60000)
    return () => clearInterval(t)
  }, [user])

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden" style={{ background: '#ffffff' }}>
        <div className="relative text-center" style={{ color: '#111111' }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
            <Logo size={175} />
          </div>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">MedAssist AI · CHU Mohammed VI Oujda</p>
          <p className="mt-3 flex items-center justify-center gap-2 text-[13px]" style={{ color: 'rgba(17,17,17,0.4)' }}>
            <Loader2 size={14} className="animate-spin" />
            Chargement…
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  return (
    <LiveSocketProvider>
      {/* ── 3-column layout: nav top + [sidebar | main | right panel] ── */}
      {/* h-screen + overflow-hidden on the outer column makes the inner
          <main> the only vertical scroller, so the navbar stays locked. */}
      <div className="flex h-screen flex-col overflow-hidden" style={{ background: '#F5F5F7' }}>
        <Navbar alertCount={alertCount} />
        <div className="flex flex-1 overflow-hidden">
          {/* Left: fixed navigation sidebar */}
          <Sidebar alertCount={alertCount} />

          {/* Center: scrollable main content */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <AnimatedRoutes />
          </main>
        </div>

        {/* Mobile bottom navigation (hidden on md+) */}
        <MobileNav alertCount={alertCount} />
      </div>
    </LiveSocketProvider>
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