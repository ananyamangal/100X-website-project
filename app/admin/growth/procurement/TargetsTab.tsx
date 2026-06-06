"use client"
import { useEffect, useState, useCallback } from "react"
import { RefreshCw, Phone, Globe, Mail } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeptTarget {
  dept:           string
  segment:        string
  bid_count:      number
  dealer_count:   number
  states:         string[]
  top_dealers:    { name: string; wins: number }[]
  latest_bid:     string | null
  is_repeat_buyer:boolean
}

interface DealerProspect {
  name:              string
  opportunity_score: number
  l1_wins:           number
  l2_count:          number
  dept_count:        number
  state_count:       number
  defence_l1:        number
  municipal_l1:      number
  health_l1:         number
  crm_contacted:     boolean
  is_100x_dealer:    boolean
  phone:             string | null
  email:             string | null
  website:           string | null
}

interface Specialist {
  name:           string
  defence_l1?:    number
  municipal_l1?:  number
  l1_wins:        number
  departments:    string[]
  states:         string[]
  is_100x_dealer: boolean
  crm_contacted:  boolean
}

interface TargetsData {
  enriched:            boolean
  defence_buyers:      DeptTarget[]
  municipal_buyers:    DeptTarget[]
  health_buyers:       DeptTarget[]
  high_frequency:      DeptTarget[]
  dealer_prospects:    DealerProspect[]
  defence_specialists: Specialist[]
  municipal_specialists: Specialist[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

function ContactIcons({ phone, email, website }: { phone?: string | null; email?: string | null; website?: string | null }) {
  if (!phone && !email && !website) return null
  return (
    <div className="flex items-center gap-2 mt-0.5">
      {phone   && <a href={`tel:${phone}`}   title={phone}   className="text-gray-400 hover:text-blue-600"><Phone  size={10} /></a>}
      {email   && <a href={`mailto:${email}`} title={email}   className="text-gray-400 hover:text-blue-600"><Mail   size={10} /></a>}
      {website && <a href={website} target="_blank" rel="noopener noreferrer" title={website} className="text-gray-400 hover:text-blue-600"><Globe size={10} /></a>}
    </div>
  )
}

// ─── Buyer Department Table ───────────────────────────────────────────────────

function BuyerDeptTable({ rows, color, onDealerClick }: {
  rows: DeptTarget[]
  color: string
  onDealerClick: (name: string) => void
}) {
  const maxBids = Math.max(...rows.map(r => r.bid_count), 1)
  if (rows.length === 0)
    return <p className="text-sm text-gray-400 py-8 text-center">No departments in this segment.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["#","Department","Bids","Dealers","States","Top L1 Dealer","Last Purchase"].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((dept, i) => (
            <tr key={dept.dept} className="hover:bg-gray-50/50">
              <td className="px-3 py-2.5 text-gray-400 w-8 font-mono text-[10px]">{i + 1}</td>
              <td className="px-3 py-2.5 max-w-[260px]">
                <span className="font-medium text-gray-800 truncate block max-w-[250px]" title={dept.dept}>
                  {dept.dept}
                </span>
                {dept.is_repeat_buyer && <span className="text-[9px] text-purple-500 font-semibold">Repeat</span>}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${color}`}>{dept.bid_count}</span>
                  <div className="w-14 bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${
                      color.includes("red") ? "bg-red-400" : color.includes("blue") ? "bg-blue-400" :
                      color.includes("green") ? "bg-green-400" : "bg-brand-400"
                    }`} style={{ width: `${Math.round((dept.bid_count / maxBids) * 100)}%` }} />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-gray-600">{dept.dealer_count}</td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-0.5">
                  {dept.states.slice(0, 2).map(s => (
                    <span key={s} className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">{s.slice(0, 8)}</span>
                  ))}
                  {dept.states.length > 2 && <span className="text-[9px] text-gray-400">+{dept.states.length - 2}</span>}
                  {dept.states.length === 0 && <span className="text-[9px] text-gray-300">—</span>}
                </div>
              </td>
              <td className="px-3 py-2.5">
                {dept.top_dealers[0]
                  ? <button onClick={() => onDealerClick(dept.top_dealers[0].name)}
                      className="text-gray-700 hover:text-brand-600 hover:underline text-left max-w-[130px] truncate block"
                      title={dept.top_dealers[0].name}>
                      {dept.top_dealers[0].name}
                      <span className="text-gray-400 ml-1">({dept.top_dealers[0].wins}W)</span>
                    </button>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(dept.latest_bid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Dealer Prospects Table ───────────────────────────────────────────────────

function DealerProspectsTable({ rows, onDealerClick }: {
  rows: DealerProspect[]
  onDealerClick: (name: string) => void
}) {
  const maxScore = Math.max(...rows.map(r => r.opportunity_score), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["#","Dealer","Score","L1","Depts","States","Def","Mun","Contact"].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((d, i) => (
            <tr key={d.name} className={`hover:bg-gray-50/50 ${d.crm_contacted ? "bg-amber-50/20" : ""}`}>
              <td className="px-3 py-2.5 text-gray-400 w-8 font-mono text-[10px]">{i + 1}</td>
              <td className="px-3 py-2.5 max-w-[180px]">
                <button onClick={() => onDealerClick(d.name)}
                  className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[170px]"
                  title={d.name}>{d.name}</button>
                <ContactIcons phone={d.phone} email={d.email} website={d.website} />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-600 text-sm">{d.opportunity_score}</span>
                  <div className="w-12 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-brand-500"
                      style={{ width: `${Math.round((d.opportunity_score / maxScore) * 100)}%` }} />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 font-bold text-green-700">{d.l1_wins}</td>
              <td className="px-3 py-2.5 text-gray-600">{d.dept_count}</td>
              <td className="px-3 py-2.5 text-gray-600">{d.state_count || "—"}</td>
              <td className="px-3 py-2.5">
                {d.defence_l1 > 0
                  ? <Pill c="bg-red-100 text-red-700">{d.defence_l1}L1</Pill>
                  : <span className="text-gray-200">—</span>}
              </td>
              <td className="px-3 py-2.5">
                {d.municipal_l1 > 0
                  ? <Pill c="bg-blue-100 text-blue-700">{d.municipal_l1}L1</Pill>
                  : <span className="text-gray-200">—</span>}
              </td>
              <td className="px-3 py-2.5">
                {d.crm_contacted
                  ? <Pill c="bg-amber-100 text-amber-700">Done</Pill>
                  : <button onClick={() => onDealerClick(d.name)}
                      className="text-[10px] text-brand-600 border border-brand-200 px-1.5 py-0.5 rounded hover:bg-brand-50">
                      Open
                    </button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Specialist Table ─────────────────────────────────────────────────────────

function SpecialistTable({ rows, field, label, onDealerClick }: {
  rows: Specialist[]
  field: "defence_l1" | "municipal_l1"
  label: string
  onDealerClick: (name: string) => void
}) {
  if (rows.length === 0)
    return <p className="text-sm text-gray-400 py-6 text-center">Run "Refresh Scores" to compute specialist rankings.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["#","Dealer",label,"Total L1","Depts","States","Status"].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((d, i) => (
            <tr key={d.name} className="hover:bg-gray-50/50">
              <td className="px-3 py-2.5 text-gray-400 w-8 font-mono text-[10px]">{i + 1}</td>
              <td className="px-3 py-2.5 max-w-[180px]">
                <button onClick={() => onDealerClick(d.name)}
                  className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[170px]"
                  title={d.name}>{d.name}</button>
                <div className="text-[10px] text-gray-400 truncate">{d.departments.slice(0, 1)[0]?.slice(0, 30)}</div>
              </td>
              <td className="px-3 py-2.5 font-bold text-xl">
                <span className={field === "defence_l1" ? "text-red-600" : "text-blue-600"}>
                  {d[field] ?? 0}
                </span>
              </td>
              <td className="px-3 py-2.5 text-gray-600">{d.l1_wins}</td>
              <td className="px-3 py-2.5 text-gray-600">{d.departments.length}</td>
              <td className="px-3 py-2.5 text-gray-600">{d.states.length || "—"}</td>
              <td className="px-3 py-2.5">
                {d.is_100x_dealer
                  ? <Pill c="bg-green-100 text-green-700">100X</Pill>
                  : d.crm_contacted
                  ? <Pill c="bg-amber-100 text-amber-700">Contacted</Pill>
                  : <Pill c="bg-gray-100 text-gray-500">Prospect</Pill>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SubTab = "defence" | "municipal" | "health" | "frequency" | "prospects" | "specialists"

export function TargetsTab({ onDealerClick }: { onDealerClick: (name: string) => void }) {
  const [data, setData]       = useState<TargetsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [enrichMsg, setEnrichMsg] = useState("")
  const [subTab, setSubTab]   = useState<SubTab>("prospects")

  const load = useCallback(async () => {
    setLoading(true)
    const d = await fetch("/api/admin/procurement/targets").then(r => r.json())
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const runEnrichment = async () => {
    setEnriching(true)
    setEnrichMsg("")
    try {
      const res = await fetch("/api/admin/procurement/enrich-scores", { method: "POST" }).then(r => r.json())
      setEnrichMsg(`Scores updated for ${res.dealers_processed} dealers (${res.bids_scanned} bids scanned)`)
      await load()
    } catch {
      setEnrichMsg("Enrichment failed — check server logs")
    } finally {
      setEnriching(false)
    }
  }

  const SUB_TABS: { id: SubTab; label: string; count?: number }[] = [
    { id: "prospects",   label: "Auth Prospects",       count: data?.dealer_prospects.length },
    { id: "defence",     label: "Defence Buyers",       count: data?.defence_buyers.length },
    { id: "municipal",   label: "Municipal Buyers",     count: data?.municipal_buyers.length },
    { id: "health",      label: "Health Buyers",        count: data?.health_buyers.length },
    { id: "frequency",   label: "High Frequency",       count: data?.high_frequency.length },
    { id: "specialists", label: "Segment Specialists" },
  ]

  return (
    <div className="space-y-4">
      {/* Enrichment bar */}
      <div className={`rounded-xl border p-4 shadow-sm flex items-center justify-between gap-4 ${
        data?.enriched ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
      }`}>
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${data?.enriched ? "text-green-800" : "text-amber-800"}`}>
            {data?.enriched
              ? "Defence / Municipal scores are computed"
              : "Scores not yet enriched — defence/municipal L1 counts may be 0 for all dealers"}
          </p>
          {enrichMsg && <p className="text-[11px] text-gray-600 mt-0.5">{enrichMsg}</p>}
          {!data?.enriched && (
            <p className="text-[11px] text-amber-700 mt-0.5">
              Click "Refresh Scores" to compute defence_l1, municipal_l1, and opportunity_score for all 1,222 dealers.
            </p>
          )}
        </div>
        <button onClick={runEnrichment} disabled={enriching}
          className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap ${
            data?.enriched ? "bg-green-600 text-white hover:bg-green-700" : "bg-amber-600 text-white hover:bg-amber-700"
          }`}>
          <RefreshCw size={11} className={enriching ? "animate-spin" : ""} />
          {enriching ? "Computing…" : "Refresh Scores"}
        </button>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex-wrap">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              subTab === t.id ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
            {t.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${
                subTab === t.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <p className="text-sm text-red-500 py-8 text-center">Failed to load targets.</p>
        ) : (
          <>
            {subTab === "prospects" && (
              <>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700">
                    Top {data.dealer_prospects.length} Authorization Prospects — non-100X dealers ranked by opportunity score
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Click dealer name to open CRM. Click "Open" to start an outreach.</p>
                </div>
                <DealerProspectsTable rows={data.dealer_prospects} onDealerClick={onDealerClick} />
              </>
            )}

            {subTab === "defence" && (
              <>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700">
                    Top {data.defence_buyers.length} Defence Buyers — Ministry of Defence, Army, Air Force, Navy, DRDO, Border
                  </h3>
                </div>
                <BuyerDeptTable rows={data.defence_buyers} color="text-red-600" onDealerClick={onDealerClick} />
              </>
            )}

            {subTab === "municipal" && (
              <>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700">
                    Top {data.municipal_buyers.length} Municipal / ULB Buyers — Nagar Palika, Municipal Corporation, Panchayat
                  </h3>
                </div>
                <BuyerDeptTable rows={data.municipal_buyers} color="text-blue-600" onDealerClick={onDealerClick} />
              </>
            )}

            {subTab === "health" && (
              <>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700">
                    Top {data.health_buyers.length} Health Sector Buyers — Hospitals, AIIMS, ESIC, CGHS
                  </h3>
                </div>
                <BuyerDeptTable rows={data.health_buyers} color="text-green-600" onDealerClick={onDealerClick} />
              </>
            )}

            {subTab === "frequency" && (
              <>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700">
                    Top {data.high_frequency.length} High-Frequency Buyers — all segments, sorted by total bid count
                  </h3>
                </div>
                <BuyerDeptTable rows={data.high_frequency} color="text-brand-600" onDealerClick={onDealerClick} />
              </>
            )}

            {subTab === "specialists" && (
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                <div>
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-red-700">Top Defence-Focused Dealers</h3>
                    <p className="text-[10px] text-gray-400">Ranked by defence L1 wins</p>
                  </div>
                  <SpecialistTable
                    rows={data.defence_specialists}
                    field="defence_l1"
                    label="Def L1"
                    onDealerClick={onDealerClick}
                  />
                </div>
                <div>
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-blue-700">Top Municipal-Focused Dealers</h3>
                    <p className="text-[10px] text-gray-400">Ranked by municipal L1 wins</p>
                  </div>
                  <SpecialistTable
                    rows={data.municipal_specialists}
                    field="municipal_l1"
                    label="Mun L1"
                    onDealerClick={onDealerClick}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
