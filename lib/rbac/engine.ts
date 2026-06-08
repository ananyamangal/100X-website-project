// DB-backed permission resolution engine.
// Priority: rbac_role_permissions (DB) > ROLE_PERMISSIONS (code fallback)
// User overrides: rbac_user_permissions (DB) merged over role base.
// Result is embedded in the JWT at login — no DB hit per request.

import clientPromise from "@/lib/mongodb"
import { ROLE_PERMISSIONS } from "./roles"
import type { RoleSlug, PermissionResolution, DBRolePermissions, DBUserPermissions } from "./types"
import type { Permission } from "./permissions"

// ── Core resolution ───────────────────────────────────────────────────────────

export async function resolveEffectivePermissions(
  userId: string,
  roleSlug: RoleSlug
): Promise<PermissionResolution> {
  const db = (await clientPromise).db()

  // 1. Role base — DB first, code fallback
  const dbRolePerms = await db
    .collection<DBRolePermissions>("rbac_role_permissions")
    .findOne({ roleSlug })

  const base: Permission[] = dbRolePerms?.permissions ?? ROLE_PERMISSIONS[roleSlug] ?? []

  // 2. User overrides
  let granted: Permission[] = []
  let denied: Permission[] = []

  if (userId && userId !== "legacy-super-admin") {
    const dbUserPerms = await db
      .collection<DBUserPermissions>("rbac_user_permissions")
      .findOne({ userId })

    // Also read legacy fields from rbac_users for backward compat
    const userDoc = await db.collection("rbac_users").findOne(
      { _id: { $exists: true }, email: { $exists: true } },
      { projection: { customPermissions: 1, deniedPermissions: 1 } }
    )

    granted = [
      ...(dbUserPerms?.grantedPermissions ?? []),
      ...(userDoc?.customPermissions ?? []),
    ]
    denied = [
      ...(dbUserPerms?.deniedPermissions ?? []),
      ...(userDoc?.deniedPermissions ?? []),
    ]
  }

  // 3. Merge
  const effective = new Set(base)
  for (const p of granted) effective.add(p)
  for (const p of denied) effective.delete(p)

  return {
    base,
    granted: [...new Set(granted)],
    denied:  [...new Set(denied)],
    effective: Array.from(effective),
  }
}

// Convenience: just get the effective list (used at JWT issue time)
export async function getEffectivePermissions(
  userId: string,
  roleSlug: RoleSlug
): Promise<Permission[]> {
  const { effective } = await resolveEffectivePermissions(userId, roleSlug)
  return effective
}

// ── Role permission helpers ───────────────────────────────────────────────────

export async function getRolePermissions(roleSlug: RoleSlug): Promise<Permission[]> {
  const db = (await clientPromise).db()
  const doc = await db
    .collection<DBRolePermissions>("rbac_role_permissions")
    .findOne({ roleSlug })
  return doc?.permissions ?? ROLE_PERMISSIONS[roleSlug] ?? []
}

export async function setRolePermissions(
  roleSlug: RoleSlug,
  permissions: Permission[],
  updatedBy: string | null
): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("rbac_role_permissions").updateOne(
    { roleSlug },
    {
      $set: { permissions, updatedAt: new Date(), updatedBy },
      $setOnInsert: { roleSlug },
    },
    { upsert: true }
  )
}

// ── User permission override helpers ─────────────────────────────────────────

export async function getUserOverrides(userId: string): Promise<DBUserPermissions | null> {
  const db = (await clientPromise).db()
  return db
    .collection<DBUserPermissions>("rbac_user_permissions")
    .findOne({ userId })
}

export async function setUserOverrides(
  userId: string,
  granted: Permission[],
  denied: Permission[],
  updatedBy: string | null,
  notes?: string
): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("rbac_user_permissions").updateOne(
    { userId },
    {
      $set: {
        grantedPermissions: [...new Set(granted)],
        deniedPermissions:  [...new Set(denied)],
        updatedAt: new Date(),
        updatedBy,
        ...(notes !== undefined ? { notes } : {}),
      },
      $setOnInsert: { userId },
    },
    { upsert: true }
  )
}
