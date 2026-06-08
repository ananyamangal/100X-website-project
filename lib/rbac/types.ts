import type { Permission, PermAction, PermGroup } from "./permissions"

// ── Role slugs ────────────────────────────────────────────────────────────────

export type RoleSlug =
  | "super_admin"
  | "growth_admin"
  | "seo_team"
  | "sales_manager"
  | "sales_executive"
  | "procurement_analyst"
  | "content_team"
  | "viewer"

// ── MongoDB document shapes ───────────────────────────────────────────────────

export interface DBUser {
  _id?: string
  email: string
  name: string
  passwordHash: string
  role: RoleSlug
  customPermissions: Permission[]
  deniedPermissions: Permission[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
  createdBy: string | null
  loginHistory: LoginEvent[]
}

export interface LoginEvent {
  ip: string
  userAgent: string
  timestamp: Date
  success: boolean
}

export interface DBRole {
  _id?: string
  slug: RoleSlug
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
}

// Permission registry entry (mirrors PermDef, stored in rbac_permissions)
export interface DBPermission {
  _id?: string
  key: string
  label: string
  description: string
  group: PermGroup
  subgroup?: string
  module: string
  action: PermAction
  critical: boolean
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Role → permission mapping (stored in rbac_role_permissions)
// Replaces hardcoded ROLE_PERMISSIONS for live updates
export interface DBRolePermissions {
  _id?: string
  roleSlug: RoleSlug
  permissions: Permission[]
  updatedAt: Date
  updatedBy: string | null
}

// Per-user permission overrides (stored in rbac_user_permissions)
export interface DBUserPermissions {
  _id?: string
  userId: string
  grantedPermissions: Permission[]   // additive beyond role
  deniedPermissions: Permission[]    // strip from role
  updatedAt: Date
  updatedBy: string | null
  notes?: string
}

export interface DBAuditLog {
  _id?: string
  userId: string | null
  userEmail: string
  action: AuditAction
  resource: string
  resourceId: string | null
  details: Record<string, unknown>
  ip: string
  userAgent: string
  timestamp: Date
}

export type AuditAction =
  | "login" | "logout" | "login_failed"
  | "export" | "delete" | "create" | "edit"
  | "permission_change" | "role_change"
  | "user_disabled" | "user_enabled"
  | "password_reset" | "seed"
  | "access_denied"
  | "session_revoked" | "force_logout" | "kill_all" | "session_expired"

// ── Active session document ───────────────────────────────────────────────────

export interface ActiveSession {
  _id?: string
  sessionId:    string
  userId:       string
  userEmail:    string
  userName:     string
  userRole:     string
  ip:           string
  userAgent:    string
  browser:      string
  os:           string
  deviceType:   "desktop" | "mobile" | "tablet"
  createdAt:    Date
  lastActivity: Date
  expiresAt:    Date
  isRevoked:    boolean
  revokedAt:    Date | null
  revokedBy:    string | null
  revokedReason: "logout" | "force_logout" | "kill_all" | "expired" | null
}

// ── JWT payload ───────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string
  email: string
  name: string
  role: RoleSlug
  permissions: Permission[]
  sessionId?: string
  iat: number
  exp: number
}

// ── Safe user shape returned to client ───────────────────────────────────────

export interface SafeUser {
  id: string
  email: string
  name: string
  role: RoleSlug
  permissions: Permission[]
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

// ── Permission resolution result ──────────────────────────────────────────────

export interface PermissionResolution {
  base: Permission[]          // from role template
  granted: Permission[]       // user-specific grants
  denied: Permission[]        // user-specific denials
  effective: Permission[]     // final computed set
}
