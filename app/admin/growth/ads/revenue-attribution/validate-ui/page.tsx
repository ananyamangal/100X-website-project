// TEMPORARY — delete after revenue attribution validation is complete.
"use client"

import { useState, useEffect } from "react"

export default function ValidateUI() {
  const [role,    setRole]    = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then(r => r.json())
      .then(d => setRole(d?.user?.role ?? "unknown"))
      .catch(() => setRole("unknown"))
  }, [])

  if (role === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Checking access…</p>
      </div>
    )
  }

  if (role !== "super_admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-sm">Access denied — super_admin only.</p>
      </div>
    )
  }

  const run = async () => {
    setRunning(true)
    setResult(null)
    setError(null)
    setCopied(false)
    try {
      const res  = await fetch("/api/admin/growth/ads/revenue-attribution/validate", { method: "POST" })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  const copy = () => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs text-yellow-500 font-mono mb-1">TEMPORARY PAGE — delete after use</p>
          <h1 className="text-xl font-bold text-white">Revenue Attribution Validator</h1>
          <p className="text-gray-400 text-sm mt-1">
            Runs sync across all lead sources, checks UTM/keyword/cost coverage, and returns a quality score.
          </p>
        </div>

        {/* Run button */}
        <button
          onClick={run}
          disabled={running}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {running ? "Running validation… (up to 2 min)" : "Run Revenue Attribution Validation"}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-mono">Result</p>
              <button
                onClick={copy}
                className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-gray-300 transition-colors"
              >
                {copied ? "Copied ✓" : "Copy to clipboard"}
              </button>
            </div>
            <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-green-300 font-mono overflow-auto max-h-[70vh] whitespace-pre-wrap break-words">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
