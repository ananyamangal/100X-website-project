// Users a CRM lead can be assigned to (GET /api/crm/team, assignee validation in CRM routes).
// Lives in lib/rbac because it reads rbac_* collections; CRM code never touches lib/mongodb
// directly (static test in tests/unit/crm-static-guards.test.mjs).
//
// "Assignable" = an ACTIVE rbac_users row whose effective permissions (DB role row, else the code
// fallback in roles.ts; plus rbac_user_permissions and legacy custom/denied fields) include
// crm.leads.view_assigned or crm.leads.view_all, i.e. someone who could see the lead afterwards.
// Returns id + name only.

import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { ROLE_PERMISSIONS } from "./roles"
import type { RoleSlug } from "./types"

export interface AssignableUser {
  id: string
  name: string
}

export const ASSIGNABLE_PERMISSIONS: readonly string[] = ["crm.leads.view_assigned", "crm.leads.view_all"]

interface UserRow {
  _id: ObjectId | string
  name?: unknown
  email?: unknown
  role?: unknown
  isActive?: unknown
  customPermissions?: unknown
  deniedPermissions?: unknown
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

/** Pure: effective permission set from role base + overrides (same merge as engine.ts). */
export function mergeEffective(base: readonly string[], granted: readonly string[], denied: readonly string[]): Set<string> {
  const eff = new Set(base)
  for (const p of granted) eff.add(p)
  for (const p of denied) eff.delete(p)
  return eff
}

export async function listAssignableUsers(): Promise<AssignableUser[]> {
  const db = (await clientPromise).db()
  const users = (await db
    .collection("rbac_users")
    .find({ isActive: { $ne: false } }, { projection: { name: 1, email: 1, role: 1, isActive: 1, customPermissions: 1, deniedPermissions: 1 } })
    .limit(500)
    .toArray()) as UserRow[]
  if (users.length === 0) return []

  const roles = [...new Set(users.map(u => (typeof u.role === "string" ? u.role : "")).filter(Boolean))]
  const roleRows = await db
    .collection("rbac_role_permissions")
    .find({ roleSlug: { $in: roles } }, { projection: { roleSlug: 1, permissions: 1 } })
    .toArray()
  const roleBase = new Map<string, string[]>()
  for (const r of roles) roleBase.set(r, ROLE_PERMISSIONS[r as RoleSlug] ?? [])
  for (const row of roleRows) if (typeof row.roleSlug === "string" && Array.isArray(row.permissions)) roleBase.set(row.roleSlug, strings(row.permissions))

  const ids = users.map(u => String(u._id))
  const overrideRows = await db
    .collection("rbac_user_permissions")
    .find({ userId: { $in: ids } }, { projection: { userId: 1, grantedPermissions: 1, deniedPermissions: 1 } })
    .toArray()
  const overrides = new Map<string, { granted: string[]; denied: string[] }>()
  for (const o of overrideRows) overrides.set(String(o.userId), { granted: strings(o.grantedPermissions), denied: strings(o.deniedPermissions) })

  const out: AssignableUser[] = []
  for (const u of users) {
    const id = String(u._id)
    const role = typeof u.role === "string" ? u.role : ""
    const o = overrides.get(id)
    const eff = mergeEffective(
      roleBase.get(role) ?? [],
      [...(o?.granted ?? []), ...strings(u.customPermissions)],
      [...(o?.denied ?? []), ...strings(u.deniedPermissions)],
    )
    if (!ASSIGNABLE_PERMISSIONS.some(p => eff.has(p))) continue
    const name = typeof u.name === "string" && u.name.trim() ? u.name.trim() : typeof u.email === "string" ? u.email.split("@")[0] : "User"
    out.push({ id, name })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
