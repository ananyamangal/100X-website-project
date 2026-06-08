"use client"

import { PermissionMatrix } from "@/components/admin/growth/PermissionMatrix"
import { PermissionGate } from "@/lib/rbac/client"
import { Shield } from "lucide-react"

export default function PermissionsPage() {
  return (
    <PermissionGate
      permission="permissions.view"
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-950">
          <div className="text-center">
            <Shield size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Access Denied</p>
            <p className="text-gray-600 text-sm mt-1">
              You don&apos;t have permission to view the Permission Matrix.
            </p>
          </div>
        </div>
      }
    >
      <PermissionMatrix />
    </PermissionGate>
  )
}
