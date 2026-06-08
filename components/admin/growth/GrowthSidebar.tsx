"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, Search, Bot, Radar, Lightbulb, FileText,
  Users, ShoppingBag, Megaphone, Settings2, ScrollText,
  BarChart2, TrendingUp, ArrowLeft, Zap, Plug,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react"

const MODULES = [
  { href: "/admin/growth/dashboard",    label: "Executive Dashboard",  icon: LayoutDashboard, badge: null },
  { href: "/admin/growth/seo",          label: "SEO Command Center",   icon: Search,          badge: null },
  { href: "/admin/growth/seo/setup",    label: "↳ Search Console",     icon: Plug,            badge: null, sub: true },
  { href: "/admin/growth/analytics",    label: "GA4 Analytics",        icon: BarChart2,       badge: null },
  { href: "/admin/growth/analytics/setup", label: "↳ Analytics Setup", icon: Plug,            badge: null, sub: true },
  { href: "/admin/growth/geo",          label: "GEO / AI Search",      icon: Bot,             badge: null },
  { href: "/admin/growth/competitors",  label: "Competitor Intel",     icon: Radar,           badge: null },
  { href: "/admin/growth/opportunities",label: "Opportunity Engine",   icon: Lightbulb,       badge: "NEW" },
  { href: "/admin/growth/content",      label: "Content Factory",      icon: FileText,        badge: null },
  { href: "/admin/growth/procurement",  label: "Procurement Intel",    icon: ShoppingBag,     badge: "NEW" },
  { href: "/admin/growth/dealers",      label: "Dealer Intelligence",  icon: Users,           badge: null },
  { href: "/admin/growth/gem",          label: "GeM Intel (Legacy)",   icon: ShoppingBag,     badge: null },
  { href: "/admin/growth/ads",          label: "Google Ads Intel",     icon: Megaphone,       badge: null },
  { href: "/admin/growth/ads/setup",    label: "↳ Ads Setup",          icon: Plug,            badge: null, sub: true },
  { href: "/admin/growth/ads/dashboard",label: "↳ Ads Dashboard",      icon: BarChart2,       badge: null, sub: true },
  { href: "/admin/growth/automation",   label: "Automation Center",    icon: Settings2,       badge: null },
  { href: "/admin/growth/logs",         label: "Activity Logs",        icon: ScrollText,      badge: null },
  { href: "/admin/growth/reports",      label: "Reporting Center",     icon: BarChart2,       badge: null },
  { href: "/admin/growth/paid",         label: "Paid Growth",          icon: TrendingUp,      badge: null },
]

const SIDEBAR_KEY = "growth:sidebar:collapsed"

export function GrowthSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed]       = useState(false)
  const [mounted, setMounted]           = useState(false)
  const [gscConfigured, setGscConfigured] = useState<boolean | null>(null)

  // Read localStorage + broadcast CSS variable on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    const isCollapsed = stored === "true"
    setCollapsed(isCollapsed)
    document.documentElement.style.setProperty("--sidebar-w", isCollapsed ? "56px" : "224px")
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch("/api/admin/gsc/sync")
      .then(r => r.json())
      .then(d => setGscConfigured(d.configured === true))
      .catch(() => setGscConfigured(false))
  }, [])

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      document.documentElement.style.setProperty("--sidebar-w", next ? "56px" : "224px")
      return next
    })
  }

  // Prevent flash while reading localStorage
  if (!mounted) {
    return <aside className="fixed left-0 top-0 bottom-0 w-56 bg-gray-950 z-40" />
  }

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
        {MODULES.map(({ href, label, icon: Icon, badge, sub }) => {
          // Skip sub-items in collapsed mode — too narrow
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
        })}
      </nav>

      {/* Footer: collapse toggle + back link */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-1">
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
      </div>
    </aside>
  )
}
