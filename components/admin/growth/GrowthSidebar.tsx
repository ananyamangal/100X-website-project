"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, Search, Bot, FileText,
  Users, ShoppingBag, Megaphone, ScrollText,
  BarChart2, TrendingUp, Zap, Plug,
  PanelLeftClose, PanelLeftOpen, UserCog, LogOut, ShieldCheck,
  Layout, Wand2, Link2, FlaskConical, Activity,
  Globe, Flame, ClipboardCheck, ChevronDown, ChevronRight,
  Building2, Inbox, Key, Brain, Factory, DollarSign,
  RotateCcw, Calendar, Rocket, Database,
} from "lucide-react"
import { useAuth } from "@/lib/rbac/client"
import { performAdminLogout } from "@/components/admin/AdminUserMenu"
import type { Permission } from "@/lib/rbac/permissions"

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = "founder" | "marketing" | "market_intel" | "crm" | "admin" | "advanced"

interface NavModule {
  section: SectionId
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string | null
  sub?: boolean
  permission: Permission
}

// ─── Navigation config ────────────────────────────────────────────────────────

const SECTION_META: Record<SectionId, { label: string; founderOnly: boolean }> = {
  founder:      { label: "FOUNDER",             founderOnly: false },
  marketing:    { label: "MARKETING",            founderOnly: true },
  market_intel: { label: "MARKET INTELLIGENCE",  founderOnly: true },
  crm:          { label: "CRM",                  founderOnly: true },
  admin:        { label: "ADMINISTRATION",        founderOnly: true },
  advanced:     { label: "ADVANCED TOOLS",        founderOnly: true },
}

const SECTION_ORDER: SectionId[] = ["founder", "marketing", "market_intel", "crm", "admin", "advanced"]

