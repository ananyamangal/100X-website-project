"use client"

// Client-side RBAC — React context, hooks, and permission gate.
// Wrap the Growth OS layout with <AuthProvider>; use useAuth() in components.

import React, {
  createContext, useContext, useEffect, useState, useCallback
} from "react"
import type { SafeUser } from "./types"
import type { Permission } from "./permissions"

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: SafeUser | null
  permissions: Permission[]
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  permissions: [],
  loading: true,
  refresh: async () => {},
})

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<SafeUser | null>(null)
  const [permissions, setPerms]   = useState<Permission[]>([])
  const [loading, setLoading]     = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/me", { credentials: "same-origin" })
      if (!res.ok) {
        setUser(null)
        setPerms([])
        return
      }
      const data = await res.json() as { user: SafeUser }
      setUser(data.user)
      setPerms(data.user.permissions as Permission[])
    } catch {
      setUser(null)
      setPerms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <AuthContext.Provider value={{ user, permissions, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export function usePermission(permission: Permission): boolean {
  const { permissions } = useAuth()
  return permissions.includes(permission)
}

export function useAnyPermission(required: Permission[]): boolean {
  const { permissions } = useAuth()
  return required.some(p => permissions.includes(p))
}

export function useAllPermissions(required: Permission[]): boolean {
  const { permissions } = useAuth()
  return required.every(p => permissions.includes(p))
}

// ── PermissionGate component ──────────────────────────────────────────────────

interface PermissionGateProps {
  permission?: Permission
  anyOf?: Permission[]
  allOf?: Permission[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { permissions, loading } = useAuth()

  if (loading) return null

  let allowed = true

  if (permission) {
    allowed = permissions.includes(permission)
  } else if (anyOf) {
    allowed = anyOf.some(p => permissions.includes(p))
  } else if (allOf) {
    allowed = allOf.every(p => permissions.includes(p))
  }

  return allowed ? <>{children}</> : <>{fallback}</>
}
