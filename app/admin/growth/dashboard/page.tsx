"use client"
import { useEffect, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, Users, FileText, AlertCircle, Activity,
  Zap, PieChart, ScrollText, CheckCircle2,
} from "lucide-react"
import type { DashboardStats } from "@/lib/growth-os/types"

type BadgeColor = "gray" | "green" | "blue" | "amber" | "red" | "brand" | "purple"

function StatCard({ label, value, sub, color = "brand", icon: Icon }: {
  label: string; value: number | string; sub?: string; color?: string; icon: React.ElementType
}) {
  const ring: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 border-brand-200",
    green: "bg-green-50 text-green-600 border-green-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${ring[color] || ring.brand}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: BadgeColor }) {
  const c: Record<BadgeColor, string> = {
    gray: "bg-gray-100 text-gray-600", green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700", amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700", brand: "bg-brand-100 text-brand-700",
    purple: "bg-purple-100 text-purple-700",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>
}

const SRC_COLOR: Record<string, BadgeColor> = {
  rfq_popup: "blue", rfq: "blue", gem_inquiry: "brand", brochure: "purple",
  contact: "gray", submission: "gray", tender: "amber",
}

export default function GrowthDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/growth/dashboard")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  )

  if (!stats) return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-screen">
      <p className="text-red-500 text-sm">Failed to load dashboard.</p>
    </div>
  )

  const maxType = Math.max(stats.byType.rfq, stats.byType.gem, stats.byType.contact, stats.byType.brochure, stats.byType.tender, 1)

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">Executive Dashboard</h1>
              <p className="text-gray-400 text-[11px]">Real-time growth intelligence — 100X Circle</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6 max-w-[1400px]">
        {/* Integration notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 text-xs font-semibold mb-0.5">External integrations pending</p>
            <p className="text-amber-700 text-xs">Traffic, rankings, and AI visibility require Google Search Console + GA4 keys. Configure in <strong>Automation Center</strong>. Lead data below is live from MongoDB.</p>
          </div>
        </div>

        {/* Lead volume cards */}
        <section>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Lead Volume</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Today" value={stats.leads.today} sub="new leads" icon={TrendingUp} color="brand" />
            <StatCard label="This Week" value={stats.leads.week} sub="last 7 days" icon={Activity} color="blue" />
            <StatCard label="This Month" value={stats.leads.month} sub="last 30 days" icon={PieChart} color="green" />
            <StatCard label="All Time" value={stats.leads.total} sub="total leads" icon={Users} color="purple" />
          </div>
        </section>

        {/* Lead breakdown + 30-day chart */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Leads by Type</h3>
            <div className="space-y-3">
              {[
                { label: "RFQ Leads", count: stats.byType.rfq, bar: "bg-blue-500" },
                { label: "GeM Inquiries", count: stats.byType.gem, bar: "bg-brand-500" },
                { label: "Contact / Other", count: stats.byType.contact, bar: "bg-gray-400" },
                { label: "Brochure", count: stats.byType.brochure, bar: "bg-purple-500" },
                { label: "Tender Support", count: stats.byType.tender, bar: "bg-amber-500" },
              ].map(({ label, count, bar }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold text-gray-800">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${Math.round((count / maxType) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Lead Trend — 30 Days</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={stats.trend} margin={{ top: 4, right: 4, bottom: 0, left: -25 }}>
                <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
                  formatter={(v: number) => [v, "Leads"]}
                  labelFormatter={l => l}
                />
                <Bar dataKey="count" fill="#16a34a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System status */}
        <section>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Growth OS Status</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Agents" value={stats.automations.active} sub={`${stats.automations.total} total`} icon={Zap} color="green" />
            <StatCard label="Pending Opportunities" value={stats.opportunities.pending} sub="awaiting review" icon={AlertCircle} color="amber" />
            <StatCard label="Content Drafts" value={stats.content.drafts} sub={`${stats.content.published} published`} icon={FileText} color="blue" />
            <StatCard label="Activity Logs Today" value={stats.logs.today} sub={`${stats.logs.total} total`} icon={ScrollText} color="purple" />
          </div>
        </section>

        {/* External integrations — pending */}
        <section>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">External Data Sources</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Organic Traffic", src: "Google Search Console", st: "pending" },
              { label: "AI Visibility Score", src: "Manual tracking", st: "active" },
              { label: "Keyword Rankings", src: "Google Search Console", st: "pending" },
              { label: "Ad Performance", src: "Google Ads API", st: "pending" },
            ].map(({ label, src, st }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</span>
                  <Pill color={st === "active" ? "green" : "amber"}>{st === "active" ? "Active" : "Connect"}</Pill>
                </div>
                <p className="text-2xl font-bold text-gray-200 leading-none mb-1">—</p>
                <p className="text-xs text-gray-400">{src}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent leads */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Recent Leads</h3>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-green-500" />
              <span className="text-xs text-gray-400">Last 20</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Source", "Name", "Phone / Email", "Product", "Time"].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentLeads.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No leads recorded yet</td></tr>
                ) : stats.recentLeads.map(l => (
                  <tr key={l._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <Pill color={SRC_COLOR[l.source] || "gray"}>{l.source.replace("_", " ")}</Pill>
                    </td>
                    <td className="px-5 py-3 text-gray-700 font-medium">{l.name || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {l.phone
                        ? <a href={`tel:${l.phone}`} className="hover:text-brand-600">{l.phone}</a>
                        : l.email
                          ? <a href={`mailto:${l.email}`} className="hover:text-brand-600">{l.email}</a>
                          : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{l.product || "—"}</td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {l.createdAt ? new Date(l.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
