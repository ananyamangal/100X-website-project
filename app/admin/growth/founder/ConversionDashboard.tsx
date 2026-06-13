"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, MessageCircle, Phone, FileText, CheckCircle, BarChart2, MapPin } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyRow {
  date:       string
  whatsapp:   number
  call:       number
  rfqStarts:  number
  rfqSubmits: number
  contacts:   number
  totalLeads: number
}

interface Rolling7 extends Omit<DailyRow, "date"> {
  quoteRate: number | null
}

interface DashData {
  today:       DailyRow
  rolling7:    Rolling7
  daily:       DailyRow[]
  topPages:    { page: string; leads: number }[]
  dataFrom:    string
  generatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortDate(iso: string) {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function fmtPct(n: number | null) {
  return n === null ? "—" : `${n}%`
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────

function SparkBars({ daily, field }: { daily: DailyRow[]; field: keyof DailyRow }) {
  const vals  = daily.map(d => Number(d[field]))
  const max   = Math.max(...vals, 1)
  const today = daily.length - 1

  return (
    <div className="flex items-end gap-[3px] h-8">
      {vals.map((v, i) => {
        const h = Math.max((v / max) * 100, v > 0 ? 8 : 0)
        return (
          <div key={i} className="relative flex-1 flex flex-col items-center justify-end" title={`${daily[i].date}: ${v}`}>
            <div
              className={`w-full rounded-sm transition-all ${
                i === today ? "bg-brand-500" : "bg-brand-200"
              }`}
              style={{ height: `${h}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Metric tile ───────────────────────────────────────────────────────────────

interface MetricTileProps {
  icon:     React.ReactNode
  label:    string
  today:    number | string
  rolling7: number | string
  chart?:   React.ReactNode
  accent?:  boolean
}

function MetricTile({ icon, label, today, rolling7, chart, accent }: MetricTileProps) {
  const empty = today === 0 || today === "—"
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${accent ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center gap-2">
        <span className={`${accent ? "text-brand-600" : "text-gray-400"}`}>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-tight">{label}</p>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[9px] text-gray-400 mb-0.5">Today</p>
          <p className={`text-2xl font-bold leading-none tabular-nums ${empty ? "text-gray-200" : accent ? "text-brand-700" : "text-gray-900"}`}>
            {empty ? "—" : today}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-gray-400 mb-0.5">7-day</p>
          <p className={`text-base font-semibold leading-none tabular-nums ${accent ? "text-brand-600" : "text-gray-600"}`}>
            {rolling7}
          </p>
        </div>
      </div>

      {chart && <div>{chart}</div>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ConversionDashboard() {
  const [data,    setData]    = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/conversion-dashboard")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const t  = data?.today
  const r7 = data?.rolling7

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-brand-600" />
          <h3 className="text-sm font-bold text-gray-900">Conversion Dashboard</h3>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-[10px] text-gray-400">
              {new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Engagement metrics ─────────────────────────────────────── */}
        {data && (
          <>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Engagement</p>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  icon={<MessageCircle size={13} />}
                  label="WhatsApp clicks"
                  today={t?.whatsapp ?? 0}
                  rolling7={r7?.whatsapp ?? 0}
                  chart={<SparkBars daily={data.daily} field="whatsapp" />}
                />
                <MetricTile
                  icon={<Phone size={13} />}
                  label="Call clicks"
                  today={t?.call ?? 0}
                  rolling7={r7?.call ?? 0}
                  chart={<SparkBars daily={data.daily} field="call" />}
                />
              </div>
            </div>

            {/* ── Lead funnel ────────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Lead Funnel</p>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  icon={<FileText size={13} />}
                  label="RFQ starts"
                  today={t?.rfqStarts ?? 0}
                  rolling7={r7?.rfqStarts ?? 0}
                  chart={<SparkBars daily={data.daily} field="rfqStarts" />}
                />
                <MetricTile
                  icon={<FileText size={13} />}
                  label="RFQ submissions"
                  today={t?.rfqSubmits ?? 0}
                  rolling7={r7?.rfqSubmits ?? 0}
                  chart={<SparkBars daily={data.daily} field="rfqSubmits" />}
                />
                <MetricTile
                  icon={<CheckCircle size={13} />}
                  label="Contact forms"
                  today={t?.contacts ?? 0}
                  rolling7={r7?.contacts ?? 0}
                  chart={<SparkBars daily={data.daily} field="contacts" />}
                />
                <MetricTile
                  icon={<CheckCircle size={13} />}
                  label="Total leads"
                  today={t?.totalLeads ?? 0}
                  rolling7={r7?.totalLeads ?? 0}
                  chart={<SparkBars daily={data.daily} field="totalLeads" />}
                  accent={(t?.totalLeads ?? 0) > 0}
                />
              </div>
            </div>

            {/* ── Lead-to-quote ratio ────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Lead-to-Quote Ratio (7-day)</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900 tabular-nums">
                    {fmtPct(r7?.quoteRate ?? null)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">of leads submitted an RFQ</p>
                </div>
                {r7 && r7.totalLeads > 0 && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>{r7.rfqSubmits} RFQ</span>
                      <span>{r7.contacts} contact</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-brand-500 transition-all"
                        style={{ width: `${r7.quoteRate ?? 0}%` }}
                      />
                      <div className="h-full bg-gray-300 flex-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 7-day trend table ───────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">7-Day Trend</p>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left py-1.5 px-2 font-semibold w-16">Date</th>
                      <th className="text-right py-1.5 px-2 font-semibold">WA</th>
                      <th className="text-right py-1.5 px-2 font-semibold">Call</th>
                      <th className="text-right py-1.5 px-2 font-semibold">RFQ↗</th>
                      <th className="text-right py-1.5 px-2 font-semibold">RFQ✓</th>
                      <th className="text-right py-1.5 px-2 font-semibold">Contact</th>
                      <th className="text-right py-1.5 px-2 font-semibold font-bold text-gray-600">Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.slice(1).map((d, i) => {
                      const isToday = i === data.daily.length - 2
                      return (
                        <tr key={d.date} className={`border-t border-gray-50 ${isToday ? "bg-brand-50" : "hover:bg-gray-50"}`}>
                          <td className={`py-1.5 px-2 font-mono ${isToday ? "font-bold text-brand-700" : "text-gray-500"}`}>
                            {shortDate(d.date)}{isToday && " ←"}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-700">{d.whatsapp || "—"}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-700">{d.call || "—"}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-700">{d.rfqStarts || "—"}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-700">{d.rfqSubmits || "—"}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-gray-700">{d.contacts || "—"}</td>
                          <td className={`py-1.5 px-2 text-right tabular-nums font-bold ${d.totalLeads > 0 ? "text-brand-700" : "text-gray-300"}`}>
                            {d.totalLeads || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="py-1.5 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">7d</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-700 tabular-nums">{r7?.whatsapp || "—"}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-700 tabular-nums">{r7?.call || "—"}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-700 tabular-nums">{r7?.rfqStarts || "—"}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-700 tabular-nums">{r7?.rfqSubmits || "—"}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-700 tabular-nums">{r7?.contacts || "—"}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-brand-700 tabular-nums">{r7?.totalLeads || "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── Top landing pages ───────────────────────────────────── */}
            {data.topPages.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Top Landing Pages by Leads <span className="normal-case font-normal">(last 30 days)</span>
                </p>
                <div className="space-y-1.5">
                  {data.topPages.map(({ page, leads }, i) => {
                    const maxLeads = data.topPages[0].leads
                    const pct = Math.round((leads / maxLeads) * 100)
                    return (
                      <div key={page} className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-300 font-mono w-4 flex-shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-gray-700 truncate font-mono">{page}</span>
                            <span className="text-[11px] font-bold text-gray-800 ml-2 flex-shrink-0 tabular-nums">{leads}</span>
                          </div>
                          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Data provenance note ────────────────────────────────── */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-[10px] text-gray-400 space-y-0.5">
              <p className="flex items-center gap-1.5">
                <MapPin size={10} />
                <span>
                  <strong className="text-gray-600">Leads</strong> — submissions collection (MongoDB) from all time.
                  WA, Call, RFQ↗ click tracking started <strong className="text-gray-600">{data.dataFrom}</strong>.
                </span>
              </p>
              <p>
                <strong className="text-gray-600">RFQ↗</strong> = form started (first field focus) ·{" "}
                <strong className="text-gray-600">RFQ✓</strong> = submitted ·{" "}
                <strong className="text-gray-600">Quote rate</strong> = RFQ submits / total leads
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
