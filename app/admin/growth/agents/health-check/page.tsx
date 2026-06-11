"use client"
import { useState, useEffect, useCallback } from "react"
import {
  ShieldCheck, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Zap, Clock, Hash, DollarSign, ExternalLink,
  Copy, Check,
} from "lucide-react"

interface ConnectivityResult {
  reachable:  boolean
  model:      string
  latencyMs:  number
  tokens:     number
  error:      string | null
}

interface ModuleResult {
  id:              string
  name:            string
  description?:    string
  apiKeyPresent:   boolean
  claudeReachable: boolean
  modelWorking:    boolean
  jsonParseable?:  boolean
  model?:          string
  latencyMs:       number
  tokensReturned:  number
  inputTokens?:    number
  outputTokens?:   number
  costUSD:         number
  costINR:         number
  rawResponse?:    string
  parsedSample?:   unknown
  storedInMongo?:  boolean
  error:           string | null
  testedAt?:       string
  note?:           string
}

interface HealthCheckStatus {
  ok:            boolean
  checkedAt:     string
  apiKeyPresent: boolean
  keyPrefix:     string
  connectivity?: ConnectivityResult
  diagnosis?: {
    root_cause: string
    impact:     string
    fix_steps:  string[]
    local_fix:  string
  }
  modules: ModuleResult[]
}

interface TestReport {
  ok:      boolean
  testedAt: string
  summary: {
    totalModules:  number
    passing:       number
    failing:       number
    totalTokens:   number
    totalCostUSD:  number
    totalCostINR:  number
    avgLatencyMs:  number
  }
  modules: ModuleResult[]
}

function StatusDot({ ok, size = 14 }: { ok: boolean; size?: number }) {
  return ok
    ? <CheckCircle size={size} className="text-green-400 shrink-0" />
    : <XCircle size={size} className="text-red-400 shrink-0" />
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-gray-500 hover:text-gray-300 transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  )
}

