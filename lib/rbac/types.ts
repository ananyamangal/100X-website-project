import type { Permission } from "./permissions"

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
  customPermissions: Permission[]   // additive beyond role defaults
  deniedPermissions: Permission[]   // strip from role defaults
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
  createdBy: string | null          // userId of creator
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
  isSystem: boolean                 // system roles cannot be deleted
  createdAt: Date
  updatedAt: Date
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
  | "login"
  | "logout"
  | "login_failed"
  | "export"
  | "delete"
  | "create"
  | "edit"
  | "permission_change"
  | "role_change"
  | "user_disabled"
  | "user_enabled"
  | "password_reset"
  | "seed"

// ── JWT payload stored in the admin-token cookie ─────────────────────────────

export interface JWTPayload {
  sub: string           // userId (string representation of _id)
  email: string
  name: string
  role: RoleSlug
  permissions: Permission[]
  iat: number
  exp: number
}

// ── Safe user shape returned to client (no password hash) ────────────────────

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
