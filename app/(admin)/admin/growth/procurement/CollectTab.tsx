"use client"
import { useState, useRef, useCallback } from "react"
import {
  Link2, ClipboardPaste, Loader2, CheckCircle2, AlertCircle,
  Save, RotateCcw, ChevronDown, ChevronUp, Info,
} from "lucide-react"
import { parseGeMText, emptyBid, type ParsedBid, type ConfidenceMap } from "./gemParser"

// ─── Confidence dot ───────────────────────────────────────────────────────────

function CDot({ c }: { c?: string }) {
  if (!c) return <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" title="Not extracted" />
  if (c === "high")   return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="High confidence" />
  if (c === "medium") return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Verify this field" />
  if (c === "manual") return <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" title="Fill manually" />
  return               <span className="w-2 h-2 rounded-full bg-red-400 inline-block" title="Not found — fill manually" />
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, conf, required, children, hint,
}: {
  label: string
  conf?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <CDot c={conf} />
        <label className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[9px] text-gray-400">— {hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputCls = "w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-400 text-gray-700"
const selectCls = `${inputCls} bg-white`

const STATUSES = ["published","technical_eval","financial_eval","awarded","cancelled"] as const
const CATEGORIES = [
  { v: "thermal_fogger",  l: "Thermal Fogger" },
  { v: "mini_fogger",     l: "Mini Fogger" },
  { v: "vehicle_fogger",  l: "Vehicle Mounted Fogger" },
  { v: "sprayer",         l: "Sprayer" },
  { v: "power_tiller",    l: "Power Tiller" },
  { v: "brush_cutter",    l: "Brush Cutter" },
  { v: "other",           l: "Other" },
] as const

const FOCUS_STATES = [
  "Delhi","Haryana","Uttar Pradesh","Bihar","Maharashtra","Gujarat",
  "Rajasthan","Punjab","Karnataka","Tamil Nadu","West Bengal","Madhya Pradesh",
  "Andhra Pradesh","Telangana","Kerala","Odisha","Assam","Jharkhand",
  "Himachal Pradesh","Uttarakhand","Chandigarh","Goa","Jammu and Kashmir",
  "Chhattisgarh","Tripura","Nagaland","Manipur","Meghalaya","Sikkim",
  "Arunachal Pradesh","Mizoram","Puducherry",
].sort()

// ─── Main component ───────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-gray-400">
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Auto-extracted</span>
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Verify</span>
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Fill manually</span>
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />Manual only</span>
    </div>
  )
}

