"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, ArrowRight } from "lucide-react"
import {
  CAPABILITY_REGISTRY,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/lib/growth-os/platform-registry"

interface PaletteItem {
  label: string
  description?: string
  category: string
  route: string
  badge?: string
}

const QUICK_NAV: PaletteItem[] = [
  { label: "Revenue Director",       route: "/admin/growth/director",           category: "Founder",       description: "Daily intelligence → approval → execution" },
  { label: "Operations Center",      route: "/admin/growth/operations",          category: "Founder",       description: "All automations health, schedule, next run" },
  { label: "Reporting Center",       route: "/admin/growth/reports",             category: "Founder",       description: "Weekly executive reports and summaries" },
  { label: "Fogging Intelligence",   route: "/admin/growth/fogging",             category: "Intelligence",  description: "1,418 contracts, 670 orgs, 679 sellers" },
  { label: "Procurement Intel",      route: "/admin/growth/procurement",         category: "Intelligence",  description: "GeM contract analysis, buyer and seller profiles" },
  { label: "Dealer Intelligence",    route: "/admin/growth/dealers",             category: "Intelligence",  description: "Ranked dealer acquisition targets" },
  { label: "Opportunities",          route: "/admin/growth/opportunities",       category: "CRM",           description: "Scored revenue opportunities pipeline" },
  { label: "Leads / Contact",        route: "/admin/growth/contact-this-week",   category: "CRM",           description: "Contact tracking and lead follow-up" },
  { label: "Landing Pages",          route: "/admin/growth/landing-pages",       category: "Marketing",     description: "Landing page CMS and section builder" },
  { label: "Permissions",            route: "/admin/growth/permissions",         category: "Admin",         description: "RBAC permission matrix" },
  { label: "Platform Registry",      route: "/admin/growth/platform-registry",   category: "System",        description: "Full inventory of all capabilities and collections" },
  { label: "RFQ Leads",             route: "/admin",                             category: "Main Admin",    description: "RFQ submissions live in the main admin panel", badge: "External" },
  { label: "Weekly Review",         route: "/admin/growth/reports/weekly-review", category: "Founder", description: "Revenue won/lost, dealers, SEO/ads output, preservation audit" },
  { label: "Founder Daily Brief",   route: "/admin/growth/help/today",           category: "Founder",       description: "What should I do today? — prioritised action list" },
  { label: "Knowledge Center",      route: "/admin/growth/help",                 category: "Founder",       description: "Platform documentation, daily workflow, changelog" },
  { label: "Ask Growth OS",         route: "/admin/growth/help/chat",            category: "Founder",       description: "Natural language AI assistant for the platform" },
]

export function CommandPalette() {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState("")
  const [selectedIdx, setSelectedIdx] = useState(0)
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Derived results
  const results: PaletteItem[] = query.length > 1
    ? CAPABILITY_REGISTRY
        .filter(c => {
          if (!c.route) return false
          const q = query.toLowerCase()
          return (
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            (c.route?.toLowerCase().includes(q) ?? false) ||
            (c.collections?.some(col => col.toLowerCase().includes(q)) ?? false)
          )
        })
        .slice(0, 10)
        .map(c => ({
          label:       c.name,
          route:       c.route!,
          category:    CATEGORY_LABELS[c.category],
          description: c.description,
          badge:       c.status !== "active" ? STATUS_LABELS[c.status] : undefined,
        }))
    : QUICK_NAV

  // Keyboard: CMD/CTRL+K toggle, ESC close, arrows + enter navigate
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => {
          const next = !prev
          if (next) { setQuery(""); setSelectedIdx(0) }
          return next
        })
        return
      }
      if (!open) return
      if (e.key === "Escape")    { setOpen(false); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); return }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === "Enter" && results[selectedIdx]) { navigate(results[selectedIdx].route) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, results, selectedIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0) }, [query])

  function navigate(route: string) {
    router.push(route)
    setOpen(false)
    setQuery("")
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">

        {/* Search row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search capabilities, pages, collections…"
            className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Section label */}
        <div className="px-4 pt-2.5 pb-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {query.length > 1 ? `${results.length} result${results.length !== 1 ? "s" : ""}` : "Quick Nav"}
          </span>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto pb-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No capabilities match &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.route + i}
                onClick={() => navigate(item.route)}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  i === selectedIdx ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <ArrowRight
                  size={12}
                  className={`flex-shrink-0 ${i === selectedIdx ? "text-blue-500" : "text-gray-300"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{item.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 font-bold uppercase">
                      {item.badge}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {item.category}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-4">
          <div className="flex gap-3 text-[10px] text-gray-400">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white border border-gray-200 font-mono mr-0.5">↑↓</kbd>
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white border border-gray-200 font-mono mr-0.5">↵</kbd>
              open
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white border border-gray-200 font-mono mr-0.5">⌘K</kbd>
              close
            </span>
          </div>
          <div className="ml-auto text-[10px] text-gray-400">
            {CAPABILITY_REGISTRY.length} capabilities indexed
          </div>
        </div>
      </div>
    </div>
  )
}
