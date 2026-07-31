// ─── Role-Based Access Control (frontend) ────────────────────────
// Centralized permission system. The UI NEVER checks roles directly
// (no `role === 'admin'` sprinkled across components). Instead, every
// gating decision goes through one of the `can*` helpers below.
//
// English identifiers here mirror the backend's canonical vocabulary
// (see backend/app/auth.py). French labels are exposed via
// `ROLE_LABELS_FR` for display in the UI only.

/** Canonical role identifiers — must match backend/app/auth.py. */
export const ROLES = {
  ADMIN: 'admin',
  HOSPITAL_STAFF: 'hospital_staff',
  VISITOR: 'visitor',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Human-readable French label for each role. */
export const ROLE_LABELS_FR: Record<Role, string> = {
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.HOSPITAL_STAFF]: 'Agent Hospitalier',
  [ROLES.VISITOR]: 'Visiteur / Patient',
}

/** French short label (used in compact UI elements). */
export const ROLE_SHORT_FR: Record<Role, string> = {
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.HOSPITAL_STAFF]: 'Agent hospitalier',
  [ROLES.VISITOR]: 'Visiteur',
}

/** The set of known role strings — used to validate unknown values
 *  coming back from the API (legacy rows may still surface). */
export const KNOWN_ROLES: readonly Role[] = Object.values(ROLES)

/** Defensive normalizer — accepts any value the API might return and
 *  returns a canonical Role. Falls back to VISITOR. */
export function normalizeRole(value: unknown): Role {
  const s = typeof value === 'string' ? value.toLowerCase().trim() : ''
  if (s === ROLES.ADMIN || s === 'administrateur' || s === 'administrator') {
    return ROLES.ADMIN
  }
  if (
    s === ROLES.HOSPITAL_STAFF ||
    s === 'technicien' ||
    s === 'soignant' ||
    s === 'staff' ||
    s === 'hospital_staff'
  ) {
    return ROLES.HOSPITAL_STAFF
  }
  return ROLES.VISITOR
}

// ─── Permission helpers ──────────────────────────────────────────
// Each `can*` returns a boolean. Components import only what they
// need — never `role === ...` checks. New permissions are added here
// so there's exactly one place to update when the matrix changes.

export interface Permissions {
  // Page-level access
  canViewDashboard: boolean            // legacy alias — true for everyone
  canViewLiveDashboard: boolean        // admin + hospital_staff
  canViewRestrictedDashboard: boolean  // visitor-style limited dashboard
  canViewAlertes: boolean
  canViewDocuments: boolean
  canViewAssistant: boolean
  canViewSalles: boolean          // /admin/salles
  canViewUsers: boolean           // /admin/utilisateurs (future)
  canViewEsp32: boolean           // /admin/esp32 (if added)
  canViewProfile: boolean         // always true for any authed user

  // Action-level
  canDeleteAlertes: boolean
  canMarkAlerteTreated: boolean
  canUploadDocuments: boolean
  canDeleteDocuments: boolean
  canRenameDocuments: boolean
  canManageRooms: boolean
  canManageDevices: boolean
  canManageUsers: boolean
  canAssignRoles: boolean
  canViewGlobalAlerts: boolean   // visitors are excluded
  canUseAssistant: boolean
  canViewAllHistory: boolean     // chat history view (own vs all)
}

/** Build a Permissions object from a normalized role. */
export function buildPermissions(role: Role | null | undefined): Permissions {
  const r = role ?? ROLES.VISITOR
  const isAdmin = r === ROLES.ADMIN
  const isStaff = r === ROLES.HOSPITAL_STAFF || isAdmin
  const isVisitor = r === ROLES.VISITOR

  return {
    // Pages
    canViewDashboard: true,            // everyone
    canViewLiveDashboard: isStaff,    // admin + hospital_staff
    canViewRestrictedDashboard: isVisitor,
    canViewAlertes: isStaff,
    canViewDocuments: isStaff,
    canViewAssistant: isStaff || isVisitor,
    canViewSalles: isAdmin,
    canViewUsers: isAdmin,
    canViewEsp32: isAdmin,
    canViewProfile: true,

    // Actions
    canDeleteAlertes: isAdmin,
    canMarkAlerteTreated: isStaff,
    canUploadDocuments: isAdmin,
    canDeleteDocuments: isAdmin,
    canRenameDocuments: isAdmin,
    canManageRooms: isAdmin,
    canManageDevices: isAdmin,
    canManageUsers: isAdmin,
    canAssignRoles: isAdmin,
    canViewGlobalAlerts: isStaff,
    canUseAssistant: isStaff || isVisitor,
    canViewAllHistory: true,           // own conversation history, always
  }
}

/** Get the role label in French for display. */
export function roleLabelFr(role: Role | null | undefined): string {
  return ROLE_LABELS_FR[normalizeRole(role)]
}
