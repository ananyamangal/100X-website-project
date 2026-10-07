"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, TrendingUp, Megaphone, Database,
  Users, RotateCcw, Settings, MessageSquare, Zap,
  ArrowRight, ExternalLink, ChevronDown, ChevronRight,
  Calendar, Clock, CheckCircle2, AlertCircle,
} from "lucide-react"
import { DOC_REGISTRY, DOC_SECTIONS, getDocsBySection } from "@/lib/growth-os/doc-registry"

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChangelogEntry {
  _id: string
  type: string
  name: string
  description: string
  date: string
  version?: string
  routes_added?: string[]
  capabilities_added?: number
  collections_added?: number
  removed?: number
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  revenue: TrendingUp,
  marketing: Megaphone,
  intelligence: Database,
  crm: Users,
  automations: RotateCcw,
  system: Settings,
}

const QUICK_START_STEPS = [
  { step: 1, title: "Check Revenue Director", detail: "Open every morning at 07:00 IST. Approve the top 3–5 recs.", link: "/admin/growth/director" },
  { step: 2, title: "Review Execution Hub", detail: "See all active work in one screen. Check for overdue items.", link: "/admin/growth/execution" },
  { step: 3, title: "Update CRM stages", detail: "Move dealers and opportunities to reflect current status.", link: "/admin/growth/crm/dealers" },
  { step: 4, title: "Check Operations Center", detail: "Confirm all 7 crons ran successfully.", link: "/admin/growth/operations" },
  { step: 5, title: "Review Fogging Intel", detail: "Research a buyer org or competitor once per week.", link: "/admin/growth/fogging" },
]

const DAILY_SCHEDULE = [
  { time: "07:00 IST", label: "Revenue Director runs", icon: "🤖", detail: "AI generates daily recommendations" },
  { time: "07:15 IST", label: "Review Director recs", icon: "✅", detail: "Approve top 3–5 before 08:00" },
  { time: "08:00 IST", label: "Check Execution Hub", icon: "⚡", detail: "Active items from all pipelines" },
  { time: "10:30 IST", label: "GSC Sync runs", icon: "🔍", detail: "SEO keyword data refreshes" },
  { time: "Evening", label: "Update CRM", icon: "📋", detail: "Log calls, move stages, set follow-ups" },
]

