import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  buildPermissions,
  normalizeRole,
  roleLabelFr,
  type Permissions,
  type Role,
} from '../utils/permissions'

/** Hook that returns the current user's role + a fully-resolved
 *  permission object. Components consume the boolean flags and never
 *  see the role string directly — this is the only place in the
 *  codebase where `role === ...` style checks are allowed, and the
 *  only such check is the trivial `isAdmin = r === 'admin'`
 *  inside `buildPermissions`.
 */
export function usePermissions(): {
  role: Role
  roleLabel: string
  permissions: Permissions
} {
  const { user } = useAuth()
  const role: Role = normalizeRole(user?.role)
  const permissions = useMemo(() => buildPermissions(role), [role])
  return {
    role,
    roleLabel: roleLabelFr(role),
    permissions,
  }
}
