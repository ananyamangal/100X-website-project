// Server-side RBAC helpers for API routes.
// Import from here in route handlers — never import jwt.ts or types.ts directly.

import { type NextRequest, NextResponse } from "next/server"
import { verifyJWT, SESSION_COOKIE } from "./jwt"
import { hasPermission } from "./roles"
import { isSessionRevoked } from "./sessions"
import type { JWTPayload, AuditAction, DBAuditLog } from "./types"
import type { Permission } from "./permissions"
import clientPromise from "@/lib/mongodb"

// ── Auth extraction ───────────────────────────────────────────────────────────

export async function getCurrentUser(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifyJWT(token)
  if (!payload) return null

  // Enforce session revocation: a session revoked in DB must be rejected
  // even if the JWT signature is still valid (JWT TTL up to 24h).
  if (payload.sessionId && await isSessionRevoked(payload.sessionId)) return null

  return payload
}

// ── Permission checking ───────────────────────────────────────────────────────

type AuthResult = { user: JWTPayload } | NextResponse

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return { user }
}

export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<AuthResult> {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!hasPermission(user.permissions, permission)) {
    return NextResponse.json(
      { error: "Forbidden", required: permission },
      { status: 403 }
    )
  }
  return { user }
}

export async function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): Promise<AuthResult> {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ok = permissions.some(p => hasPermission(user.permissions, p))
  if (!ok) {
    return NextResponse.json(
      { error: "Forbidden", required: permissions },
      { status: 403 }
    )
  }
  return { user }
}

// Helper: narrow type after permission check
export function isAuthResult(result: AuthResult): result is { user: JWTPayload } {
  return "user" in result
}

// ── Audit logging ─────────────────────────────────────────────────────────────

export async function writeAuditLog(
  user: JWTPayload | null,
  action: AuditAction,
  resource: string,
  details: Record<string, unknown> = {},
  request?: NextRequest
): Promise<void> {
  try {
    const client = await clientPromise
    const db     = client.db()
    const log: Omit<DBAuditLog, "_id"> = {
      userId:     user?.sub ?? null,
      userEmail:  user?.email ?? "anonymous",
      action,
      resource,
      resourceId: (details.id as string) ?? null,
      details,
      ip:         request?.headers.get("x-forwarded-for") ?? request?.headers.get("x-real-ip") ?? "unknown",
      userAgent:  request?.headers.get("user-agent") ?? "unknown",
      timestamp:  new Date(),
    }
    await db.collection("audit_logs").insertOne(log)
  } catch {
    // Audit log failures must never break the main request
  }
}
