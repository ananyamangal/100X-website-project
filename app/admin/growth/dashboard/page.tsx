"use client"
import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import {
  TrendingUp, Users, AlertCircle, Activity, Zap, CheckCircle2,
  Clock, ArrowRight, Phone, Mail, FileText, ScrollText,
} from "lucide-react"
import Link from "next/link"
import type { DashboardStats } from "@/lib/growth-os/types"

interface Opp { _id: string; title: string; businessValue: string; effort: string; module: string; status: string }
interface Log { _id: string; ts: string; agent: string; action: string; level: string; module: string }
interface Draft { _id: string; title: string; status: string; riskLevel: string }

function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: number | string; sub?: string; accent: string; icon: React.ElementType
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

type BadgeColor = "gray" | "blue" | "brand" | "amber" | "purple" | "green" | "red"
function Pill({ children, color }: { children: React.ReactNode; color: BadgeColor }) {
  const c: Record<BadgeColor, string> = {
    gray: "bg-gray-100 text-gray-600", blue: "bg-blue-100 text-blue-700",
    brand: "bg-brand-100 text-brand-700", amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700", green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>
}

const SRC_COLOR: Record<string, BadgeColor> = {
  rfq_popup: "blue", rfq: "blue", gem_inquiry: "brand", brochure: "purple",
  contact: "gray", submission: "gray", tender: "amber",
}

const VAL_COLOR: Record<string, BadgeColor> = {
  critical: "red", high: "amber", medium: "blue", low: "gray",
}

export default function GrowthDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [opps, setOpps] = useState<Opp[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/growth/dashboard").then(r => r.json()),
      fetch("/api/admin/growth/opportunities?status=pending").then(r => r.json()),
      fetch("/api/admin/growth/logs?limit=10").then(r => r.json()),
      fetch("/api/admin/growth/content?status=draft").then(r => r.json()),
    ]).then(([s, o, l, d]) => {
      setStats(s)
      setOpps(Array.isArray(o) ? o : [])
      setLogs(Array.isArray(l.logs) ? l.logs : [])
      setDrafts(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  )

  const topOpp = opps.find(o => o.businessValue === "critical" || o.businessValue === "high") || opps[0]
  const pendingDrafts = drafts.filter(d => d.status === "draft").length
  const pendingApprovals = opps.length + pendingDrafts
  const highRiskDrafts = drafts.filter(d => d.riskLevel === "high").length
  const todayStr = new Date().toISOString().slice(0, 10)
  const logsToday = logs.filter(l => l.ts?.startsWith(todayStr)).length

  const maxType = Math.max(
    stats?.byType.rfq ?? 0, stats?.byType.gem ?? 0,
    stats?.byType.contact ?? 0, stats?.byType.brochure ?? 0, 1
  )

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-brand-600" />
            <h1 className="text-base font-bold text-gray-900">Executive Dashboard</h1>
            <span className="text-xs text-gray-400 ml-2">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">

        {/* ── ROW 1: 7 FOUNDER QUESTIONS ─────────────────────────────────── */}
        {/* Top priority + pending approvals — answers "What should I work on today?" */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Today's #1 priority */}
          <div className="bg-gray-900 rounded-xl p-5 text-white lg:col-span-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Top Priority Right Now</p>
            {topOpp ? (
              <>
                <p className="text-sm font-semibold text-white mb-1">{topOpp.title}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <Pill color={VAL_COLOR[topOpp.businessValue] || "gray"}>{topOpp.businessValue} value</Pill>
                  <Pill color="gray">Effort: {topOpp.effort}</Pill>
                  <Pill color="gray">{topOpp.module}</Pill>
                </div>
                <Link href="/admin/growth/opportunities" className="inline-flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors">
                  Review in Opportunity Engine <ArrowRight size={11} />
                </Link>
              </>
            ) : (
              <p className="text-gray-400 text-sm">No pending opportunities — <Link href="/admin/growth/opportunities" className="text-brand-400 hover:underline">add some</Link></p>
            )}
          </div>

          {/* Pending approvals summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Needs Your Decision</p>
            <div className="space-y-2">
              <Link href="/admin/growth/opportunities" className="flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <span className="text-xs text-gray-700">Opportunities pending</span>
                <span className={`text-sm font-bold ${opps.length > 0 ? "text-amber-600" : "text-gray-300"}`}>{opps.length}</span>
              </Link>
              <Link href="/admin/growth/content" className="flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <span className="text-xs text-gray-700">Content drafts pending</span>
                <span className={`text-sm font-bold ${pendingDrafts > 0 ? "text-amber-600" : "text-gray-300"}`}>{pendingDrafts}</span>
              </Link>
              <Link href="/admin/growth/content" className="flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <span className="text-xs text-gray-700">High-risk drafts (require approval)</span>
                <span className={`text-sm font-bold ${highRiskDrafts > 0 ? "text-red-500" : "text-gray-300"}`}>{highRiskDrafts}</span>
              </Link>
              <div className="pt-2 border-t border-gray-100 mt-1">
                <span className="text-[11px] text-gray-400">Total actions needed: </span>
                <span className={`text-sm font-bold ${pendingApprovals > 0 ? "text-amber-600" : "text-green-500"}`}>{pendingApprovals}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Lead metrics ─────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Lead Volume — Answers "What produced leads?"</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Today" value={stats?.leads.today ?? 0} sub="new leads" accent="bg-brand-50 text-brand-600" icon={TrendingUp} />
            <StatCard label="This Week" value={stats?.leads.week ?? 0} sub="last 7 days" accent="bg-blue-50 text-blue-600" icon={Activity} />
            <StatCard label="This Month" value={stats?.leads.month ?? 0} sub="last 30 days" accent="bg-green-50 text-green-600" icon={Users} />
            <StatCard label="All Time" value={stats?.leads.total ?? 0} sub="total leads" accent="bg-purple-50 text-purple-600" icon={CheckCircle2} />
          </div>
        </section>

        {/* ── ROW 3: Source breakdown + 30-day chart ────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-700 mb-4">Lead Sources — "What produced dealer inquiries?"</p>
            <div className="space-y-3">
              {[
                { label: "RFQ Leads", count: stats?.byType.rfq ?? 0, bar: "bg-blue-500" },
                { label: "GeM Inquiries", count: stats?.byType.gem ?? 0, bar: "bg-brand-500" },
                { label: "Contact / Other", count: stats?.byType.contact ?? 0, bar: "bg-gray-400" },
                { label: "Brochure", count: stats?.byType.brochure ?? 0, bar: "bg-purple-500" },
                { label: "Tender Support", count: stats?.byType.tender ?? 0, bar: "bg-amber-500" },
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
            <p className="text-xs font-semibold text-gray-700 mb-4">Lead Trend — Last 30 Days</p>
            {stats?.trend && stats.trend.some(t => t.count > 0) ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={stats.trend} margin={{ top: 4, right: 4, bottom: 0, left: -25 }}>
                  <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: number) => [v, "Leads"]} labelFormatter={l => l} />
                  <Bar dataKey="count" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-gray-300 text-sm">
                No lead data in the last 30 days
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 4: What changed since yesterday (Activity feed) ─────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity feed */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">What Changed Since Yesterday</p>
                <p className="text-[11px] text-gray-400">{logsToday} actions today</p>
              </div>
              <Link href="/admin/growth/logs" className="text-[11px] text-brand-600 hover:underline">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <p className="px-5 py-8 text-center text-gray-300 text-xs">No activity yet. Run an agent in Automation Center.</p>
              ) : logs.slice(0, 6).map(l => (
                <div key={l._id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${l.level === "success" ? "bg-green-500" : l.level === "warning" ? "bg-amber-400" : l.level === "error" ? "bg-red-400" : "bg-blue-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{l.action}</p>
                    <p className="text-[10px] text-gray-400">{l.agent} · {new Date(l.ts).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending approvals detail */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">What Should Be Approved / Rejected</p>
              <p className="text-[11px] text-gray-400">{pendingApprovals} items need a decision</p>
            </div>
            <div className="divide-y divide-gray-50">
              {opps.slice(0, 4).map(o => (
                <div key={o._id} className="px-5 py-3 flex items-start gap-3">
                  <Clock size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{o.title}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Pill color={VAL_COLOR[o.businessValue] || "gray"}>{o.businessValue}</Pill>
                      <span className="text-[10px] text-gray-400">{o.module}</span>
                    </div>
                  </div>
                  <Link href="/admin/growth/opportunities" className="text-[10px] text-brand-600 hover:underline flex-shrink-0 mt-0.5">Review</Link>
                </div>
              ))}
              {drafts.filter(d => d.status === "draft").slice(0, 2).map(d => (
                <div key={d._id} className="px-5 py-3 flex items-start gap-3">
                  <FileText size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{d.title}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Pill color={d.riskLevel === "high" ? "red" : "gray"}>draft · {d.riskLevel} risk</Pill>
                    </div>
                  </div>
                  <Link href="/admin/growth/content" className="text-[10px] text-brand-600 hover:underline flex-shrink-0 mt-0.5">Review</Link>
                </div>
              ))}
              {pendingApprovals === 0 && (
                <p className="px-5 py-8 text-center text-gray-300 text-xs">All caught up — no pending approvals</p>
              )}
            </div>
            {pendingApprovals > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <Link href="/admin/growth/opportunities" className="text-xs text-brand-600 font-medium hover:underline">
                  Go to Opportunity Engine → Approve / Reject all
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 5: System status + external integration gaps ─────────── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Growth OS System Status</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Agents" value={stats?.automations.active ?? 0} sub={`of ${stats?.automations.total ?? 0} total`} accent="bg-green-50 text-green-600" icon={Zap} />
            <StatCard label="Opportunities" value={opps.length} sub="pending review" accent="bg-amber-50 text-amber-600" icon={AlertCircle} />
            <StatCard label="Content Drafts" value={pendingDrafts} sub={`${stats?.content.published ?? 0} published`} accent="bg-blue-50 text-blue-600" icon={FileText} />
            <StatCard label="Log Entries" value={stats?.logs.total ?? 0} sub={`${logsToday} today`} accent="bg-purple-50 text-purple-600" icon={ScrollText} />
          </div>
        </section>

        {/* ── ROW 6: Recent leads ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Recent Leads</p>
            <Link href="/admin/growth/dealers" className="text-[11px] text-brand-600 hover:underline">View dealer intelligence →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Source", "Name", "Contact", "Product", "When"].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!stats?.recentLeads?.length ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-300">No leads recorded yet</td></tr>
                ) : stats.recentLeads.slice(0, 10).map(l => (
                  <tr key={l._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3"><Pill color={SRC_COLOR[l.source] || "gray"}>{l.source.replace("_", " ")}</Pill></td>
                    <td className="px-5 py-3 text-gray-700 font-medium">{l.name || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {l.phone ? <a href={`tel:${l.phone}`} className="flex items-center gap-1 hover:text-brand-600"><Phone size={10} />{l.phone}</a> :
                       l.email ? <a href={`mailto:${l.email}`} className="flex items-center gap-1 hover:text-brand-600"><Mail size={10} />{l.email}</a> : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-[180px] truncate">{l.product || "—"}</td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {l.createdAt ? new Date(l.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending integration note — compact */}
        <div className="bg-gray-100 border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertCircle size={13} className="text-gray-400 flex-shrink-0" />
          <p className="text-[11px] text-gray-500">
            <strong className="text-gray-600">Traffic, rankings, AI visibility:</strong> Connect Google Search Console + GA4 API keys in Automation Center to unlock organic data. Current data is 100% live from MongoDB.
          </p>
        </div>
      </div>
    </div>
  )
}
