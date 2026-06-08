"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, Search, Bot, Radar, Lightbulb, FileText,
  Users, ShoppingBag, Megaphone, Settings2, ScrollText,
  BarChart2, TrendingUp, ArrowLeft, Zap, Plug,
  PanelLeftClose, PanelLeftOpen, UserCog, LogOut, ShieldCheck, ClipboardList,
} from "lucide-react"
import { useAuth } from "@/lib/rbac/client"
import type { Permission } from "@/lib/rbac/permissions"
import { MODULE_PERMISSIONS } from "@/lib/rbac/permissions"

interface Module {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string | null
  sub?: boolean
  permission: Permission
}

const MODULES: Module[] = [
  { href: "/admin/growth/dashboard",        label: "Executive Dashboard",  icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/admin/growth/seo",              label: "SEO Command Center",   icon: Search,          permission: "seo.view" },
  { href: "/admin/growth/seo/setup",        label: "↳ Search Console",     icon: Plug,            permission: "seo.view",         sub: true },
  { href: "/admin/growth/analytics",        label: "GA4 Analytics",        icon: BarChart2,       permission: "analytics.view" },
  { href: "/admin/growth/analytics/setup",  label: "↳ Analytics Setup",    icon: Plug,            permission: "analytics.view",   sub: true },
  { href: "/admin/growth/geo",              label: "GEO / AI Search",      icon: Bot,             permission: "geo.view" },
  { href: "/admin/growth/competitors",      label: "Competitor Intel",     icon: Radar,           permission: "competitors.view" },
  { href: "/admin/growth/opportunities",    label: "Opportunity Engine",   icon: Lightbulb,       permission: "opportunities.view", badge: "NEW" },
  { href: "/admin/growth/content",          label: "Content Factory",      icon: FileText,        permission: "content.view" },
  { href: "/admin/growth/procurement",      label: "Procurement Intel",    icon: ShoppingBag,     permission: "procurement.view",  badge: "NEW" },
  { href: "/admin/growth/dealers",          label: "Dealer Intelligence",  icon: Users,           permission: "dealer.view" },
  { href: "/admin/growth/gem",              label: "GeM Intel (Legacy)",   icon: ShoppingBag,     permission: "procurement.view" },
  { href: "/admin/growth/ads",              label: "Google Ads Intel",     icon: Megaphone,       permission: "ads.view" },
  { href: "/admin/growth/ads/setup",        label: "↳ Ads Setup",          icon: Plug,            permission: "ads.view",          sub: true },
  { href: "/admin/growth/ads/dashboard",    label: "↳ Ads Dashboard",      icon: BarChart2,       permission: "ads.view",          sub: true },
  { href: "/admin/growth/automation",       label: "Automation Center",    icon: Settings2,       permission: "automation.view" },
  { href: "/admin/growth/logs",             label: "Activity Logs",        icon: ScrollText,      permission: "logs.view" },
  { href: "/admin/growth/reports",          label: "Reporting Center",     icon: BarChart2,       permission: "reports.view" },
  { href: "/admin/growth/paid",             label: "Paid Growth",          icon: TrendingUp,      permission: "ads.view" },
  { href: "/admin/growth/users",            label: "User Management",      icon: UserCog,         permission: "users.view" },
  { href: "/admin/growth/permissions",      label: "Permission Matrix",    icon: ShieldCheck,     permission: "permissions.view" },
  { href: "/admin/growth/audit/permissions",label: "Permission Audit",     icon: ClipboardList,   permission: "users.view",        sub: true },
]

const SIDEBAR_KEY = "growth:sidebar:collapsed"

export function GrowthSidebar() {
  const pathname  = usePathname()
  const { permissions, loading, user } = useAuth()

  const [collapsed, setCollapsed]         = useState(false)
  const [mounted, setMounted]             = useState(false)
  const [gscConfigured, setGscConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    const isCollapsed = stored === "true"
    setCollapsed(isCollapsed)
    document.documentElement.style.setProperty("--sidebar-w", isCollapsed ? "56px" : "224px")
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!permissions.includes("seo.view")) return
    fetch("/api/admin/gsc/sync")
      .then(r => r.json())
      .then(d => setGscConfigured(d.configured === true))
      .catch(() => setGscConfigured(false))
  }, [permissions])

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      document.documentElement.style.setProperty("--sidebar-w", next ? "56px" : "224px")
      return next
    })
  }

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" })
    window.location.href = "/admin/login"
  }

  if (!mounted) {
    return <aside className="fixed left-0 top-0 bottom-0 w-56 bg-gray-950 z-40" />
  }

  // Filter to only permitted modules; hide inaccessible ones entirely
  const visibleModules = loading
    ? []
    : MODULES.filter(m => permissions.includes(m.permission))

  const w = collapsed ? "w-14" : "w-56"

  return (
    <aside className={`fixed left-0 top-0 bottom-0 ${w} bg-gray-950 border-r border-gray-800 flex flex-col z-40 overflow-y-auto overflow-x-hidden transition-[width] duration-200`}>
      {/* Header */}
      <div className={`border-b border-gray-800 flex items-center gap-2 ${collapsed ? "px-3 py-4 justify-center" : "px-4 py-5"}`}>
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-sm tracking-wide">Growth OS</span>
            <p className="text-gray-500 text-xs">100X Circle</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {loading ? (
          <div className="space-y-1 px-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          visibleModules.map(({ href, label, icon: Icon, badge, sub }) => {
            if (collapsed && sub) return null

            const active = sub
              ? pathname === href
              : pathname === href || (
                  pathname.startsWith(href + "/") &&
                  href !== "/admin/growth/seo" &&
                  href !== "/admin/growth/analytics" &&
                  href !== "/admin/growth/ads"
                )

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-lg text-xs font-medium transition-all group ${
                  collapsed
                    ? "p-2 justify-center"
                    : sub
                    ? "px-2 py-1.5 ml-3 gap-2.5"
                    : "px-3 py-2 gap-2.5"
                } ${
                  active
                    ? "bg-brand-600/15 text-brand-400 border border-brand-600/25"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon
                  size={collapsed ? 16 : sub ? 12 : 14}
                  className={active ? "text-brand-400" : "text-gray-500 group-hover:text-gray-300"}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 leading-tight truncate">{label}</span>
                    {href === "/admin/growth/seo/setup" && gscConfigured !== null && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${gscConfigured ? "bg-green-500" : "bg-red-400"}`}
                        title={gscConfigured ? "Connected" : "Not connected"}
                      />
                    )}
                    {badge && (
                      <span className="text-[9px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-bold">{badge}</span>
                    )}
                  </>
                )}
              </Link>
            )
          })
        )}
      </nav>

      {/* Footer: user chip + collapse + back + logout */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-1">
        {/* User chip */}
        {!collapsed && !loading && user && (
          <div className="px-3 py-2 mb-1 rounded-lg bg-gray-900">
            <p className="text-white text-xs font-medium truncate">{user.name}</p>
            <p className="text-gray-500 text-[10px] truncate capitalize">{user.role.replace("_", " ")}</p>
          </div>
        )}

        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-full flex items-center rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors ${
            collapsed ? "p-2 justify-center" : "px-3 py-2 gap-2"
          }`}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <><PanelLeftClose size={13} /><span>Collapse</span></>}
        </button>

        {!collapsed && (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={13} />Back to Admin
          </Link>
        )}

        <button
          onClick={handleLogout}
          title="Sign out"
          className={`w-full flex items-center rounded-lg text-xs text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors ${
            collapsed ? "p-2 justify-center" : "px-3 py-2 gap-2"
          }`}
        >
          <LogOut size={13} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
