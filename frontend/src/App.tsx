import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LiveSocketProvider, useLiveSocket } from './context/LiveSocketContext'
import LoginPage from './components/Auth/LoginPage'
import RequireAuth from './components/Auth/RequireAuth'
import Navbar from './components/Dashboard/Navbar'
import Sidebar, { MobileNav } from './components/Dashboard/Sidebar'
import DashboardPage from './pages/DashboardPage'
import AdminSallesPage from './pages/AdminSallesPage'
import AlertesPage from './pages/AlertesPage'
import DocumentsPage from './pages/DocumentsPage'
import AssistantPage from './pages/AssistantPage'
import ProfilePage from './pages/ProfilePage'
import { getAlertes } from './services/api'
import { usePermissions } from './hooks/usePermissions'

const LOGO = '/favicon.ico';


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
        {/* Dashboard — open to every authenticated user. Visitors see
            a restricted view of the dashboard (see DashboardPage). */}
        <Route path="/" element={
          <RequireAuth can="canViewDashboard">
            <DashboardPage />
          </RequireAuth>
        } />

        {/* Admin · Gestion des salles (admin only). */}
        <Route path="/admin/salles" element={
          <RequireAuth can="canViewSalles">
            <AdminSallesPage />
          </RequireAuth>
        } />

        {/* Alertes — staff + admin (visitors are excluded). */}
        <Route path="/alertes" element={
          <RequireAuth can="canViewAlertes">
            <AlertesPage />
          </RequireAuth>
        } />

        {/* Documents — staff + admin. Visitors can't read the
            knowledge base directly; they query it via the assistant. */}
        <Route path="/documents" element={
          <RequireAuth can="canViewDocuments">
            <DocumentsPage />
          </RequireAuth>
        } />

        {/* Assistant — open to staff, admin, and visitors. */}
        <Route path="/assistant" element={
          <RequireAuth can="canViewAssistant">
            <AssistantPage />
          </RequireAuth>
        } />

        {/* Profile — every authenticated user. */}
        <Route path="/profile" element={
          <RequireAuth can="canViewProfile">
            <ProfilePage />
          </RequireAuth>
        } />

        {/* Any unknown path inside the app shell: send the user to
            their dashboard. Unauthorized navigations are caught by
            ``RequireAuth`` before this fallback fires. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function LiveAlertCountSync({ onNewAlert }: { onNewAlert: () => void }) {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const { onAlerte } = useLiveSocket()

  useEffect(() => {
    if (!user || !permissions.canViewAlertes) return
    return onAlerte((data) => {
      if (!data.traitee) onNewAlert()
    })
  }, [user, permissions.canViewAlertes, onAlerte, onNewAlert])

  return null
}

function Layout() {
  const { user, loading } = useAuth()
  const { permissions } = usePermissions()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    if (!user) return
    // Visitors don't have access to the alertes endpoint — skip the
    // polling entirely so we don't keep 403-ing in the background.
    if (!permissions.canViewAlertes) {
      setAlertCount(0)
      return
    }

    const refreshAlertCount = () => {
      getAlertes(false)
        .then(r => setAlertCount(r.data.length))
        .catch(() => {})
    }

    refreshAlertCount()
    const t = setInterval(refreshAlertCount, 300000)
    return () => clearInterval(t)
  }, [user, permissions.canViewAlertes])

  if (loading) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
        style={{ background: 'var(--bg-main)' }}
      >
        <div className="relative text-center" style={{ color: 'var(--text-primary)' }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
            <Logo size={175} />
          </div>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">MedAssist AI · CHU Mohammed VI Oujda</p>
          <p
            className="mt-3 flex items-center justify-center gap-2 text-[13px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Loader2 size={14} className="animate-spin" />
            Chargement…
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  // Visitors get a slim header + assistant-only experience; we hide
  // the full sidebar because they only have a single nav entry. The
  // mobile bottom nav still renders (it now shows just Assistant + Logout).
  const showSidebar = permissions.canViewLiveDashboard

  return (
    <LiveSocketProvider>
      <LiveAlertCountSync onNewAlert={() => setAlertCount(count => count + 1)} />
      {/* ── 3-column layout: nav top + [sidebar | main | right panel] ── */}
      {/* h-screen + overflow-hidden on the outer column makes the inner
          <main> the only vertical scroller, so the navbar stays locked. */}
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <Navbar alertCount={alertCount} />
        <div className="flex flex-1 overflow-hidden">
          {/* Left: fixed navigation sidebar — hidden for visitors since
              they only have a single nav entry (Assistant IA). */}
          {showSidebar && <Sidebar alertCount={alertCount} />}

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