export function CollectTab({ onSaved }: { onSaved: () => void }) {
  const [input, setInput] = useState("")
  const [fetching, setFetching] = useState(false)
  const [mode, setMode] = useState<"input" | "form">("input")
  const [form, setForm] = useState<ParsedBid>(emptyBid())
  const [conf, setConf] = useState<ConfidenceMap>({})
  const [fetchFailed, setFetchFailed] = useState(false)
  const [pasteVisible, setPasteVisible] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [lastSaved, setLastSaved] = useState("")
  const [saveError, setSaveError] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyParsed = useCallback((parsed: Partial<ParsedBid>, parsedConf: ConfidenceMap) => {
    setForm(prev => ({ ...prev, ...parsed }))
    setConf(parsedConf)
    setMode("form")
    setFetchFailed(false)
    setPasteVisible(false)
    setPasteText("")
  }, [])

  // Detect input type and extract
  const handleExtract = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    const isBidNum = /^GEM\/\d{4}\/[A-Z]+\/\d+$/i.test(trimmed)
    const isUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    const isText = trimmed.includes("\n") || trimmed.length > 300

    if (isText || (!isBidNum && !isUrl)) {
      // Raw page text — parse immediately, no API needed
      const { bid, confidence } = parseGeMText(trimmed)
      applyParsed(bid, confidence)
      return
    }

    // URL or bid number — try server-side fetch
    setFetching(true)
    setFetchFailed(false)
    try {
      const res = await fetch("/api/admin/procurement/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      }).then(r => r.json())

      if (res.success && res.text) {
        const { bid, confidence } = parseGeMText(res.text)
        if (isBidNum && !bid.bid_number) bid.bid_number = trimmed.toUpperCase()
        applyParsed(bid, confidence)
      } else {
        // Fetch failed — pre-fill bid number, show paste area
        setForm(prev => ({
          ...prev,
          ...(isBidNum ? { bid_number: trimmed.toUpperCase() } : {}),
        }))
        setFetchFailed(true)
        setPasteVisible(true)
        setMode("form")
      }
    } catch {
      setFetchFailed(true)
      setPasteVisible(true)
      setMode("form")
    } finally {
      setFetching(false)
    }
  }, [input, applyParsed])

  // Parse pasted page text
  const handlePasteTextParse = useCallback(() => {
    if (!pasteText.trim()) return
    const { bid, confidence } = parseGeMText(pasteText)
    // Preserve manually entered bid_number if paste doesn't find one
    if (!bid.bid_number && form.bid_number) bid.bid_number = form.bid_number
    applyParsed(bid, confidence)
  }, [pasteText, form.bid_number, applyParsed])

  const set = (k: keyof ParsedBid, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.bid_number) { setSaveError("Bid number is required"); return }
    setSaving(true)
    setSaveError("")
    try {
      const res = await fetch("/api/admin/procurement/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      }).then(r => r.json())

      if (res.ok) {
        setLastSaved(form.bid_number)
        setSavedCount(c => c + 1)
        setForm(emptyBid())
        setConf({})
        setInput("")
        setMode("input")
        setPasteText("")
        setPasteVisible(false)
        onSaved()
      } else {
        setSaveError(res.error || "Save failed")
      }
    } catch {
      setSaveError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setMode("input")
    setForm(emptyBid())
    setConf({})
    setInput("")
    setPasteText("")
    setPasteVisible(false)
    setFetchFailed(false)
    setSaveError("")
  }

  // ─── Input mode ───────────────────────────────────────────────────────────

  if (mode === "input") {
    return (
      <div className="space-y-4 max-w-2xl">
        {savedCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs text-green-800">
              <span className="font-semibold">{savedCount} bid{savedCount > 1 ? "s" : ""} saved this session.</span>
              {lastSaved && <span className="ml-1 text-green-600">Last: {lastSaved}</span>}
            </span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Collect a GeM Bid</h3>
            <p className="text-xs text-gray-400">
              Paste a GeM bid URL, a bid number (GEM/YYYY/B/XXXXXXX), or the full page text copied from your browser.
            </p>
          </div>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !input.includes("\n")) { e.preventDefault(); handleExtract() } }}
            placeholder={`Paste any of these:\n• https://bidplus.gem.gov.in/...\n• GEM/2025/B/6842354\n• Full page text (Ctrl+A, Ctrl+C from any GeM bid page)`}
            className="w-full h-28 text-xs font-mono border border-gray-200 rounded-lg p-3 resize-none text-gray-700 focus:outline-none focus:border-brand-400"
            autoFocus
          />

          <button
            onClick={handleExtract}
            disabled={!input.trim() || fetching}
            className="flex items-center gap-2 text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {fetching
              ? <><Loader2 size={14} className="animate-spin" />Fetching GeM page…</>
              : <><Link2 size={14} />Extract Bid Data</>}
          </button>
        </div>

        {/* How-to */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5"><Info size={12} />Fastest workflow (≈20 sec/bid)</p>
          <ol className="list-decimal ml-4 space-y-1 text-blue-600">
            <li>Open the GeM bid result page in your browser</li>
            <li>Press <kbd className="bg-white border border-blue-200 rounded px-1 font-mono text-[10px]">Ctrl+A</kbd> then <kbd className="bg-white border border-blue-200 rounded px-1 font-mono text-[10px]">Ctrl+C</kbd></li>
            <li>Paste here and click Extract</li>
            <li>Fill in the OEM brand fields (check seller profile)</li>
            <li>Save — form clears for the next bid</li>
          </ol>
        </div>
      </div>
    )
  }

  // ─── Form mode ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800">Review &amp; Save</h3>
          <Legend />
        </div>
        <button onClick={handleReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
          <RotateCcw size={11} />Start over
        </button>
      </div>

      {/* Fetch failed notice */}
      {fetchFailed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
          <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">GeM page requires browser rendering — auto-extract not available.</p>
            <p>Bid number pre-filled. Paste the full page text below to auto-fill remaining fields.</p>
          </div>
        </div>
      )}

      {/* Paste text accordion */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setPasteVisible(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          <span className="flex items-center gap-1.5">
            <ClipboardPaste size={12} />
            {pasteVisible ? "Hide" : "Paste page text to auto-fill fields"}
          </span>
          {pasteVisible ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {pasteVisible && (
          <div className="px-4 pb-4 pt-1 space-y-2">
            <textarea
              ref={textareaRef}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste GeM bid page text here (Ctrl+A → Ctrl+C from the bid page)…"
              className="w-full h-28 text-[11px] font-mono border border-gray-200 rounded-lg p-2.5 resize-none bg-white"
              autoFocus={pasteVisible}
            />
            <button
              onClick={handlePasteTextParse}
              disabled={!pasteText.trim()}
              className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 disabled:opacity-40"
            >
              Parse text
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-5">

        {/* Row 1: Bid number + status */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bid Number" conf={conf.bid_number} required>
            <input value={form.bid_number} onChange={e => set("bid_number", e.target.value.toUpperCase())}
              placeholder="GEM/2025/B/6842354" className={inputCls} />
          </Field>
          <Field label="Status" conf={conf.current_status} required>
            <select value={form.current_status} onChange={e => set("current_status", e.target.value)} className={selectCls}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </Field>
        </div>

        {/* Row 2: Department + state */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department / Buyer" conf={conf.department_name} required>
            <input value={form.department_name} onChange={e => set("department_name", e.target.value)}
              placeholder="e.g. Municipal Corporation Delhi" className={inputCls} />
          </Field>
          <Field label="State" conf={conf.state} required>
            <select value={form.state} onChange={e => set("state", e.target.value)} className={selectCls}>
              <option value="">— select —</option>
              {FOCUS_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Row 3: Category + product name */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product Category" conf={conf.product_category} required>
            <select value={form.product_category} onChange={e => set("product_category", e.target.value)} className={selectCls}>
              {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </Field>
          <Field label="Product Name (raw)" conf={conf.product_name_raw}>
            <input value={form.product_name_raw} onChange={e => set("product_name_raw", e.target.value)}
              placeholder="as shown on GeM" className={inputCls} />
          </Field>
        </div>

        {/* Row 4: Qty + est value */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity (Nos)" conf={conf.quantity}>
            <input type="number" value={form.quantity ?? ""} onChange={e => set("quantity", e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 25" className={inputCls} />
          </Field>
          <Field label="Estimated Value (₹)" conf={conf.estimated_value_inr}
            hint="digits only, no commas">
            <input type="number" value={form.estimated_value_inr ?? ""} onChange={e => set("estimated_value_inr", e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 2750000" className={inputCls} />
          </Field>
        </div>

        {/* Row 5: Dates */}
        <div className="grid grid-cols-3 gap-4">
          <Field label="Publish Date" conf={conf.publish_date}>
            <input type="date" value={form.publish_date} onChange={e => set("publish_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Bid End Date" conf={conf.bid_end_date}>
            <input type="date" value={form.bid_end_date} onChange={e => set("bid_end_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Award Date" conf={conf.award_date}>
            <input type="date" value={form.award_date} onChange={e => set("award_date", e.target.value)} className={inputCls} />
          </Field>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-200 pt-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-3">
            Bid Results — OEM Brand must be filled manually (check seller profile on GeM)
          </p>

          {/* L1 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Field label="L1 Dealer Name" conf={conf.l1_dealer_name}>
              <input value={form.l1_dealer_name} onChange={e => set("l1_dealer_name", e.target.value)}
                placeholder="Company name" className={inputCls} />
            </Field>
            <Field label="L1 OEM Brand" conf="manual" hint="check seller profile">
              <input value={form.l1_oem_brand} onChange={e => set("l1_oem_brand", e.target.value)}
                placeholder="e.g. Longray" className={`${inputCls} border-blue-200 focus:border-blue-400`} />
            </Field>
            <Field label="L1 Price (₹)" conf={conf.l1_price_inr}>
              <input type="number" value={form.l1_price_inr ?? ""} onChange={e => set("l1_price_inr", e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 1182000" className={inputCls} />
            </Field>
          </div>

          {/* L2 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Field label="L2 Dealer Name" conf={conf.l2_dealer_name}>
              <input value={form.l2_dealer_name} onChange={e => set("l2_dealer_name", e.target.value)}
                placeholder="Company name" className={inputCls} />
            </Field>
            <Field label="L2 OEM Brand" conf="manual" hint="check seller profile">
              <input value={form.l2_oem_brand} onChange={e => set("l2_oem_brand", e.target.value)}
                placeholder="e.g. IGEBA" className={`${inputCls} border-blue-200 focus:border-blue-400`} />
            </Field>
            <Field label="L2 Price (₹)" conf={conf.l2_price_inr}>
              <input type="number" value={form.l2_price_inr ?? ""} onChange={e => set("l2_price_inr", e.target.value ? Number(e.target.value) : null)}
                placeholder="" className={inputCls} />
            </Field>
          </div>

          {/* L3 */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="L3 Dealer Name" conf={conf.l3_dealer_name}>
              <input value={form.l3_dealer_name} onChange={e => set("l3_dealer_name", e.target.value)}
                placeholder="Company name" className={inputCls} />
            </Field>
            <Field label="L3 OEM Brand" conf="manual" hint="check seller profile">
              <input value={form.l3_oem_brand} onChange={e => set("l3_oem_brand", e.target.value)}
                placeholder="e.g. Swastik" className={`${inputCls} border-blue-200 focus:border-blue-400`} />
            </Field>
            <Field label="L3 Price (₹)" conf={conf.l3_price_inr}>
              <input type="number" value={form.l3_price_inr ?? ""} onChange={e => set("l3_price_inr", e.target.value ? Number(e.target.value) : null)}
                placeholder="" className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Total bidders + 100X win */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total Bidders" conf={conf.total_bidders_count}>
            <input type="number" value={form.total_bidders_count ?? ""} onChange={e => set("total_bidders_count", e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 8" className={inputCls} />
          </Field>
          <Field label="100X Win?" conf="manual" hint="set true only if confirmed">
            <select value={String(form.is_100x_win)} onChange={e => set("is_100x_win", e.target.value === "true")} className={selectCls}>
              <option value="false">No</option>
              <option value="true">Yes — 100X dealer was L1</option>
            </select>
          </Field>
        </div>

        {/* Save */}
        {saveError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !form.bid_number}
            className="flex items-center gap-2 text-sm bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving
              ? <><Loader2 size={13} className="animate-spin" />Saving…</>
              : <><Save size={13} />Save bid + collect next</>}
          </button>
          <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          {savedCount > 0 && (
            <span className="text-xs text-green-600 font-medium ml-auto">
              {savedCount} saved this session
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