export default function AIHealthCheckPage() {
  const [status,   setStatus]   = useState<HealthCheckStatus | null>(null)
  const [report,   setReport]   = useState<TestReport | null>(null)
  const [checking, setChecking] = useState(false)
  const [testing,  setTesting]  = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [error,    setError]    = useState("")

  const runCheck = useCallback(async () => {
    setChecking(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/growth/agents/health-check")
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error")
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { runCheck() }, [runCheck])

  async function runAllTests() {
    setTesting(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/growth/agents/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_all" }),
      })
      const data = await res.json()
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error")
    } finally {
      setTesting(false)
    }
  }

  async function runSingleTest(moduleId: string) {
    setTestingId(moduleId)
    try {
      const res  = await fetch("/api/admin/growth/agents/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      })
      const data = await res.json()
      if (data.modules?.[0]) {
        setReport(prev => prev ? {
          ...prev,
          modules: prev.modules.map(m => m.id === moduleId ? data.modules[0] : m),
          ok: data.ok,
        } : data)
      }
    } finally {
      setTestingId(null)
    }
  }

  const keyMissing = status && !status.apiKeyPresent

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-400" />
            AI Module Health Check
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Verifies Anthropic API key, connectivity, and real generation for all Claude-powered modules
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={runCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
            Recheck
          </button>
          {status?.apiKeyPresent && (
            <button
              onClick={runAllTests}
              disabled={testing}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {testing ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
              {testing ? "Testing…" : "Run Real Tests"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle size={14} />{error}
        </div>
      )}

      {/* API Key Missing Banner */}
      {keyMissing && status.diagnosis && (
        <div className="bg-red-950/60 border border-red-500/40 rounded-xl overflow-hidden">
          <div className="flex items-start gap-3 p-5">
            <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-red-400 mb-1">ANTHROPIC_API_KEY is not configured</h2>
              <p className="text-sm text-red-300/80 mb-3">{status.diagnosis.impact}</p>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Steps to fix:</p>
                {status.diagnosis.fix_steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-200">
                    <span className="text-red-500 shrink-0 font-bold">{i + 1}.</span>
                    <span>{step.replace(/^\d+\. /, "")}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-gray-900/60 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">For local development (.env.local):</span>
                  <CopyButton text="ANTHROPIC_API_KEY=sk-ant-your-key-here" />
                </div>
                <code className="text-xs text-green-400 font-mono">ANTHROPIC_API_KEY=sk-ant-your-key-here</code>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <ExternalLink size={11} />Get your API key from console.anthropic.com
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connectivity status */}
      {status?.apiKeyPresent && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`border rounded-xl p-4 ${status.connectivity?.reachable ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <div className="flex items-center gap-2 mb-2">
              <StatusDot ok={status.apiKeyPresent} />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">API Key</span>
            </div>
            <div className="text-lg font-bold text-white font-mono">{status.keyPrefix}</div>
            <div className="text-xs text-gray-500 mt-1">Present in server environment</div>
          </div>
          <div className={`border rounded-xl p-4 ${status.connectivity?.reachable ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <div className="flex items-center gap-2 mb-2">
              <StatusDot ok={status.connectivity?.reachable ?? false} />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Claude Reachable</span>
            </div>
            <div className="text-lg font-bold text-white">{status.connectivity?.reachable ? "Yes" : "No"}</div>
            <div className="text-xs text-gray-500 mt-1">
              {status.connectivity?.reachable
                ? `${status.connectivity.latencyMs}ms · ${status.connectivity.tokens} tokens`
                : status.connectivity?.error?.slice(0, 60) ?? "Not tested"
              }
            </div>
          </div>
          <div className={`border rounded-xl p-4 ${status.ok ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
            <div className="flex items-center gap-2 mb-2">
              <StatusDot ok={status.ok} />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Overall</span>
            </div>
            <div className={`text-lg font-bold ${status.ok ? "text-green-400" : "text-amber-400"}`}>
              {status.ok ? "Operational" : "Needs Attention"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(status.checkedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", timeStyle: "short", dateStyle: "short" })}
            </div>
          </div>
        </div>
      )}

      {/* Module status table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Module Status</span>
          {report && (
            <span className="text-xs text-gray-500">
              {report.summary.passing}/{report.summary.totalModules} passing ·
              {report.summary.totalTokens} tokens ·
              ₹{report.summary.totalCostINR} total cost
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="px-4 py-3 text-left font-medium">Module</th>
                <th className="px-4 py-3 text-center font-medium">API Key</th>
                <th className="px-4 py-3 text-center font-medium">Claude Reachable</th>
                <th className="px-4 py-3 text-center font-medium">Model Working</th>
                <th className="px-4 py-3 text-right font-medium">Latency</th>
                <th className="px-4 py-3 text-right font-medium">Tokens</th>
                <th className="px-4 py-3 text-right font-medium">Cost (₹)</th>
                <th className="px-4 py-3 text-center font-medium">In MongoDB</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(report?.modules ?? status?.modules ?? []).map(mod => {
                const tested = report?.modules.find(r => r.id === mod.id) ?? mod
                return (
                  <tr key={mod.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{mod.name}</div>
                      {mod.description && <div className="text-gray-600 text-[10px] mt-0.5">{mod.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tested.apiKeyPresent
                        ? <CheckCircle size={13} className="text-green-400 mx-auto" />
                        : <XCircle size={13} className="text-red-400 mx-auto" />
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tested.claudeReachable !== undefined
                        ? tested.claudeReachable
                          ? <CheckCircle size={13} className="text-green-400 mx-auto" />
                          : <XCircle size={13} className="text-red-400 mx-auto" />
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tested.modelWorking !== undefined
                        ? tested.modelWorking
                          ? <CheckCircle size={13} className="text-green-400 mx-auto" />
                          : <XCircle size={13} className="text-red-400 mx-auto" />
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {tested.latencyMs > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <Clock size={10} />
                          {tested.latencyMs}ms
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {tested.tokensReturned > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <Hash size={10} />
                          {tested.tokensReturned}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {tested.costINR > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <DollarSign size={10} />
                          ₹{tested.costINR.toFixed(4)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tested.storedInMongo !== undefined
                        ? tested.storedInMongo
                          ? <CheckCircle size={13} className="text-green-400 mx-auto" />
                          : <span className="text-gray-600 text-[10px]">not tested</span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {status?.apiKeyPresent && (
                        <button
                          onClick={() => runSingleTest(mod.id)}
                          disabled={testingId === mod.id}
                          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                        >
                          {testingId === mod.id
                            ? <><RefreshCw size={10} className="animate-spin" />Testing…</>
                            : <><Zap size={10} />Test</>
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test responses */}
      {report?.modules.some(m => m.rawResponse) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Raw Claude Responses</span>
          </div>
          <div className="divide-y divide-gray-800">
            {report.modules.filter(m => m.rawResponse).map(m => (
              <div key={m.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StatusDot ok={m.modelWorking} size={11} />
                  <span className="text-xs font-medium text-gray-300">{m.name}</span>
                  {m.jsonParseable && (
                    <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/25 px-1.5 py-0.5 rounded-full">JSON valid</span>
                  )}
                  <span className="text-[10px] text-gray-600 ml-auto">{m.latencyMs}ms · {m.tokensReturned} tok · ₹{m.costINR?.toFixed(4)}</span>
                </div>
                <pre className="text-xs text-gray-400 bg-gray-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                  {m.rawResponse}
                </pre>
                {m.error && (
                  <div className="mt-2 text-xs text-red-400 bg-red-950/30 rounded p-2">{m.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary after test */}
      {report && (
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${report.ok ? "border-green-500/25 bg-green-500/5" : "border-red-500/25 bg-red-500/5"}`}>
          <StatusDot ok={report.ok} size={18} />
          <div>
            <p className={`text-sm font-semibold ${report.ok ? "text-green-400" : "text-red-400"}`}>
              {report.ok
                ? `All ${report.summary.passing} modules operational — production-ready`
                : `${report.summary.failing} module(s) failing — do not proceed to V2 features`
              }
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {report.summary.totalTokens} tokens · ₹{report.summary.totalCostINR} total ·
              avg {report.summary.avgLatencyMs}ms latency ·
              {new Date(report.testedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
