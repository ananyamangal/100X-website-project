"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Archive, ShieldCheck, ShieldAlert, ShieldOff,
  RefreshCw, Copy, Check, ChevronRight, AlertTriangle,
  FileText, Download, Loader2, X,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GemContract {
  gemc_no:                string
  buyer_name:             string | null
  dept_name:              string | null
  product_name:           string | null
  seller_name_canonical:  string | null
  contract_value_num:     number | null
  state:                  string | null
  contract_status:        string | null
  contract_date_dt:       string | null
  quantity:               number | null
}

interface ArchiveRecord {
  _id?:                   string
  gemc_number:            string
  gemc_number_raw:        string
  buyer_name:             string
  buyer_slug:             string
  buyer_state:            string | null
  seller_name:            string | null
  seller_gstin:           string | null
  category:               string
  product_name_raw:       string | null
  contract_value_inr:     number | null
  quantity:               number | null
  current_status:         string
  award_date:             string | null
  sha256:                 string
  size_bytes:             number
  relative_path:          string
  pdf_class:              string
  storage_provider:       string
  integrity_verified:     boolean
  integrity_verified_at:  string | null
  status:                 string
  enrichment_run_id:      string
  created_at:             string
  updated_at:             string
}

interface ApprovalToken { token_id: string; expires_at: string; ttl_seconds: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtInr(v: number | null) {
  if (v == null) return "—"
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`
  return `₹${v.toLocaleString("en-IN")}`
}
function fmtBytes(b: number) {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`
  return `${(b / 1_024).toFixed(0)} KB`
}
function fmtDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}
function truncate(s: string | null, n: number) {
  if (!s) return "—"
  return s.length > n ? s.slice(0, n) + "…" : s
}

function IntegrityBadge({ record }: { record: ArchiveRecord }) {
  if (record.status === "corrupted") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
        <ShieldOff className="w-3 h-3" /> Corrupted
      </span>
    )
  }
  if (!record.integrity_verified) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
        <ShieldAlert className="w-3 h-3" /> Unverified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
      <ShieldCheck className="w-3 h-3" /> Verified
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-2 text-gray-400 hover:text-gray-700 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

const APPROVAL_PHRASE = "I APPROVE THIS ENRICHMENT RUN"

// ─── Sub-components ───────────────────────────────────────────────────────────

function ApprovalModal({ onToken, onClose }: {
  onToken: (t: ApprovalToken) => void
  onClose: () => void
}) {
  const [phrase, setPhrase] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState("")

  async function issue() {
    setLoading(true); setError("")
    try {
      const res  = await fetch("/api/admin/procurement/enrichment/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, operation: "archive_write" }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to issue token"); return }
      onToken({ token_id: data.token_id, expires_at: data.expires_at, ttl_seconds: data.ttl_seconds })
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Approve Archive Run</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Type the approval phrase exactly to receive a single-use token (valid 15 min).</p>
        <p className="text-xs font-mono bg-gray-50 border border-gray-200 rounded p-2 mb-3 text-gray-700 select-all">
          {APPROVAL_PHRASE}
        </p>
        <input
          type="text" value={phrase} onChange={e => setPhrase(e.target.value)}
          placeholder="Type phrase here…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => e.key === "Enter" && issue()}
        />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <button
          disabled={loading || phrase !== APPROVAL_PHRASE}
          onClick={issue}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Issuing…" : "Issue Token"}
        </button>
      </div>
    </div>
  )
}

