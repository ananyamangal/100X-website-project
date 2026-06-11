import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/rbac/server"
import type { SafeUser } from "@/lib/rbac/types"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const safe: SafeUser = {
    id:                 user.sub,
    email:              user.email,
    name:               user.name,
    role:               user.role,
    permissions:        user.permissions,
    isActive:           true,
    createdAt:          new Date(user.iat * 1000).toISOString(),
    lastLoginAt:        null,
    passwordChangedAt:  null,
    failedLoginCount:   0,
    lockedAt:           null,
  }

  return NextResponse.json({ user: safe })
}
