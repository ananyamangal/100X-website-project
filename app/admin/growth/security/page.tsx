"use client"
import Link from "next/link"
import { Shield, Monitor, Key, Clock, Users, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/rbac/client"

export default function SecurityPage() {
  const { user } = useAuth()
  const roleName = user?.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? ""
  const timeout  = user?.role === "super_admin" || user?.role === "growth_admin" ? "8 hours" : "4 hours"

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-brand-600" />
          <h1 className="text-sm font-bold text-gray-900">Security Settings</h1>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl space-y-4">

        {/* Identity panel */}
        {user && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Identity</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Name</span>
                <span className="font-semibold text-gray-800">{user.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Email</span>
                <span className="font-semibold text-gray-800">{user.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Role</span>
                <span className="font-semibold text-gray-800">{roleName}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Session Timeout</span>
                <span className="font-semibold text-gray-800">{timeout} inactivity</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              href:  "/admin/growth/security/sessions",
              icon:  Monitor,
              label: "Active Sessions",
              desc:  "View devices, IPs, and login times. Sign out individual sessions.",
              color: "text-blue-600 bg-blue-50",
            },
            {
              href:  "/admin/growth/security/sessions",
              icon:  Key,
              label: "Change Password",
              desc:  "Update your admin password.",
              color: "text-purple-600 bg-purple-50",
            },
            {
              href:  "/admin/growth/users",
              icon:  Users,
              label: "User Management",
              desc:  "Manage team members and their roles.",
              color: "text-green-600 bg-green-50",
            },
            {
              href:  "/admin/growth/audit/permissions",
              icon:  AlertTriangle,
              label: "Permission Audit",
              desc:  "Review effective permissions per user.",
              color: "text-amber-600 bg-amber-50",
            },
          ].map(item => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-brand-300 hover:shadow-md transition-all flex items-start gap-3 group"
            >
              <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Session policy info */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock size={12} />Session Policy
          </h2>
          <div className="space-y-2 text-xs">
            {[
              { role: "Super Admin",  timeout: "8 hours" },
              { role: "Growth Admin", timeout: "8 hours" },
              { role: "All others",   timeout: "4 hours" },
            ].map(row => (
              <div key={row.role} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{row.role}</span>
                <span className="text-gray-700 font-medium">{row.timeout} inactivity timeout</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            Sessions are verified every 5 minutes. Revoked sessions are invalidated within the next heartbeat.
          </p>
        </div>
      </div>
    </div>
  )
}
