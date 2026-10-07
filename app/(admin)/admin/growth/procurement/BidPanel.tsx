"use client"
import { useEffect, useState } from "react"
import { X, ExternalLink } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BidDetail {
  bid_number: string
  page_id: number | null
  variant: string
  keyword: string
  dept: string | null
  state: string | null
  l1_name: string | null
  l2_name: string | null
  l3_name: string | null
  l1_price: string | null
  est_value: string | null
  updated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function canonicalize(name: string | null): string {
  if (!name) return ""
  return name.toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ").trim()
}

const VARIANT_COLOR: Record<string, string> = {
  "D-PMA-Awarded": "bg-purple-100 text-purple-700",
  "C-RA-Awarded":  "bg-amber-100 text-amber-700",
  "B-Awarded":     "bg-green-100 text-green-700",
  "A-ProductTable":"bg-blue-100 text-blue-700",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  bidNumber: string
  onClose: () => void
  onDealerClick?: (canonicalName: string) => void
}

export function BidPanel({ bidNumber, onClose, onDealerClick }: Props) {
  const [bid, setBid] = useState<BidDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/procurement/bid?bid_number=${encodeURIComponent(bidNumber)}`)
      .then(r => r.json())
      .then(d => { setBid(d.error ? null : d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [bidNumber])

  const bidPlusUrl = bid?.page_id
    ? `https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/${bid.page_id}`
    : null

  const rankRows = bid
    ? [
        { rank: "L1", name: bid.l1_name, color: "bg-green-100 text-green-700" },
        { rank: "L2", name: bid.l2_name, color: "bg-blue-100 text-blue-700"  },
        { rank: "L3", name: bid.l3_name, color: "bg-gray-100 text-gray-600"  },
      ].filter(r => r.name)
    : []

  return (
    <>
      {/* Backdrop — above dealer panel (z-40) but below this modal (z-60) */}
      <div className="fixed inset-0 z-[55] bg-black/35" onClick={onClose} />

      {/* Modal */}
      <div className="fixed z-[60] top-1/2 left-[calc(50%-290px)] -translate-y-1/2 w-[560px] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-bold text-brand-600 leading-tight">{bidNumber}</p>
              {bid && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${VARIANT_COLOR[bid.variant] ?? "bg-gray-100 text-gray-500"}`}>
                    {bid.variant}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{bid.keyword}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {bidPlusUrl && (
                <a href={bidPlusUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-brand-600 border border-brand-200 px-2.5 py-1 rounded-lg hover:bg-brand-50 flex items-center gap-1">
                  <ExternalLink size={10} />BidPlus
                </a>
              )}
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !bid ? (
            <p className="text-sm text-red-500 text-center">Bid not found in database.</p>
          ) : (
            <>
              {/* Info grid */}
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-2 font-semibold">Bid Details</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Department", value: bid.dept },
                    { label: "State",      value: bid.state || "Not recorded" },
                    { label: "Est. Value", value: bid.est_value ? `₹${bid.est_value}` : "—" },
                    { label: "L1 Price",   value: bid.l1_price  ? `₹${bid.l1_price}`  : "—" },
                    { label: "Harvested",  value: fmtDate(bid.updated_at) },
                    { label: "Keyword",    value: bid.keyword },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-xs text-gray-700 font-medium truncate" title={value ?? ""}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bidders */}
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-2 font-semibold">Bidder Results</p>
                {rankRows.length === 0 ? (
                  <p className="text-xs text-gray-400">No bidder data available.</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {rankRows.map(({ rank, name, color }) => (
                      <div key={rank}
                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color} shrink-0 w-8 text-center`}>
                          {rank}
                        </span>
                        {onDealerClick && name ? (
                          <button
                            onClick={() => { onDealerClick(canonicalize(name)); onClose() }}
                            className="text-xs text-brand-600 hover:underline text-left font-medium">
                            {name}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-700">{name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BidPlus link if present */}
              {bidPlusUrl && (
                <a href={bidPlusUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-brand-600 hover:text-brand-700 font-medium">
                  <ExternalLink size={12} />
                  View original result on BidPlus
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
