import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import AccessDenied from './AccessDenied'

/** Declarative guard for protected routes.
 *
 *  Usage in App.tsx:
 *    <Route path="/admin/salles" element={
 *      <RequireAuth can="canManageRooms" redirect="/">
 *        <AdminSallesPage />
 *      </RequireAuth>
 *    } />
 *
 *  - If the user is not logged in → redirect to /login.
 *  - If the permission check fails → render a 403 page in place.
 *  - Otherwise → render the children.
 */
export interface RequireAuthProps {
  /** Name of the boolean field on the Permissions object that must
   *  be true for access to be granted. */
  can?: keyof import('../../utils/permissions').Permissions
  /** Where to send unauthorized users. Default: '/'. */
  redirect?: string
  children: React.ReactNode
}

export default function RequireAuth({ can, redirect = '/', children }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const { permissions } = usePermissions()
  const location = useLocation()

  if (loading) return null // Layout already shows the splash; bail quietly.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (can && permissions[can] === false) {
    return <AccessDenied />
  }
  return <>{children}</>
}
