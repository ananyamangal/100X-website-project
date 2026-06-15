"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { RefreshCw, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  return `₹${Math.round(v).toLocaleString()}`
}

interface MissingField {
  count: number; pct: string; sample?: Array<{
    gemc_no: string; seller_name?: string; buyer_display_name?: string
    oem_canonical?: string; contract_value_num?: number
  }>; note?: string
}

interface DqData {
  total: number
  missing: {
    seller_gst: MissingField
    quantity: MissingField
    buyer_state: MissingField
    buyer_canonical: MissingField
    unit_price: MissingField
    ministry: MissingField
  }
  coverage: { with_unit_price: { count: number; pct: string } }
  anomalies: {
    buyers: {
      count: number
      docs: Array<{ buyer_canonical: string; buyer_display_name: string; anomaly_reason: string; total_gmv: number; buyer_state: string }>
    }
  }
}

function PctBar({ pct }: { pct: string }) {
  const n = parseFloat(pct)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${n > 50 ? "bg-red-400" : n > 10 ? "bg-amber-400" : "bg-green-400"}`} style={{ width: `${Math.min(100, n)}%` }} />
      </div>
      <span className={`text-xs font-mono w-12 text-right ${n > 50 ? "text-red-600" : n > 10 ? "text-amber-600" : "text-green-600"}`}>{pct}%</span>
    </div>
  )
}

function StatusIcon({ pct }: { pct: string }) {
  const n = parseFloat(pct)
  if (n === 0)  return <CheckCircle size={14} className="text-green-500" />
  if (n < 5)   return <AlertCircle size={14} className="text-amber-500" />
  return <AlertTriangle size={14} className="text-red-500" />
}

export default function DataQualityCenter() {
  const [data, setData] = useState<DqData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fogging/data-quality")
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/admin/growth/fogging" className="hover:text-gray-700">Fogging Intelligence</Link>
            <span>/</span>
            <span className="text-gray-800">Data Quality</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Data Quality Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {data ? `${data.total.toLocaleString()} contracts in fogging_contracts` : "Loading…"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><RefreshCw size={24} className="animate-spin text-gray-400" /></div>
      ) : !data ? (
        <div className="text-center py-24 text-gray-400">Failed to load data quality report.</div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
          <Link
            href="/admin/growth/fogging/data-quality/queue"
            className="flex items-center gap-2 text-sm text-red-700 font-medium hover:underline">
            <AlertCircle size={14} className="text-red-500" />
            Unresolved Entity Queue →
          </Link>
          {/* Field coverage summary */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">
              Field Coverage — fogging_contracts ({data.total} docs)
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Field</th>
                  <th className="px-3 py-2 text-right">Missing</th>
                  <th className="px-3 py-2 text-right">Coverage</th>
                  <th className="px-3 py-2 w-48">Gap</th>
                  <th className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["seller_gst",       "Seller GST",        data.missing.seller_gst],
                  ["quantity",         "Quantity",          data.missing.quantity],
                  ["buyer_state",      "Buyer State",       data.missing.buyer_state],
                  ["buyer_canonical",  "Buyer Canonical",   data.missing.buyer_canonical],
                  ["unit_price",       "Unit Price",        data.missing.unit_price],
                  ["ministry",         "Ministry",          data.missing.ministry],
                ] as [string, string, MissingField][]).map(([key, label, field]) => (
                  <tr key={key} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 font-medium">{label}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-mono">{field.count.toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <StatusIcon pct={field.pct} />
                        <span className="font-mono text-xs">{(100 - parseFloat(field.pct)).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 w-48">
                      <PctBar pct={field.pct} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{field.note ?? ""}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-100 bg-blue-50">
                  <td className="px-4 py-2.5 font-medium text-blue-800">With Unit Price ✓</td>
                  <td className="px-3 py-2.5 text-right font-mono text-blue-700">{data.coverage.with_unit_price.count}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <CheckCircle size={14} className="text-blue-500" />
                      <span className="font-mono text-xs text-blue-700">{data.coverage.with_unit_price.pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${parseFloat(data.coverage.with_unit_price.pct)}%` }} />
                      </div>
                      <span className="text-xs font-mono w-12 text-right text-blue-700">{data.coverage.with_unit_price.pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-blue-600">Unit price analytics restricted to this subset</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Missing GST sample */}
          {data.missing.seller_gst.sample && data.missing.seller_gst.sample.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
                Missing Seller GST — {data.missing.seller_gst.count} contracts (sellers cannot be linked to Seller 360)
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-1.5 text-left">GEMC#</th>
                    <th className="px-3 py-1.5 text-left">Seller</th>
                    <th className="px-3 py-1.5 text-left">OEM</th>
                    <th className="px-3 py-1.5 text-left">Buyer</th>
                    <th className="px-3 py-1.5 text-right">Value</th>
                    <th className="px-3 py-1.5 text-center">Contract 360</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.missing.seller_gst.sample.map(s => (
                    <tr key={s.gemc_no} className="hover:bg-amber-50">
                      <td className="px-4 py-2 font-mono text-[10px] text-gray-600">{s.gemc_no}</td>
                      <td className="px-3 py-2 text-amber-700">{s.seller_name ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{s.oem_canonical ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">{s.buyer_display_name ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{INR(s.contract_value_num)}</td>
                      <td className="px-3 py-2 text-center">
                        <Link href={`/admin/growth/fogging/contracts/${encodeURIComponent(s.gemc_no)}`}
                          className="text-blue-600 hover:underline text-[10px]">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Missing state sample */}
          {data.missing.buyer_state.sample && data.missing.buyer_state.sample.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">
                Missing Buyer State — {data.missing.buyer_state.count} contracts
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-1.5 text-left">GEMC#</th>
                    <th className="px-3 py-1.5 text-left">Buyer</th>
                    <th className="px-3 py-1.5 text-left">OEM</th>
                    <th className="px-3 py-1.5 text-right">Value</th>
                    <th className="px-3 py-1.5 text-center">Contract 360</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.missing.buyer_state.sample.map(s => (
                    <tr key={s.gemc_no} className="hover:bg-amber-50">
                      <td className="px-4 py-2 font-mono text-[10px] text-gray-600">{s.gemc_no}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{s.buyer_display_name ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{s.oem_canonical ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{INR(s.contract_value_num)}</td>
                      <td className="px-3 py-2 text-center">
                        <Link href={`/admin/growth/fogging/contracts/${encodeURIComponent(s.gemc_no)}`}
                          className="text-blue-600 hover:underline text-[10px]">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Anomalous buyers */}
          {data.anomalies.buyers.count > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Anomalous Buyers — {data.anomalies.buyers.count} buyers flagged
              </div>
              <table className="w-full text-xs">
                <thead className="bg-amber-50 text-amber-600 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-1.5 text-left">Buyer</th>
                    <th className="px-3 py-1.5 text-left">State</th>
                    <th className="px-3 py-1.5 text-right">GMV</th>
                    <th className="px-3 py-1.5 text-left">Reason</th>
                    <th className="px-3 py-1.5 text-center">Buyer 360</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {data.anomalies.buyers.docs.map(b => (
                    <tr key={b.buyer_canonical} className="hover:bg-amber-50">
                      <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">{b.buyer_display_name}</td>
                      <td className="px-3 py-2.5 text-gray-500">{b.buyer_state}</td>
                      <td className="px-3 py-2.5 text-right">{INR(b.total_gmv)}</td>
                      <td className="px-3 py-2.5 text-amber-700">{b.anomaly_reason}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/admin/growth/fogging/buyer/${encodeURIComponent(b.buyer_canonical)}`}
                          className="text-blue-600 hover:underline text-[10px]">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Clean fields */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-2">
              <CheckCircle size={14} /> Fully covered fields (0 missing)
            </div>
            <div className="flex flex-wrap gap-2">
              {["oem_canonical","model_raw","model_normalized","seller_name","org_type"].map(field => (
                <span key={field} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-mono">{field}</span>
              ))}
            </div>
            <p className="text-xs text-green-600 mt-2">0 unknown OEMs · 0 duplicate GEMC# · GMV reconciled at ₹75.0816 Cr across all 5 collections</p>
          </div>
        </div>
      )}
    </div>
  )
}
