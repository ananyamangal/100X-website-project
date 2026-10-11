"use client"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { crmFetch, errorText, qs } from "./api"
import { LEAD_SOURCES, SOURCE_LABEL, typeLabel } from "./format"
import { LOST_REASON_LABEL } from "./StageControl"
import { Chip, EmptyBox, ErrorBox, Spinner } from "./ui"

interface SourceRow { source: string; created: number; won: number; conversionRate: number; avgDaysToWon: number | null }
interface TypeRow { customerType: string; created: number; won: number; conversionRate: number; avgDaysToWon: number | null }
interface Report {
  range: { from: string; to: string; granularity: "week" | "month" }
  totals: { created: number; won: number; lost: number; open: number; conversionRate: number; avgDaysToWon: number | null }
  periods: { period: string; total: number; bySource: Record<string, number> }[]
  bySource: SourceRow[]
  byCustomerType: TypeRow[]
  lostReasons: { reason: string; count: number }[]
  truncated?: boolean
}

type Preset = "month" | "30d" | "quarter"
const PRESETS: { id: Preset; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
  { id: "quarter", label: "Last quarter" },
]

/** Today's date in IST as YYYY-MM-DD. */
const istDate = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10)

export function presetRange(preset: Preset, now = new Date()): { from: string; to: string } {
  const today = istDate(now)
  const [y, m] = today.split("-").map(Number)
  const pad = (n: number) => String(n).padStart(2, "0")
  if (preset === "month") return { from: `${y}-${pad(m)}-01`, to: today }
  if (preset === "30d") return { from: istDate(new Date(now.getTime() - 29 * 86_400_000)), to: today }
  // Last quarter: the previous calendar quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec).
  const q = Math.floor((m - 1) / 3)
  const startQ = q === 0 ? 3 : q - 1
  const yr = q === 0 ? y - 1 : y
  const startMonth = startQ * 3 + 1
  const endMonth = startMonth + 2
  const lastDay = new Date(Date.UTC(yr, endMonth, 0)).getUTCDate()
  return { from: `${yr}-${pad(startMonth)}-01`, to: `${yr}-${pad(endMonth)}-${pad(lastDay)}` }
}

const pct = (r: number) => `${(r * 100).toFixed(1)}%`
const daysText = (d: number | null) => (d === null ? "-" : `${d} days`)
const label = (source: string) => (source in SOURCE_LABEL ? SOURCE_LABEL[source as keyof typeof SOURCE_LABEL] : source)

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Bar({ value, max, tone = "bg-blue-500" }: { value: number; max: number; tone?: string }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-3 w-full rounded bg-gray-100" aria-hidden="true">
      <div className={`h-3 rounded ${tone}`} style={{ width: `${value > 0 ? w : 0}%` }} />
    </div>
  )
}

