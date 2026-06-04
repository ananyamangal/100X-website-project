"use client"
import { useEffect, useState } from "react"
import { BarChart2, Download, Calendar, TrendingUp } from "lucide-react"

interface DashStats {
  leads: { today: number; week: number; month: number; total: number }
  byType: Record<string, number>
  automations: { active: number; total: number }
  opportunities: { pending: number }
  content: { drafts: number; published: number }
  logs: { today: number; total: number }
}

export default function ReportingCenter() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState("month")

  useEffect(() => {
    fetch("/api/admin/growth/dashboard")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const generateTextReport = () => {
    if (!stats) return
    const lines = [
      `100X Circle Growth OS — Report`,
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      `Period: ${range === "day" ? "Today" : range === "week" ? "Last 7 Days" : "Last 30 Days"}`,
      "",
      "=== LEAD SUMMARY ===",
      `Today: ${stats.leads.today} leads`,
      `This Week: ${stats.leads.week} leads`,
      `This Month: ${stats.leads.month} leads`,
      `Total: ${stats.leads.total} leads`,
      "",
      "=== LEAD BREAKDOWN ===",
      `RFQ Leads: ${stats.byType.rfq}`,
      `GeM Inquiries: ${stats.byType.gem}`,
      `Contact / Other: ${stats.byType.contact}`,
      `Brochure: ${stats.byType.brochure}`,
      `Tender Support: ${stats.byType.tender}`,
      "",
      "=== GROWTH OS STATUS ===",
      `Active Automations: ${stats.automations.active} / ${stats.automations.total}`,
      `Pending Opportunities: ${stats.opportunities.pending}`,
      `Content Drafts: ${stats.content.drafts}`,
      `Published Content: ${stats.content.published}`,
      `Activity Logs Today: ${stats.logs.today}`,
      `Total Activity Logs: ${stats.logs.total}`,
      "",
      "=== RANKINGS & TRAFFIC ===",
      "Not yet connected — configure Google Search Console integration",
      "",
      "=== AI VISIBILITY ===",
      "Not yet tracked — log citations in GEO Command Center",
      "",
      "=== COMPETITOR STATUS ===",
      "Manual review required — see Competitor Intelligence module",
      "",
      "=== NEXT ACTIONS ===",
      "1. Review pending opportunities in Opportunity Engine",
      "2. Check Activity Logs for automation health",
      "3. Verify new leads in Dealer Intelligence",
      "4. Update AI citation checks in GEO module",
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `100x-growth-report-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
  }

  const generateCSV = () => {
    if (!stats) return
    const rows = [
      ["Metric", "Value", "Period", "Date"],
      ["Leads Today", stats.leads.today, "Today", new Date().toLocaleDateString("en-IN")],
      ["Leads This Week", stats.leads.week, "7 days", new Date().toLocaleDateString("en-IN")],
      ["Leads This Month", stats.leads.month, "30 days", new Date().toLocaleDateString("en-IN")],
      ["Leads Total", stats.leads.total, "All time", new Date().toLocaleDateString("en-IN")],
      ["RFQ Leads", stats.byType.rfq, "All time", new Date().toLocaleDateString("en-IN")],
      ["GeM Inquiries", stats.byType.gem, "All time", new Date().toLocaleDateString("en-IN")],
      ["Active Automations", stats.automations.active, "Current", new Date().toLocaleDateString("en-IN")],
      ["Pending Opportunities", stats.opportunities.pending, "Current", new Date().toLocaleDateString("en-IN")],
    ]
    const csv = rows.map(r => r.map(f => `"${f}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `100x-growth-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Reporting Center</h1>
              <p className="text-gray-400 text-[11px]">Generate daily, weekly, and monthly growth reports — export to PDF, CSV, or text</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={range} onChange={e => setRange(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none">
              <option value="day">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Export actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <button onClick={generateTextReport} disabled={!stats} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-brand-400 transition-colors text-left group disabled:opacity-50">
            <div className="flex items-center gap-2 mb-2">
              <Download size={15} className="text-gray-400 group-hover:text-brand-600" />
              <p className="text-sm font-semibold text-gray-800">Text Report</p>
            </div>
            <p className="text-xs text-gray-500">Download formatted report as .txt</p>
          </button>
          <button onClick={generateCSV} disabled={!stats} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-brand-400 transition-colors text-left group disabled:opacity-50">
            <div className="flex items-center gap-2 mb-2">
              <Download size={15} className="text-gray-400 group-hover:text-brand-600" />
              <p className="text-sm font-semibold text-gray-800">CSV Export</p>
            </div>
            <p className="text-xs text-gray-500">Download metrics as .csv for Excel</p>
          </button>
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-5 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={15} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-400">Email Report</p>
            </div>
            <p className="text-xs text-gray-400">Scheduled email — coming soon</p>
          </div>
        </div>

        {/* Current snapshot */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stats ? (
          <p className="text-red-500 text-sm">Failed to load report data.</p>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Current Snapshot</h3>
                <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Today", value: stats.leads.today, sub: "leads", color: "text-brand-600" },
                  { label: "This Week", value: stats.leads.week, sub: "leads", color: "text-blue-600" },
                  { label: "This Month", value: stats.leads.month, sub: "leads", color: "text-green-600" },
                  { label: "All Time", value: stats.leads.total, sub: "leads", color: "text-purple-600" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    <p className="text-[10px] text-gray-300">{sub}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">System Status</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Active Agents", value: stats.automations.active },
                    { label: "Pending Opps", value: stats.opportunities.pending },
                    { label: "Drafts", value: stats.content.drafts },
                    { label: "Published", value: stats.content.published },
                    { label: "Log Entries", value: stats.logs.total },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-700">{value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pending data sources */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-amber-500" />
                Data Sources — Connection Status
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: "MongoDB Lead Database", status: "connected", note: "All lead collections active" },
                  { label: "Growth OS Logs", status: "connected", note: "Activity logs, opportunities, content drafts" },
                  { label: "Google Search Console", status: "pending", note: "Add GOOGLE_SC_KEY env var to enable" },
                  { label: "Google Analytics 4", status: "pending", note: "Add GA4_PROPERTY_ID + service account" },
                  { label: "Google Ads API", status: "pending", note: "Add GOOGLE_ADS_CLIENT_ID env var" },
                  { label: "AI Citation Tracking", status: "manual", note: "Log citations manually in GEO module" },
                ].map(({ label, status, note }) => (
                  <div key={label} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "connected" ? "bg-green-500" : status === "manual" ? "bg-amber-400" : "bg-gray-200"}`} />
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className="text-gray-400 ml-2">{note}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status === "connected" ? "bg-green-100 text-green-700" : status === "manual" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