const WEEKLY_SCHEDULE = [
  { day: "Monday 08:00", label: "Dealer Opportunity Engine", detail: "New dealer targets identified" },
  { day: "Monday 08:30", label: "Machine Buyer Opportunities", detail: "GeM buyer profiles updated" },
  { day: "Monday 08:30", label: "Weekly Exec Summary", detail: "AI report delivered" },
  { day: "Monday 09:30", label: "Google Ads Director", detail: "Ad recommendations generated" },
  { day: "Daily 06:30", label: "Procurement Insights", detail: "New GeM bids harvested" },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<"quickstart" | "daily" | "docs" | "changelog">("quickstart")
  const [activeSection, setActiveSection] = useState<string>("revenue")
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [changelogLoading, setChangelogLoading] = useState(false)

  useEffect(() => {
    if (activeTab === "changelog" && changelog.length === 0) {
      setChangelogLoading(true)
      fetch("/api/admin/growth/changelog?limit=20")
        .then(r => r.json())
        .then(d => setChangelog(d.entries ?? []))
        .finally(() => setChangelogLoading(false))
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const sectionDocs = getDocsBySection(activeSection as any)

  return (
    <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <BookOpen size={18} className="text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Founder Knowledge Center</h1>
            <p className="text-sm text-gray-500">Platform documentation — auto-updated from the registry</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href="/admin/growth/help/today" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
            <Zap size={11} />
            What should I do today?
          </Link>
          <Link href="/admin/growth/help/chat" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium">
            <MessageSquare size={11} />
            Ask Growth OS
          </Link>
          <Link href="/admin/growth/platform-registry" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white transition-colors">
            <Database size={11} />
            Platform Registry
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {[
          { label: "Capabilities", value: "52", note: "34 active" },
          { label: "Collections", value: "53", note: "MongoDB" },
          { label: "Automations", value: "7", note: "Crons" },
          { label: "Modules documented", value: String(DOC_REGISTRY.length), note: "in registry" },
          { label: "Routes active", value: "39+", note: "pages" },
          { label: "Sections", value: "6", note: "in nav" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-[10px] font-medium text-gray-700">{s.label}</div>
            <div className="text-[10px] text-gray-400">{s.note}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {([
          { id: "quickstart", label: "Quick Start", icon: "🚀" },
          { id: "daily",      label: "Daily Workflow", icon: "📅" },
          { id: "docs",       label: "Module Docs", icon: "📖" },
          { id: "changelog",  label: "What's New", icon: "🔄" },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ── Quick Start ─────────────────────────────────────────────────────── */}
      {activeTab === "quickstart" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">5-Step Founder Workflow</h2>
            <div className="space-y-3">
              {QUICK_START_STEPS.map(s => (
                <div key={s.step} className="flex items-start gap-4 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.detail}</div>
                  </div>
                  <Link
                    href={s.link}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    Open <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Key rules */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-amber-900 mb-3">Platform Rules (Always)</h3>
            <ul className="space-y-1.5 text-sm text-amber-800">
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />No automatic ad deployment — all campaigns require manual deployment in Google Ads.</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />No automatic content publishing — all SEO content must be manually deployed to the website.</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />No automatic CRM actions — all dealer and opportunity updates require manual entry.</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />All changes require your approval — the AI recommends, you decide.</li>
            </ul>
          </div>

          {/* Key modules */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Most Important Pages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: "Revenue Director", route: "/admin/growth/director", badge: "Daily", color: "blue" },
                { name: "Execution Hub", route: "/admin/growth/execution", badge: "Daily", color: "blue" },
                { name: "Operations Center", route: "/admin/growth/operations", badge: "Daily", color: "blue" },
                { name: "Fogging Intelligence", route: "/admin/growth/fogging", badge: "Weekly", color: "gray" },
                { name: "Dealer Pipeline", route: "/admin/growth/crm/dealers", badge: "Daily", color: "blue" },
                { name: "Opportunity Pipeline", route: "/admin/growth/crm/opportunities", badge: "Daily", color: "blue" },
              ].map(m => (
                <Link
                  key={m.route}
                  href={m.route}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
                >
                  <span className="text-sm text-gray-800 group-hover:text-blue-700 font-medium">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      m.color === "blue" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    }`}>{m.badge}</span>
                    <ArrowRight size={11} className="text-gray-300 group-hover:text-blue-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Daily Workflow ───────────────────────────────────────────────────── */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">Daily Schedule</h2>
            <div className="space-y-2">
              {DAILY_SCHEDULE.map((s, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="w-20 flex-shrink-0">
                    <span className="text-xs font-mono text-gray-500">{s.time}</span>
                  </div>
                  <span className="text-base flex-shrink-0">{s.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">Weekly Automations</h2>
            <div className="space-y-2">
              {WEEKLY_SCHEDULE.map((s, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-xs font-mono text-gray-500">{s.day}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              All times IST. Check <Link href="/admin/growth/operations" className="text-blue-600 hover:underline">Operations Center</Link> each morning to confirm crons ran.
            </p>
          </div>
        </div>
      )}

      {/* ── Module Docs ──────────────────────────────────────────────────────── */}
      {activeTab === "docs" && (
        <div className="flex gap-4">
          {/* Section sidebar */}
          <div className="w-36 flex-shrink-0 space-y-1">
            {DOC_SECTIONS.map(s => {
              const Icon = SECTION_ICONS[s.id] ?? BookOpen
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveSection(s.id); setExpandedDoc(null) }}
                  className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    activeSection === s.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={12} />
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* Doc list */}
          <div className="flex-1 space-y-2">
            {sectionDocs.length === 0 ? (
              <p className="text-sm text-gray-400">No documentation for this section yet.</p>
            ) : (
              sectionDocs.map(doc => (
                <div key={doc.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Doc header */}
                  <button
                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900">{doc.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{doc.route}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{doc.frequency}</span>
                      {expandedDoc === doc.id ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expandedDoc === doc.id && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                      <p className="text-sm text-gray-700 leading-relaxed">{doc.purpose}</p>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">How to use</h4>
                        <ul className="space-y-1.5">
                          {doc.how_to_use.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="flex-shrink-0 text-[10px] font-bold text-blue-500 mt-1">{i + 1}.</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {doc.workflow && doc.workflow.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Workflow</h4>
                          <div className="flex flex-wrap gap-2">
                            {doc.workflow.map((w, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1 text-blue-800 font-medium">
                                  {w.label}
                                </div>
                                {i < doc.workflow!.length - 1 && (
                                  <ArrowRight size={10} className="text-gray-300" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {doc.tips && doc.tips.length > 0 && (
                        <div className="bg-amber-50 rounded p-3 border border-amber-100">
                          <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1.5">Tips</h4>
                          {doc.tips.map((tip, i) => (
                            <p key={i} className="text-xs text-amber-900">→ {tip}</p>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-wrap gap-1">
                          {doc.connects_to.map(id => (
                            <span key={id} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">{id}</span>
                          ))}
                        </div>
                        <Link
                          href={doc.route}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 flex-shrink-0 ml-2"
                        >
                          Open page <ExternalLink size={10} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Changelog ───────────────────────────────────────────────────────── */}
      {activeTab === "changelog" && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4">Platform Changelog</h2>
          {changelogLoading ? (
            <div className="text-sm text-gray-400 py-8 text-center">Loading changelog...</div>
          ) : (
            <div className="space-y-3">
              {changelog.map((entry, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{entry.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{entry.description}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {entry.version && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">{entry.version}</span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {entry.capabilities_added !== undefined && entry.capabilities_added > 0 && (
                      <span className="text-green-700">+{entry.capabilities_added} capabilities</span>
                    )}
                    {entry.collections_added !== undefined && entry.collections_added > 0 && (
                      <span className="text-blue-700">+{entry.collections_added} collections</span>
                    )}
                    {entry.removed !== undefined && entry.removed > 0 && (
                      <span className="text-red-700">-{entry.removed} removed</span>
                    )}
                    {entry.removed === 0 && (
                      <span className="text-gray-400">0 removed — zero regressions</span>
                    )}
                  </div>
                  {entry.routes_added && entry.routes_added.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.routes_added.map(r => (
                        <Link key={r} href={r} className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-blue-50 hover:text-blue-700 transition-colors">
                          {r}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
