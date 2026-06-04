"use client"
import { useEffect, useState, useCallback } from "react"
import { Search, Link2, AlertCircle, ExternalLink, CheckCircle2, XCircle, Play, RotateCw } from "lucide-react"

const CANNIBALIZATION = [
  { page1: "/gem-oem-authorization", page2: "/knowledge/gem-oem-authorization-process", risk: "HIGH", action: "Canonicalize knowledge article to main page" },
  { page1: "/nhm-fogging-machine", page2: "/nvbdcp-fogging-machine", risk: "MEDIUM", action: "Differentiate by programme name in title/H1; monitor GSC" },
  { page1: "/vector-control-equipment", page2: "/public-health-equipment", risk: "LOW", action: "Keep — public health is intentionally broader hub" },
]

function RiskBadge({ risk }: { risk: string }) {
  const c: Record<string, string> = { HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-green-100 text-green-700" }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c[risk] || c.LOW}`}>{risk}</span>
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = { pass: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", no_schema: "bg-red-100 text-red-700", invalid: "bg-red-100 text-red-700", error: "bg-gray-100 text-gray-500" }
  const label: Record<string, string> = { pass: "Pass", partial: "Partial", no_schema: "No schema", invalid: "Invalid JSON", error: "Error" }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c[status] || c.error}`}>{label[status] || status}</span>
}

interface SchemaFinding { path: string; priority: string; foundTypes: string[]; missingTypes: string[]; status: string }
interface SchemaAudit {
  pagesFromSitemap: number; pagesAudited: number; auditedAt: string
  findings: { noSchema: string[]; invalidSchema: string[]; missingFAQ: string[]; missingProduct: string[]; passing: string[] }
  details: SchemaFinding[]
}

interface LinkGraph {
  sourcesAnalyzed: number; authorityPagesTracked: number; auditedAt: string
  orphanPages: Array<{ path: string; priority: number; addLinkFrom: string[] }>
  weakPages: Array<{ path: string; priority: number; inboundCount: number; linkedBy: string[]; addLinkFrom: string[] }>
  strongPages: Array<{ path: string; inboundCount: number }>
  recommendations: Array<{ from: string; to: string; reason: string }>
}

export default function SEOCommandCenter() {
  const [schemaAudit, setSchemaAudit] = useState<SchemaAudit | null>(null)
  const [linkGraph, setLinkGraph] = useState<LinkGraph | null>(null)
  const [runningSchema, setRunningSchema] = useState(false)
  const [runningLinks, setRunningLinks] = useState(false)
  const [schemaResult, setSchemaResult] = useState<string | null>(null)
  const [linkResult, setLinkResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"schema" | "links" | "cannibalization">("schema")

  const loadSchema = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/growth/agents/schema-audit")
      const d = await r.json()
      if (d._type === "latest") setSchemaAudit(d)
    } catch {}
  }, [])

  const loadLinks = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/growth/agents/internal-link")
      const d = await r.json()
      if (d._type === "latest") setLinkGraph(d)
    } catch {}
  }, [])

  useEffect(() => { loadSchema(); loadLinks() }, [loadSchema, loadLinks])

  const runSchemaAgent = async () => {
    setRunningSchema(true); setSchemaResult(null)
    try {
      const r = await fetch("/api/admin/growth/agents/schema-audit", { method: "POST" })
      const d = await r.json()
      setSchemaResult(d.summary || "Done")
      await loadSchema()
    } catch { setSchemaResult("Error running agent") }
    setRunningSchema(false)
  }

  const runLinkAgent = async () => {
    setRunningLinks(true); setLinkResult(null)
    try {
      const r = await fetch("/api/admin/growth/agents/internal-link", { method: "POST" })
      const d = await r.json()
      setLinkResult(d.summary || "Done")
      await loadLinks()
    } catch { setLinkResult("Error running agent") }
    setRunningLinks(false)
  }

  const totalSchemaIssues = schemaAudit
    ? schemaAudit.findings.noSchema.length + schemaAudit.findings.invalidSchema.length + schemaAudit.findings.missingFAQ.length + schemaAudit.findings.missingProduct.length
    : null

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">SEO Command Center</h1>
            <p className="text-gray-400 text-[11px]">Schema audit, internal link health, and cannibalization risks — live from sitemap</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Summary stats */}
        {(schemaAudit || linkGraph) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{schemaAudit?.pagesFromSitemap ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Pages in sitemap</p>
            </div>
            <div className={`bg-white rounded-xl border p-4 shadow-sm text-center ${totalSchemaIssues && totalSchemaIssues > 0 ? "border-red-200" : "border-green-200"}`}>
              <p className={`text-2xl font-bold ${totalSchemaIssues && totalSchemaIssues > 0 ? "text-red-600" : "text-green-600"}`}>{totalSchemaIssues ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Schema issues</p>
            </div>
            <div className={`bg-white rounded-xl border p-4 shadow-sm text-center ${linkGraph && linkGraph.orphanPages.length > 0 ? "border-amber-200" : "border-green-200"}`}>
              <p className={`text-2xl font-bold ${linkGraph && linkGraph.orphanPages.length > 0 ? "text-amber-600" : "text-green-600"}`}>{linkGraph?.orphanPages.length ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Orphan pages</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{linkGraph?.recommendations.length ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Link fixes needed</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
          {(["schema", "links", "cannibalization"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors capitalize ${activeTab === tab ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {tab === "schema" ? "Schema Audit" : tab === "links" ? "Internal Links" : "Cannibalization"}
            </button>
          ))}
        </div>

        {/* === SCHEMA AUDIT === */}
        {activeTab === "schema" && (
          <div className="space-y-4">
            {/* Run agent */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Schema Audit Agent</h3>
                <p className="text-xs text-gray-500">Fetches live sitemap, audits JSON-LD on all pages with schema expectations, flags missing FAQPage and Product schemas.</p>
                {schemaAudit?.auditedAt && (
                  <p className="text-[11px] text-gray-400 mt-1">Last run: {new Date(schemaAudit.auditedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                )}
                {schemaResult && (
                  <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">{schemaResult}</p>
                )}
              </div>
              <button onClick={runSchemaAgent} disabled={runningSchema}
                className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">
                {runningSchema ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
                {runningSchema ? "Running…" : "Run now"}
              </button>
            </div>

            {!schemaAudit ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">No audit data yet — run the Schema Audit Agent above.</p>
              </div>
            ) : (
              <>
                {/* Issue categories */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "No JSON-LD", pages: schemaAudit.findings.noSchema, color: "border-red-200", textColor: "text-red-600" },
                    { label: "Missing FAQPage", pages: schemaAudit.findings.missingFAQ, color: "border-amber-200", textColor: "text-amber-600" },
                    { label: "Missing Product", pages: schemaAudit.findings.missingProduct, color: "border-amber-200", textColor: "text-amber-600" },
                    { label: "Passing", pages: schemaAudit.findings.passing, color: "border-green-200", textColor: "text-green-600" },
                  ].map(({ label, pages, color, textColor }) => (
                    <div key={label} className={`bg-white rounded-xl border ${color} p-4 shadow-sm`}>
                      <p className={`text-xl font-bold ${textColor}`}>{pages.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      {pages.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {pages.slice(0, 3).map(p => (
                            <li key={p} className="text-[10px] text-gray-500 font-mono truncate">{p}</li>
                          ))}
                          {pages.length > 3 && <li className="text-[10px] text-gray-400">+{pages.length - 3} more</li>}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* Detail table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Page-by-Page Results ({schemaAudit.pagesAudited} audited)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          {["Page", "Priority", "Status", "Found", "Missing"].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {schemaAudit.details
                          .sort((a, b) => {
                            const order = { high: 0, medium: 1, low: 2 }
                            const po = (order[a.priority as keyof typeof order] ?? 3) - (order[b.priority as keyof typeof order] ?? 3)
                            if (po !== 0) return po
                            // Issues first
                            const issueOrder: Record<string, number> = { no_schema: 0, invalid: 1, partial: 2, pass: 3, error: 4 }
                            return (issueOrder[a.status] ?? 5) - (issueOrder[b.status] ?? 5)
                          })
                          .map(d => (
                            <tr key={d.path} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  <code className="text-[11px] text-gray-700">{d.path}</code>
                                  <a href={`https://www.100xcircle.com${d.path}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-500">
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-semibold ${d.priority === "high" ? "text-red-600" : d.priority === "medium" ? "text-amber-600" : "text-gray-400"}`}>{d.priority}</span>
                              </td>
                              <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                              <td className="px-4 py-2.5 text-gray-500 text-[11px]">{d.foundTypes.join(", ") || "—"}</td>
                              <td className="px-4 py-2.5">
                                {d.missingTypes.length > 0 ? (
                                  <span className="text-red-600 text-[11px] font-medium">{d.missingTypes.join(", ")}</span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* === INTERNAL LINKS === */}
        {activeTab === "links" && (
          <div className="space-y-4">
            {/* Run agent */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Internal Link Agent</h3>
                <p className="text-xs text-gray-500">Crawls source pages from live sitemap, builds inbound link graph for authority pages, surfaces orphans and weak pages with specific link recommendations.</p>
                {linkGraph?.auditedAt && (
                  <p className="text-[11px] text-gray-400 mt-1">Last run: {new Date(linkGraph.auditedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                )}
                {linkResult && (
                  <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">{linkResult}</p>
                )}
              </div>
              <button onClick={runLinkAgent} disabled={runningLinks}
                className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">
                {runningLinks ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
                {runningLinks ? "Crawling…" : "Run now"}
              </button>
            </div>

            {!linkGraph ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">No link graph data yet — run the Internal Link Agent above.</p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Orphan pages", value: linkGraph.orphanPages.length, desc: "0 inbound links", color: "border-red-200", textColor: "text-red-600" },
                    { label: "Weak pages", value: linkGraph.weakPages.length, desc: "≤2 inbound links", color: "border-amber-200", textColor: "text-amber-600" },
                    { label: "Strong pages", value: linkGraph.strongPages.length, desc: "3+ inbound links", color: "border-green-200", textColor: "text-green-600" },
                  ].map(({ label, value, desc, color, textColor }) => (
                    <div key={label} className={`bg-white rounded-xl border ${color} p-5 shadow-sm text-center`}>
                      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
                      <p className="text-xs text-gray-700 font-medium mt-1">{label}</p>
                      <p className="text-[11px] text-gray-400">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Orphan pages */}
                {linkGraph.orphanPages.length > 0 && (
                  <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
                      <XCircle size={14} className="text-red-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Orphan Pages ({linkGraph.orphanPages.length})</h3>
                      <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">0 inbound links</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {linkGraph.orphanPages.map(p => (
                        <div key={p.path} className="px-5 py-3 flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-[11px] text-gray-700 font-medium">{p.path}</code>
                              <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">priority {p.priority}</span>
                            </div>
                            {p.addLinkFrom.length > 0 && (
                              <p className="text-[11px] text-gray-500">Add link from: <span className="text-brand-600 font-mono">{p.addLinkFrom.slice(0, 2).join(", ")}</span></p>
                            )}
                          </div>
                          <a href={`https://www.100xcircle.com${p.path}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-500 mt-0.5"><ExternalLink size={12} /></a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weak pages */}
                {linkGraph.weakPages.length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Weak Pages ({linkGraph.weakPages.length})</h3>
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">≤2 inbound links</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {linkGraph.weakPages.map(p => (
                        <div key={p.path} className="px-5 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-[11px] text-gray-700 font-medium">{p.path}</code>
                            <span className="text-[10px] text-amber-600">{p.inboundCount} inbound link{p.inboundCount > 1 ? "s" : ""}</span>
                          </div>
                          <p className="text-[11px] text-gray-400">Linked from: <span className="text-gray-600">{p.linkedBy.join(", ")}</span></p>
                          {p.addLinkFrom.length > 0 && (
                            <p className="text-[11px] text-gray-500 mt-0.5">Add more from: <span className="text-brand-600 font-mono">{p.addLinkFrom.slice(0, 2).join(", ")}</span></p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specific recommendations */}
                {linkGraph.recommendations.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                      <Link2 size={14} className="text-brand-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Specific Link Recommendations ({linkGraph.recommendations.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {linkGraph.recommendations.map((r, i) => (
                        <div key={i} className="px-5 py-3 text-[11px]">
                          <div className="flex items-center gap-2 mb-0.5">
                            <code className="text-gray-600">{r.from}</code>
                            <span className="text-gray-300">→</span>
                            <code className="text-brand-600 font-medium">{r.to}</code>
                          </div>
                          <p className="text-gray-400">{r.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strong pages */}
                {linkGraph.strongPages.length > 0 && (
                  <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-green-100 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Well-Linked Pages ({linkGraph.strongPages.length})</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 p-4">
                      {linkGraph.strongPages.map(p => (
                        <div key={p.path} className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg text-[11px]">
                          <code className="text-gray-700">{p.path}</code>
                          <span className="text-green-600 font-semibold">{p.inboundCount} links</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === CANNIBALIZATION === */}
        {activeTab === "cannibalization" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" />
                Cannibalization Risks
              </h3>
              <p className="text-xs text-gray-400 mb-4">Pages competing for the same queries. Monitor in GSC — act if one page consistently outranks the other.</p>
              <div className="space-y-3">
                {CANNIBALIZATION.map(({ page1, page2, risk, action }) => (
                  <div key={page1} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <code className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{page1}</code>
                          <span className="text-gray-300 text-xs">↔</span>
                          <code className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{page2}</code>
                          <RiskBadge risk={risk} />
                        </div>
                        <p className="text-xs text-gray-500">{action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
              <p className="font-semibold mb-1">Connect Google Search Console for live ranking data</p>
              <ol className="space-y-0.5 text-blue-600">
                <li>1. Create Google Cloud project and enable Search Console API</li>
                <li>2. Create service account key → Add to GOOGLE_SC_KEY env var in Vercel</li>
                <li>3. Position, impressions, and CTR will populate automatically</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