const NAV_MODULES: NavModule[] = [
  // ── FOUNDER ──────────────────────────────────────────────────────────────
  { section: "founder", href: "/admin/growth/director",   label: "Revenue Director",    icon: TrendingUp,      permission: "dashboard.view",  badge: "AI" },
  { section: "founder", href: "/admin/growth/dashboard",  label: "Executive Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { section: "founder", href: "/admin/growth/operations", label: "Operations Center",   icon: Activity,        permission: "dashboard.view" },
  { section: "founder", href: "/admin/growth/reports",    label: "Reporting Center",    icon: BarChart2,       permission: "reports.view" },

  // ── MARKETING ────────────────────────────────────────────────────────────
  { section: "marketing", href: "/admin/growth/ads",                   label: "Ads",                 icon: Megaphone,      permission: "ads.view" },
  { section: "marketing", href: "/admin/growth/ads/director",          label: "↳ Approvals",         icon: ClipboardCheck, permission: "ads.view", sub: true },
  { section: "marketing", href: "/admin/growth/ads/creative-director", label: "↳ Creative Director", icon: Wand2,          permission: "ads.view", sub: true },
  { section: "marketing", href: "/admin/growth/ads/setup",             label: "↳ Setup",             icon: Plug,           permission: "ads.view", sub: true },
  { section: "marketing", href: "/admin/growth/seo",                   label: "SEO",                 icon: Search,         permission: "seo.view" },
  { section: "marketing", href: "/admin/growth/seo/setup",             label: "↳ Search Console",    icon: Globe,          permission: "seo.view", sub: true },
  { section: "marketing", href: "/admin/growth/seo/offpage",           label: "↳ Off-Page SEO",      icon: Link2,          permission: "seo.view", sub: true },
  { section: "marketing", href: "/admin/growth/seo/offpage/validate",  label: "↳ Validation",        icon: FlaskConical,   permission: "seo.view", sub: true },
  { section: "marketing", href: "/admin/growth/content",               label: "Content",             icon: FileText,       permission: "content.view" },
  { section: "marketing", href: "/admin/growth/landing-pages",         label: "Landing Pages",       icon: Layout,         permission: "landing_pages.view" },
  { section: "marketing", href: "/admin/growth/analytics",             label: "Analytics",           icon: BarChart2,      permission: "analytics.view" },

  // ── MARKET INTELLIGENCE ──────────────────────────────────────────────────
  { section: "market_intel", href: "/admin/growth/fogging",     label: "Fogging Intelligence", icon: Flame,       permission: "procurement.view" },
  { section: "market_intel", href: "/admin/growth/dealers",     label: "Dealer Intelligence",  icon: Users,       permission: "dealer.view" },
  { section: "market_intel", href: "/admin/growth/procurement", label: "Procurement Intel",    icon: ShoppingBag, permission: "procurement.view" },
  { section: "market_intel", href: "/admin/growth/geo",         label: "GEO / AI Search",      icon: Bot,         permission: "geo.view" },

  // ── CRM ──────────────────────────────────────────────────────────────────
  { section: "crm", href: "/admin/growth/contact-this-week", label: "Leads",         icon: Inbox,       permission: "dealer.view" },
  { section: "crm", href: "/admin/growth/dealers",           label: "Dealers",       icon: Building2,   permission: "dealer.view" },
  { section: "crm", href: "/admin/growth/opportunities",     label: "Opportunities", icon: TrendingUp,  permission: "opportunities.view" },

  // ── ADMINISTRATION ───────────────────────────────────────────────────────
  { section: "admin", href: "/admin/growth/users",       label: "Users",       icon: UserCog,    permission: "users.view" },
  { section: "admin", href: "/admin/growth/permissions", label: "Permissions", icon: Key,        permission: "permissions.view" },
  { section: "admin", href: "/admin/growth/security",    label: "Security",    icon: ShieldCheck, permission: "dashboard.view" },
  { section: "admin", href: "/admin/growth/logs",        label: "Logs",        icon: ScrollText, permission: "logs.view" },

  // ── ADVANCED TOOLS ───────────────────────────────────────────────────────
  { section: "advanced", href: "/admin/growth/market-intelligence",    label: "Market Intelligence",   icon: Brain,          permission: "dashboard.view" },
  { section: "advanced", href: "/admin/growth/competitors",            label: "Competitor Intel",       icon: BarChart2,      permission: "competitors.view" },
  { section: "advanced", href: "/admin/growth/founder",                label: "Revenue Dashboard",      icon: LayoutDashboard, permission: "dashboard.view" },
  { section: "advanced", href: "/admin/growth/ads/campaign-factory",   label: "Campaign Factory",       icon: Factory,        permission: "ads.view" },
  { section: "advanced", href: "/admin/growth/ads/revenue",            label: "Revenue Attribution",    icon: DollarSign,     permission: "ads.view" },
  { section: "advanced", href: "/admin/growth/ads/remarketing-readiness", label: "Remarketing Ready",  icon: RotateCcw,      permission: "ads.view" },
  { section: "advanced", href: "/admin/growth/contact-this-week",      label: "Contact This Week",      icon: Calendar,       permission: "dealer.view" },
  { section: "advanced", href: "/admin/growth/launch",                 label: "Launch Status",          icon: Rocket,         permission: "dashboard.view" },
  { section: "advanced", href: "/admin/growth/agents/health-check",    label: "Agent Health Check",     icon: Activity,       permission: "dashboard.view" },
  { section: "advanced", href: "/admin/growth/platform-registry",      label: "Platform Registry",      icon: Database,       permission: "dashboard.view", badge: "NEW" },
]

// ─── Storage keys ─────────────────────────────────────────────────────────────

const SIDEBAR_KEY      = "growth:sidebar:collapsed"
const FOUNDER_MODE_KEY = "growth:founder-mode"
const SECTIONS_KEY     = "growth:sidebar:sections"

const DEFAULT_SECTIONS: Record<SectionId, boolean> = {
  founder: true, marketing: true, market_intel: true,
  crm: true, admin: true, advanced: false,
}

// ─── Badge colors ─────────────────────────────────────────────────────────────

const BADGE_STYLE: Record<string, string> = {
  AI:   "bg-violet-100 text-violet-700",
  NEW:  "bg-blue-100 text-blue-700",
  LIVE: "bg-green-100 text-green-700",
  DIAG: "bg-gray-100 text-gray-500",
}

// ─── Module link ─────────────────────────────────────────────────────────────

function ModuleLink({
  mod, active, collapsed,
}: {
  mod: NavModule; active: boolean; collapsed: boolean
}) {
  const Icon = mod.icon
  return (
    <Link
      href={mod.href}
      title={collapsed ? mod.label : undefined}
      className={`
        flex items-center gap-2.5 rounded-md transition-colors
        ${collapsed ? "justify-center px-1.5 py-2" : mod.sub ? "pl-7 pr-2 py-1.5" : "px-2.5 py-1.5"}
        ${active
          ? "bg-gray-900 text-white"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
        }
      `}
    >
      <Icon size={14} className="flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-[12px] leading-tight truncate font-medium">{mod.label}</span>
          {mod.badge && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${BADGE_STYLE[mod.badge] || BADGE_STYLE.NEW}`}>
              {mod.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({
  sectionId, modules, collapsed, pathname, sectionOpen, onToggle,
}: {
  sectionId: SectionId
  modules: NavModule[]
  collapsed: boolean
  pathname: string
  sectionOpen: boolean
  onToggle: () => void
}) {
  const meta = SECTION_META[sectionId]

  return (
    <div className="mb-1">
      {!collapsed && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-left group"
        >
          <span className="text-[9px] font-bold tracking-widest text-gray-600 uppercase">{meta.label}</span>
          {sectionId !== "founder" && (
            sectionOpen
              ? <ChevronDown  size={10} className="text-gray-600 group-hover:text-gray-400" />
              : <ChevronRight size={10} className="text-gray-600 group-hover:text-gray-400" />
          )}
        </button>
      )}

      {collapsed && sectionId !== "founder" && (
        <div className="my-2 mx-3 border-t border-gray-800" />
      )}

      {(sectionId === "founder" || sectionOpen || collapsed) && (
        <div className="space-y-0.5">
          {modules.map(mod => (
            <ModuleLink
              key={mod.href + mod.section}
              mod={mod}
              active={mod.sub ? pathname === mod.href : pathname.startsWith(mod.href)}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function GrowthSidebar() {
  const pathname   = usePathname()
  const { permissions, loading, user } = useAuth()

  const [collapsed,    setCollapsed]    = useState(false)
  const [founderMode,  setFounderMode]  = useState(false)
  const [mounted,      setMounted]      = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState<Record<SectionId, boolean>>(DEFAULT_SECTIONS)

  useEffect(() => {
    const isCollapsed   = localStorage.getItem(SIDEBAR_KEY) === "true"
    const isFounderMode = localStorage.getItem(FOUNDER_MODE_KEY) === "true"
    const savedSections = localStorage.getItem(SECTIONS_KEY)

    setCollapsed(isCollapsed)
    setFounderMode(isFounderMode)
    document.documentElement.style.setProperty("--sidebar-w", isCollapsed ? "56px" : "224px")

    if (savedSections) {
      try {
        const parsed = JSON.parse(savedSections)
        // Merge saved state with defaults so new sections get their default value
        setSectionsOpen({ ...DEFAULT_SECTIONS, ...parsed })
      } catch { /* ignore */ }
    }

    setMounted(true)
  }, [])

  function toggleSidebar() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      document.documentElement.style.setProperty("--sidebar-w", next ? "56px" : "224px")
      return next
    })
  }

  function toggleFounderMode() {
    setFounderMode(prev => {
      const next = !prev
      localStorage.setItem(FOUNDER_MODE_KEY, String(next))
      return next
    })
  }

  function toggleSection(id: SectionId) {
    if (id === "founder") return
    setSectionsOpen(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      return next
    })
  }

  const visibleModules = mounted && !loading
    ? NAV_MODULES.filter(m => {
        if (founderMode && SECTION_META[m.section].founderOnly) return false
        if (!permissions.includes(m.permission)) return false
        return true
      })
    : []

  const bySection = SECTION_ORDER.reduce((acc, id) => {
    acc[id] = visibleModules.filter(m => m.section === id)
    return acc
  }, {} as Record<SectionId, NavModule[]>)

  return (
    <aside
      style={{ width: "var(--sidebar-w, 224px)" }}
      className="fixed top-0 left-0 h-screen bg-gray-950 border-r border-gray-800 flex flex-col z-30 transition-all duration-200 overflow-hidden"
    >
      {/* Header */}
      <div className={`flex items-center border-b border-gray-800 h-12 flex-shrink-0 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Flame size={15} className="text-orange-400 flex-shrink-0" />
            <span className="text-xs font-bold text-gray-200 truncate">Growth OS</span>
            {founderMode && (
              <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-violet-900 text-violet-300 rounded font-bold flex-shrink-0">
                FOCUS
              </span>
            )}
          </div>
        )}
        <button onClick={toggleSidebar} className="text-gray-600 hover:text-gray-300 flex-shrink-0 p-1 rounded hover:bg-gray-800">
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0">
        {SECTION_ORDER.map(sectionId => {
          const modules = bySection[sectionId] || []
          if (modules.length === 0) return null
          return (
            <SectionBlock
              key={sectionId}
              sectionId={sectionId}
              modules={modules}
              collapsed={collapsed}
              pathname={pathname}
              sectionOpen={sectionsOpen[sectionId]}
              onToggle={() => toggleSection(sectionId)}
            />
          )
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-800 p-2 space-y-1">
        {!collapsed && (
          <button
            onClick={toggleFounderMode}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              founderMode
                ? "bg-violet-900/60 text-violet-300 hover:bg-violet-900"
                : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            }`}
          >
            <Zap size={12} className="flex-shrink-0" />
            {founderMode ? "Exit Founder Mode" : "Founder Mode"}
          </button>
        )}

        {collapsed && (
          <button
            onClick={toggleFounderMode}
            title={founderMode ? "Exit Founder Mode" : "Founder Mode"}
            className={`w-full flex justify-center py-2 rounded-md transition-colors ${
              founderMode ? "text-violet-400 bg-violet-900/40" : "text-gray-600 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Zap size={14} />
          </button>
        )}

        {!loading && user && (
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2 px-2"}`}>
            {!collapsed && (
              <span className="flex-1 text-[11px] text-gray-600 truncate">{user.email?.split("@")[0]}</span>
            )}
            <button
              onClick={() => performAdminLogout()}
              title="Sign out"
              className="text-gray-700 hover:text-gray-400 p-1 rounded hover:bg-gray-800 flex-shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
