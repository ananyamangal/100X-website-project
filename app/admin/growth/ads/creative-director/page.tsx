"use client"
import { useState, useEffect } from "react"
import { Wand2, RotateCw, ChevronDown, ChevronUp, Copy, CheckCircle2, AlertCircle, Star, Zap, Shield, Clock, Target } from "lucide-react"
import type { CreativeDirectorRun, ScoredAsset, PersuasionFramework, CampaignObjective, AudienceType } from "@/lib/growth-os/agents/creative-director"

// ── Constants ─────────────────────────────────────────────────────────────────

const OBJECTIVES: { value: CampaignObjective; label: string }[] = [
  { value: "dealer_acquisition",  label: "Recruit New Dealers" },
  { value: "oem_authorization",   label: "OEM Authorization (Govt)" },
  { value: "gem_tender",          label: "Win GeM Tenders" },
  { value: "machine_sales",       label: "Direct Machine Sales" },
  { value: "brand_awareness",     label: "Brand Awareness" },
]

const AUDIENCES: { value: AudienceType; label: string }[] = [
  { value: "government_buyers",   label: "Government / Municipalities" },
  { value: "dealers",             label: "Potential Dealers" },
  { value: "pest_control",        label: "Pest Control Operators" },
  { value: "agriculture",         label: "Agriculture / Farmers" },
  { value: "industrial",          label: "Industrial / Factories" },
  { value: "mixed",               label: "Mixed (All Audiences)" },
]

const FRAMEWORK_COLORS: Record<PersuasionFramework, string> = {
  authority:      "bg-blue-100 text-blue-700",
  urgency:        "bg-red-100 text-red-700",
  risk_reduction: "bg-green-100 text-green-700",
  government:     "bg-purple-100 text-purple-700",
  dealer_growth:  "bg-amber-100 text-amber-700",
  revenue:        "bg-emerald-100 text-emerald-700",
  compliance:     "bg-indigo-100 text-indigo-700",
  trust:          "bg-gray-100 text-gray-700",
}

const FRAMEWORK_LABELS: Record<PersuasionFramework, string> = {
  authority:      "Authority",
  urgency:        "Urgency",
  risk_reduction: "Risk Reduction",
  government:     "Government",
  dealer_growth:  "Dealer Growth",
  revenue:        "Revenue",
  compliance:     "Compliance",
  trust:          "Trust",
}

// ── Score bar component ────────────────────────────────────────────────────────

function ScoreBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{size?: number; className?: string}> }) {
  const pct = Math.round(value * 10)
  const color = value >= 7 ? "bg-green-500" : value >= 5 ? "bg-amber-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-2">
      <Icon size={10} className="text-gray-400 shrink-0" />
      <span className="text-[10px] text-gray-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

// ── Asset card ────────────────────────────────────────────────────────────────

function AssetCard({ asset, limit, highlight }: { asset: ScoredAsset; limit: number; highlight?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const over = asset.charCount > limit

  const copy = () => {
    navigator.clipboard.writeText(asset.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`rounded-xl border p-3 text-xs space-y-2 ${highlight ? "border-brand-300 bg-brand-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-start gap-2">
        <p className={`flex-1 font-medium leading-snug ${over ? "text-red-600" : "text-gray-800"}`}>{asset.text}</p>
        <button onClick={copy} className="text-gray-400 hover:text-brand-600 transition-colors shrink-0">
          {copied ? <CheckCircle2 size={13} className="text-green-500" /> : <Copy size={13} />}
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${FRAMEWORK_COLORS[asset.framework]}`}>
          {FRAMEWORK_LABELS[asset.framework]}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${over ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
          {asset.charCount}/{limit} chars {over && "⚠️ OVER LIMIT"}
        </span>
        <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full font-bold">
          ★ {asset.scores.composite.toFixed(1)}
        </span>
        {highlight && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">TOP PICK</span>}
      </div>
      {asset.keywordsMatched.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {asset.keywordsMatched.slice(0, 4).map(kw => (
            <span key={kw} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">✓ {kw}</span>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600">
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        {open ? "Hide" : "Show"} scores
      </button>
      {open && (
        <div className="space-y-1 pt-1 border-t border-gray-100">
          <ScoreBar label="CTR Potential"    value={asset.scores.ctrPotential}     icon={Target} />
          <ScoreBar label="Authority"        value={asset.scores.authority}         icon={Shield} />
          <ScoreBar label="Urgency"          value={asset.scores.urgency}           icon={Clock} />
          <ScoreBar label="Commercial Intent" value={asset.scores.commercialIntent} icon={Zap} />
          <ScoreBar label="Conv. Impact"     value={asset.scores.conversionImpact}  icon={Star} />
          {asset.rationale && (
            <p className="text-[10px] text-gray-400 italic pt-1">{asset.rationale}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab panel ─────────────────────────────────────────────────────────────────

type Tab = "headlines" | "descriptions" | "callouts" | "snippets" | "sitelinks" | "images"

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreativeDirectorPage() {
  const [tab, setTab]         = useState<Tab>("headlines")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [run, setRun]         = useState<CreativeDirectorRun | null>(null)
  const [history, setHistory] = useState<Array<{ runId: string; input: { product: string; objective: string }; generatedAt: string }>>([])

  // Form
  const [product,      setProduct]      = useState("100X FGG Thermal Fogging Machine")
  const [landingPage,  setLandingPage]  = useState("/products/thermal-fogging-machines")
  const [objective,    setObjective]    = useState<CampaignObjective>("dealer_acquisition")
  const [audience,     setAudience]     = useState<AudienceType>("dealers")
  const [keywords,     setKeywords]     = useState("thermal fogging machine, fogging machine for sale, best fogging machine india")
  const [notes,        setNotes]        = useState("")

  useEffect(() => {
    fetch("/api/admin/growth/agents/creative-director")
      .then(r => r.json())
      .then(d => Array.isArray(d) && setHistory(d))
      .catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/agents/creative-director", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          landingPage,
          objective,
          audience,
          keywordCluster: keywords.split(",").map(k => k.trim()).filter(Boolean),
          notes,
        }),
      })
      const d = await res.json()
      if (!d.ok) throw new Error(d.error ?? "Generation failed")
      setRun(d.run as CreativeDirectorRun)
      setTab("headlines")
      setHistory(prev => [{ runId: d.run.runId, input: { product, objective }, generatedAt: d.run.generatedAt }, ...prev.slice(0, 9)])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const loadRun = async (runId: string) => {
    const res = await fetch("/api/admin/growth/agents/creative-director", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    })
    const d = await res.json()
    if (d.runId) { setRun(d as CreativeDirectorRun); setTab("headlines") }
  }

  const topIds = new Set(run?.topHeadlines.map(h => h.text) ?? [])
  const topDescIds = new Set(run?.topDescriptions.map(d => d.text) ?? [])

  const TABS = [
    { id: "headlines",    label: `Headlines (${run?.headlines.length ?? 0})` },
    { id: "descriptions", label: `Descriptions (${run?.descriptions.length ?? 0})` },
    { id: "callouts",     label: `Callouts (${run?.callouts.length ?? 0})` },
    { id: "snippets",     label: `Snippets (${run?.snippets.length ?? 0})` },
    { id: "sitelinks",    label: `Sitelinks (${run?.sitelinks.length ?? 0})` },
    { id: "images",       label: `Image Concepts (${run?.imageConcepts.length ?? 0})` },
  ] as const

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Creative Director</h1>
            <p className="text-gray-400 text-[11px]">AI-generated RSA assets — 50 headlines, 20 descriptions, 10 callouts + sitelinks, snippets, image concepts</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Input panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Campaign Brief</h3>

              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Product</label>
                <input value={product} onChange={e => setProduct(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800"
                  placeholder="e.g. 100X FGG Thermal Fogging Machine" />
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Landing Page Path</label>
                <input value={landingPage} onChange={e => setLandingPage(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800"
                  placeholder="/products/thermal-fogging-machines" />
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Campaign Objective</label>
                <select value={objective} onChange={e => setObjective(e.target.value as CampaignObjective)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800 bg-white">
                  {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Target Audience</label>
                <select value={audience} onChange={e => setAudience(e.target.value as AudienceType)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800 bg-white">
                  {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Keyword Cluster (comma separated)</label>
                <textarea value={keywords} onChange={e => setKeywords(e.target.value)} rows={3}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800 resize-none"
                  placeholder="thermal fogging machine, fogging machine for sale..." />
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Additional Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800 resize-none"
                  placeholder="e.g. Focus on pre-monsoon urgency, emphasize IS 14855 compliance" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-xs text-red-700">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button onClick={generate} disabled={loading || !product || !objective}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {loading ? <RotateCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                {loading ? "Generating assets…" : "Generate Creative Assets"}
              </button>

              <p className="text-[10px] text-gray-400 text-center">Uses Claude Opus · ~30–60 sec · ₹0.15 est. cost</p>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <h4 className="text-xs font-semibold text-gray-600">Past Runs</h4>
                {history.slice(0, 5).map(h => (
                  <button key={h.runId} onClick={() => loadRun(h.runId)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors">
                    <p className="text-[11px] font-medium text-gray-700 truncate">{h.input.product}</p>
                    <p className="text-[10px] text-gray-400">{h.input.objective} · {new Date(h.generatedAt).toLocaleDateString("en-IN")}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results panel */}
          <div className="lg:col-span-2 space-y-4">
            {!run && !loading && (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                <Wand2 size={28} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">Fill in the brief and click Generate to create assets</p>
                <p className="text-[11px] text-gray-300 mt-1">50 scored RSA headlines · 20 descriptions · 10 callouts · 10 sitelinks · 10 snippets · 10 image concepts</p>
              </div>
            )}

            {run && (
              <>
                {/* Run summary */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">Generated: {run.input.product}</h3>
                    <span className="text-[10px] text-gray-400">{new Date(run.generatedAt).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: "Headlines",   count: run.headlines.length,    top: run.topHeadlines[0]?.scores.composite },
                      { label: "Descriptions",count: run.descriptions.length, top: run.topDescriptions[0]?.scores.composite },
                      { label: "Callouts",    count: run.callouts.length,     top: undefined },
                      { label: "Sitelinks",   count: run.sitelinks.length,    top: undefined },
                      { label: "Snippets",    count: run.snippets.length,     top: undefined },
                    ].map(({ label, count, top }) => (
                      <div key={label} className="text-center bg-gray-50 rounded-lg p-2">
                        <p className="text-xl font-bold text-gray-800">{count}</p>
                        <p className="text-[10px] text-gray-400">{label}</p>
                        {top !== undefined && <p className="text-[10px] text-brand-600 font-bold mt-0.5">Top: {top.toFixed(1)}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100 overflow-x-auto">
                    {TABS.map(t => (
                      <button key={t.id} onClick={() => setTab(t.id as Tab)}
                        className={`text-[11px] font-medium px-4 py-3 shrink-0 border-b-2 transition-colors ${
                          tab === t.id ? "border-brand-600 text-brand-700 bg-brand-50/30" : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {tab === "headlines" && run.headlines.map((h, i) => (
                      <AssetCard key={i} asset={h} limit={30} highlight={topIds.has(h.text)} />
                    ))}
                    {tab === "descriptions" && run.descriptions.map((d, i) => (
                      <AssetCard key={i} asset={d} limit={90} highlight={topDescIds.has(d.text)} />
                    ))}
                    {tab === "callouts" && run.callouts.map((c, i) => (
                      <AssetCard key={i} asset={c} limit={25} />
                    ))}
                    {tab === "snippets" && run.snippets.map((s, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1">
                        <p className="font-semibold text-gray-700">{s.header}</p>
                        <div className="flex flex-wrap gap-1">
                          {s.values.map(v => (
                            <span key={v} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px]">{v}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {tab === "sitelinks" && run.sitelinks.map((sl, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-700">{sl.title}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sl.title.length > 25 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                            {sl.title.length}/25
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${FRAMEWORK_COLORS[sl.framework]}`}>{FRAMEWORK_LABELS[sl.framework]}</span>
                          <span className="text-[10px] font-bold text-brand-600">★ {sl.scores.composite.toFixed(1)}</span>
                        </div>
                        <p className="text-gray-500">{sl.description1}</p>
                        <p className="text-gray-500">{sl.description2}</p>
                      </div>
                    ))}
                    {tab === "images" && run.imageConcepts.map((img, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-700 flex-1">Concept {i + 1}: {img.concept}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${FRAMEWORK_COLORS[img.framework]}`}>{FRAMEWORK_LABELS[img.framework]}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-400 mb-0.5">Visual Hook</p>
                            <p className="text-gray-700">{img.visualHook}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-400 mb-0.5">Text Overlay</p>
                            <p className="text-gray-700 font-medium">{img.textOverlay}</p>
                          </div>
                          <div className="bg-brand-50 rounded-lg p-2">
                            <p className="text-brand-400 mb-0.5">CTA</p>
                            <p className="text-brand-700 font-bold">{img.cta}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