function ContractDetailDrawer({ record, onClose, onVerify }: {
  record: ArchiveRecord
  onClose: () => void
  onVerify: (gemc: string) => void
}) {
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ match: boolean; actualSha256: string } | null>(null)

  async function runVerify() {
    setVerifying(true); setVerifyResult(null)
    try {
      const res  = await fetch("/api/admin/procurement/archive/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemc_number: record.gemc_number }),
      })
      const data = await res.json()
      setVerifyResult({ match: data.match, actualSha256: data.actualSha256 })
      onVerify(record.gemc_number)
    } catch (e) { console.error(e) }
    finally { setVerifying(false) }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl z-40 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{record.gemc_number}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{record.product_name_raw ?? "Fogging Machine"}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-5 space-y-5">
        {/* Contract */}
        <Section title="Contract">
          <Row label="Buyer"  value={record.buyer_name} />
          <Row label="Seller" value={`${record.seller_name ?? "—"}${record.seller_gstin ? ` · GSTIN ${record.seller_gstin}` : ""}`} />
          <Row label="Value"  value={`${fmtInr(record.contract_value_inr)}${record.quantity ? ` · Qty ${record.quantity}` : ""}`} />
          <Row label="Status" value={record.current_status} />
          <Row label="Award"  value={fmtDate(record.award_date)} />
          <Row label="State"  value={record.buyer_state ?? "—"} />
        </Section>

        {/* Archive */}
        <Section title="Archive">
          <Row label="Class"    value={`${record.pdf_class} – ${record.pdf_class === "A" ? "Permanent" : record.pdf_class === "B" ? "6-month retention" : "Extraction only"}`} />
          <Row label="Archived" value={fmtDate(record.created_at)} />
          <Row label="Size"     value={fmtBytes(record.size_bytes)} />
          <Row label="Provider" value={record.storage_provider} />
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-gray-400 w-20 flex-shrink-0">Path</span>
            <span className="font-mono text-[10px] break-all">{record.relative_path}</span>
          </div>
        </Section>

        {/* Integrity */}
        <Section title="Integrity">
          <div className="flex items-center gap-2 mb-2">
            <IntegrityBadge record={record} />
            {record.integrity_verified_at && (
              <span className="text-[10px] text-gray-400">Checked {fmtDate(record.integrity_verified_at)}</span>
            )}
          </div>
          <div className="flex items-center text-xs text-gray-600 font-mono break-all">
            <span className="text-gray-400 w-16 flex-shrink-0 font-sans">SHA256</span>
            <span className="text-[11px]">{record.sha256.slice(0, 16)}…</span>
            <CopyButton text={record.sha256} />
          </div>
          {verifyResult && (
            <div className={`mt-2 p-2 rounded-lg text-xs ${verifyResult.match ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {verifyResult.match
                ? "✓ SHA256 matches — file is intact"
                : `✗ SHA256 mismatch — file may be corrupted\nActual: ${verifyResult.actualSha256.slice(0, 16)}…`}
            </div>
          )}
          <button
            onClick={runVerify} disabled={verifying}
            className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            {verifying ? "Verifying…" : "Re-verify Integrity"}
          </button>
        </Section>

        {/* Policy */}
        <Section title="Policy">
          <Row label="Category ID" value="FOGGING_MACHINE_V2_IS_14855_PART_1" />
          <Row label="Policy" value="v1.0.0 · Phase 3 Layer 1 Design" />
          <Row label="Run ID" value={record.enrichment_run_id?.slice(0, 8) + "…"} />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-gray-700">
      <span className="text-gray-400 w-20 flex-shrink-0">{label}</span>
      <span>{value || "—"}</span>
    </div>
  )
}

// ─── Main ArchiveTab ──────────────────────────────────────────────────────────

export function ArchiveTab() {
  // Approval token
  const [showApproval, setShowApproval] = useState(false)
  const [token, setToken]               = useState<ApprovalToken | null>(null)

  // Contract selector
  const [contracts, setContracts]   = useState<GemContract[]>([])
  const [loadingC, setLoadingC]     = useState(true)
  const [selected, setSelected]     = useState<GemContract | null>(null)
  const [pdfUrl, setPdfUrl]         = useState("")
  const [pdfBase64, setPdfBase64]   = useState("")
  const [pdfInputMode, setPdfInputMode] = useState<"url" | "upload">("url")
  const [archiving, setArchiving]   = useState(false)
  const [archiveMsg, setArchiveMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  // Browser
  const [records, setRecords]       = useState<ArchiveRecord[]>([])
  const [total, setTotal]           = useState(0)
  const [loadingR, setLoadingR]     = useState(false)
  const [search, setSearch]         = useState("")
  const [detail, setDetail]         = useState<ArchiveRecord | null>(null)

  // Load fogging machine contracts
  useEffect(() => {
    fetch("/api/admin/procurement/contracts?section=contracts_list&q=fogg")
      .then(r => r.json())
      .then(d => {
        const all: GemContract[] = (d.contracts ?? []).filter((c: GemContract) => {
          const p = (c.product_name ?? "").toLowerCase()
          return p.includes("fogg") && !p.includes("vehicle") && !p.includes("truck") && !p.includes("mini")
        })
        setContracts(all)
      })
      .catch(() => {})
      .finally(() => setLoadingC(false))
  }, [])

  // Load archive records
  const loadRecords = useCallback(() => {
    setLoadingR(true)
    const q = search.length >= 2 ? `&q=${encodeURIComponent(search)}` : ""
    fetch(`/api/admin/procurement/archive/contracts?limit=50${q}`)
      .then(r => r.json())
      .then(d => { setRecords(d.contracts ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoadingR(false))
  }, [search])

  useEffect(() => { loadRecords() }, [loadRecords])

  // File upload handler
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPdfBase64((ev.target?.result as string)?.split(",")[1] ?? "")
    reader.readAsDataURL(file)
  }

  // Archive submit
  async function handleArchive() {
    if (!selected || !token) return
    setArchiving(true); setArchiveMsg(null)
    try {
      const pdfSource = pdfInputMode === "url"
        ? { type: "url" as const, url: pdfUrl }
        : { type: "upload" as const, base64: pdfBase64 }

      const res  = await fetch("/api/admin/procurement/archive/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_token: token.token_id,
          gemc_number: selected.gemc_no,
          pdf_source: pdfSource,
          pdf_class: "B",
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setArchiveMsg({ type: "error", text: data.error ?? "Archive failed" })
        return
      }
      if (data.versionConflict) {
        setArchiveMsg({ type: "info", text: `Version conflict: contract already archived with a different PDF. SHA256 mismatch.` })
        return
      }
      if (!data.written && data.existed) {
        setArchiveMsg({ type: "info", text: `Already archived. SHA256 matches — no action taken.` })
        return
      }
      setArchiveMsg({ type: "success", text: `Archived successfully. SHA256: ${data.sha256?.slice(0, 16)}… · ${fmtBytes(data.size_bytes ?? 0)} · Integrity: ${data.integrity_verified ? "✓ verified" : "pending"}` })
      setToken(null)
      loadRecords()
    } catch (e) {
      setArchiveMsg({ type: "error", text: String(e) })
    } finally {
      setArchiving(false)
    }
  }

  const tokenMinutes = token
    ? Math.max(0, Math.round((new Date(token.expires_at).getTime() - Date.now()) / 60_000))
    : 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Contract Archive</h2>
          <p className="text-xs text-gray-500 mt-0.5">Fogging Machine (V2) · IS 14855 (Part 1) · Max 10 per run</p>
        </div>
        <button
          onClick={() => setShowApproval(true)}
          className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            token
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-blue-600 text-white border-transparent hover:bg-blue-700"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {token ? `Token active (${tokenMinutes}m left)` : "Get Approval Token"}
        </button>
      </div>

      {showApproval && (
        <ApprovalModal
          onToken={t => { setToken(t); setShowApproval(false) }}
          onClose={() => setShowApproval(false)}
        />
      )}

      {/* Archive new contract */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700">Archive a Contract</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Contract selector */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Select contract</label>
            {loadingC ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading…
              </div>
            ) : contracts.length === 0 ? (
              <p className="text-xs text-gray-400">No fogging machine contracts found.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {contracts.slice(0, 50).map(c => (
                    <button
                      key={c.gemc_no}
                      onClick={() => setSelected(selected?.gemc_no === c.gemc_no ? null : c)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-start gap-3 transition-colors ${
                        selected?.gemc_no === c.gemc_no ? "bg-blue-50 border-l-2 border-blue-500" : ""
                      }`}
                    >
                      <div className="w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                        border-gray-300">
                        {selected?.gemc_no === c.gemc_no && (
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium text-gray-900">{c.gemc_no}</p>
                        <p className="text-[11px] text-gray-500 truncate">{c.buyer_name ?? c.dept_name ?? "—"} · {truncate(c.product_name, 50)}</p>
                        <p className="text-[10px] text-gray-400">{fmtInr(c.contract_value_num)} · {c.state ?? "—"} · {fmtDate(c.contract_date_dt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PDF source */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">PDF source</label>
            <div className="flex gap-2 mb-2">
              {(["url", "upload"] as const).map(m => (
                <button key={m} onClick={() => setPdfInputMode(m)}
                  className={`text-xs px-3 py-1 rounded-md border font-medium transition-colors ${
                    pdfInputMode === m ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}>{m === "url" ? "URL" : "Upload file"}</button>
              ))}
            </div>
            {pdfInputMode === "url" ? (
              <input type="url" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)}
                placeholder="https://gemservice.gov.in/contract/pdf/GEMC-…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ) : (
              <input type="file" accept="application/pdf" onChange={handleFile}
                className="w-full text-xs text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
            )}
          </div>

          {/* Status messages */}
          {archiveMsg && (
            <div className={`rounded-lg p-3 text-xs ${
              archiveMsg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
              archiveMsg.type === "error"   ? "bg-red-50 text-red-800 border border-red-200" :
              "bg-amber-50 text-amber-800 border border-amber-200"
            }`}>
              {archiveMsg.text}
            </div>
          )}

          {/* Submit */}
          <button
            disabled={!selected || !token || archiving || (pdfInputMode === "url" ? !pdfUrl : !pdfBase64)}
            onClick={handleArchive}
            className="flex items-center gap-2 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
            {archiving ? "Archiving…" : "Archive Contract"}
          </button>
          {!token && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Approval token required before archiving.
            </p>
          )}
        </div>
      </div>

      {/* Archive browser */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <p className="text-xs font-semibold text-gray-700">Archive Browser</p>
          <span className="text-[10px] text-gray-400">{total} contract{total !== 1 ? "s" : ""}</span>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search GEMC# or buyer…"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={loadRecords} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loadingR ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loadingR ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            <Archive className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            {search ? "No contracts match your search." : "No contracts archived yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5 font-medium">GEMC#</th>
                  <th className="text-left px-3 py-2.5 font-medium">Buyer</th>
                  <th className="text-right px-3 py-2.5 font-medium">Value</th>
                  <th className="text-right px-3 py-2.5 font-medium">Size</th>
                  <th className="text-center px-3 py-2.5 font-medium">Class</th>
                  <th className="text-center px-3 py-2.5 font-medium">Integrity</th>
                  <th className="text-center px-3 py-2.5 font-medium">Archived</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r.gemc_number}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setDetail(detail?.gemc_number === r.gemc_number ? null : r)}
                  >
                    <td className="px-5 py-3 font-mono font-medium text-gray-900">{r.gemc_number}</td>
                    <td className="px-3 py-3 text-gray-600">{truncate(r.buyer_name, 35)}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{fmtInr(r.contract_value_inr)}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{fmtBytes(r.size_bytes)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{r.pdf_class}</span>
                    </td>
                    <td className="px-3 py-3 text-center"><IntegrityBadge record={r} /></td>
                    <td className="px-3 py-3 text-center text-gray-400">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {detail && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setDetail(null)} />
          <ContractDetailDrawer
            record={detail}
            onClose={() => setDetail(null)}
            onVerify={() => loadRecords()}
          />
        </>
      )}
    </div>
  )
}