function Tile({ name, value }: { name: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{name}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}

export function Reports() {
  const [preset, setPreset] = useState<Preset>("30d")
  const [granularity, setGranularity] = useState<"week" | "month">("week")
  const [data, setData] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = presetRange(preset)
      setData(await crmFetch<Report>(`/api/crm/reports${qs({ from: r.from, to: r.to, granularity })}`))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [preset, granularity])
  useEffect(() => { void load() }, [load])

  const maxPeriod = Math.max(0, ...(data?.periods.map(p => p.total) ?? []))
  const maxLost = Math.max(0, ...(data?.lostReasons.map(r => r.count) ?? []))
  const maxSource = Math.max(0, ...(data?.bySource.map(r => r.created) ?? []))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => <Chip key={p.id} selected={preset === p.id} onClick={() => setPreset(p.id)}>{p.label}</Chip>)}
        <span className="mx-1 hidden h-6 border-l border-gray-300 sm:inline" aria-hidden="true" />
        <Chip selected={granularity === "week"} onClick={() => setGranularity("week")}>By week</Chip>
        <Chip selected={granularity === "month"} onClick={() => setGranularity("month")}>By month</Chip>
      </div>

      {error && <ErrorBox onRetry={() => void load()}>{error}</ErrorBox>}
      {loading && !data && <Spinner />}
      {data && (
        <div className={loading ? "space-y-4 opacity-60" : "space-y-4"}>
          <p className="text-sm text-gray-600">
            Leads created from {data.range.from} to {data.range.to}. Conversion is the share of those leads that are now Closed-Won.
          </p>
          {data.truncated && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You have a very large number of assigned contacts, so these figures may be slightly low.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile name="Leads" value={String(data.totals.created)} />
            <Tile name="Won" value={String(data.totals.won)} />
            <Tile name="Conversion rate" value={pct(data.totals.conversionRate)} />
            <Tile name="Average days to win" value={daysText(data.totals.avgDaysToWon)} />
          </div>

          {data.totals.created === 0 ? (
            <EmptyBox>No leads were created in this period.</EmptyBox>
          ) : (
            <>
              <Card title={`Leads by source, per ${granularity}`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="py-2 pr-2 font-medium">{granularity === "week" ? "Week" : "Month"}</th>
                        {LEAD_SOURCES.map(s => <th key={s} className="px-2 py-2 text-right font-medium">{label(s)}</th>)}
                        <th className="px-2 py-2 text-right font-medium">Total</th>
                        <th className="w-1/4 py-2 pl-2 font-medium"><span className="sr-only">Chart</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.periods.map(p => (
                        <tr key={p.period} className="border-b border-gray-100">
                          <td className="py-2 pr-2 whitespace-nowrap">{p.period}</td>
                          {LEAD_SOURCES.map(s => <td key={s} className="px-2 py-2 text-right tabular-nums">{p.bySource[s] ?? 0}</td>)}
                          <td className="px-2 py-2 text-right font-medium tabular-nums">{p.total}</td>
                          <td className="py-2 pl-2"><Bar value={p.total} max={maxPeriod} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Conversion by source">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="py-2 pr-2 font-medium">Source</th>
                        <th className="px-2 py-2 text-right font-medium">Leads</th>
                        <th className="px-2 py-2 text-right font-medium">Won</th>
                        <th className="px-2 py-2 text-right font-medium">Conversion</th>
                        <th className="px-2 py-2 text-right font-medium">Avg days to win</th>
                        <th className="w-1/4 py-2 pl-2 font-medium"><span className="sr-only">Chart</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bySource.map(r => (
                        <tr key={r.source} className="border-b border-gray-100">
                          <td className="py-2 pr-2">{label(r.source)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.created}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.won}</td>
                          <td className="px-2 py-2 text-right font-medium tabular-nums">{pct(r.conversionRate)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{daysText(r.avgDaysToWon)}</td>
                          <td className="py-2 pl-2"><Bar value={r.created} max={maxSource} tone="bg-green-500" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Conversion by customer type">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="py-2 pr-2 font-medium">Customer type</th>
                        <th className="px-2 py-2 text-right font-medium">Leads</th>
                        <th className="px-2 py-2 text-right font-medium">Won</th>
                        <th className="px-2 py-2 text-right font-medium">Conversion</th>
                        <th className="px-2 py-2 text-right font-medium">Avg days to win</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCustomerType.map(r => (
                        <tr key={r.customerType} className="border-b border-gray-100">
                          <td className="py-2 pr-2">{r.customerType === "unknown" ? "Not set" : typeLabel(r.customerType)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.created}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{r.won}</td>
                          <td className="px-2 py-2 text-right font-medium tabular-nums">{pct(r.conversionRate)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{daysText(r.avgDaysToWon)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Top reasons leads were lost">
                {data.lostReasons.length === 0 ? (
                  <p className="text-sm text-gray-500">No lost leads in this period.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.lostReasons.map(r => (
                      <li key={r.reason} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-2">
                        <span className="truncate">{LOST_REASON_LABEL[r.reason] ?? "Not recorded"}</span>
                        <Bar value={r.count} max={maxLost} tone="bg-red-400" />
                        <span className="text-right font-medium tabular-nums">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
