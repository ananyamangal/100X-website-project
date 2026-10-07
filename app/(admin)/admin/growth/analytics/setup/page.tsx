"use client"
import { useEffect, useState, useCallback } from "react"
import {
  CheckCircle2, XCircle, AlertTriangle, RotateCw, Play,
  Wifi, WifiOff, ChevronDown, ExternalLink, BarChart2,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncStatus {
  oauthConfigured: boolean
  connected: boolean
  connectedEmail: string | null
  hasAnalyticsScope: boolean
  propertyId: string | null
  propertyName: string | null
  lastSync: { syncedAt: string; counts: Record<string, number>; status: string; errors?: string[] } | null
}

interface GA4Property {
  propertyId: string
  displayName: string
  accountName: string
}

interface PropertiesResponse {
  properties: GA4Property[]
  selectedPropertyId: string | null
  adminApiDisabled?: boolean
  adminApiError?: string
  error?: string
  message?: string
}

interface TestStep {
  id: string; label: string; status: "pass" | "fail" | "warn"; detail: string
}

// ── Small components ──────────────────────────────────────────────────────────

function StepIcon({ status }: { status: TestStep["status"] }) {
  if (status === "pass") return <CheckCircle2 size={15} className="text-green-500 shrink-0" />
  if (status === "fail") return <XCircle size={15} className="text-red-500 shrink-0" />
  return <AlertTriangle size={15} className="text-amber-500 shrink-0" />
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GA4Setup() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [propertiesResp, setPropertiesResp] = useState<PropertiesResponse | null>(null)
  const [selectedId, setSelectedId] = useState<string>("")
  const [manualId, setManualId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; steps: TestStep[]; properties?: GA4Property[] } | null>(null)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(true)

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const justConnected = searchParams?.get("connected") === "1"
  const urlError = searchParams?.get("error")

  const loadStatus = useCallback(async () => {
    setLoading(true)
    const s = await fetch("/api/admin/ga4/sync").then(r => r.json()) as SyncStatus
    setSyncStatus(s)
    setLoading(false)
    if (s.propertyId) setSelectedId(s.propertyId)
  }, [])

  const loadProperties = useCallback(async () => {
    const d = await fetch("/api/admin/ga4/properties").then(r => r.json()) as PropertiesResponse
    setPropertiesResp(d)
    if (d.selectedPropertyId && !selectedId) setSelectedId(d.selectedPropertyId)
  }, [selectedId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (syncStatus?.connected && syncStatus.hasAnalyticsScope) {
      loadProperties()
    }
  }, [syncStatus, loadProperties])

  const saveProperty = async (idOverride?: string) => {
    const idToSave = idOverride ?? selectedId
    if (!idToSave) return
    const prop = propertiesResp?.properties.find(p => p.propertyId === idToSave)
    setSaving(true)
    await fetch("/api/admin/ga4/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: idToSave.trim(),
        propertyName: prop?.displayName || `Property ${idToSave.trim()}`,
        accountName: prop?.accountName || "",
      }),
    })
    await loadStatus()
    setSaving(false)
  }

  const saveManualId = async () => {
    const id = manualId.trim().replace(/\D/g, "") // strip non-digits
    if (!id) return
    await saveProperty(id)
    setManualId("")
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    const d = await fetch("/api/admin/ga4/test", { method: "POST" }).then(r => r.json())
    setTestResult(d)
    setTesting(false)
  }

  const { connected, hasAnalyticsScope, propertyId, lastSync } = syncStatus ?? {}

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading
              ? <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
              : connected && hasAnalyticsScope
                ? <Wifi size={18} className="text-green-500" />
                : <WifiOff size={18} className="text-red-400" />}
            <div>
              <h1 className="text-base font-bold text-gray-900">GA4 Analytics Setup</h1>
              <p className="text-gray-400 text-[11px]">
                {loading ? "Checking…"
                  : !connected ? "Connect your Google account first (via Search Console Setup)"
                  : !hasAnalyticsScope ? "Analytics scope missing — reconnect Google account below"
                  : !propertyId ? "Select a GA4 property to start syncing"
                  : `Property: ${syncStatus?.propertyName || propertyId}`}
              </p>
            </div>
          </div>
          <button
            onClick={runTest}
            disabled={testing}
            className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {testing ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
            {testing ? "Testing…" : "Test Connection"}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[860px] space-y-5">

        {/* Success banner */}
        {justConnected && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Google account connected</p>
              <p className="text-xs text-green-700 mt-0.5">Select your GA4 property below, save it, then click <strong>Test Connection</strong>.</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {urlError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">OAuth error: {urlError}</p>
          </div>
        )}

        {/* Status card */}
        <div className={`rounded-xl border p-5 shadow-sm ${connected && hasAnalyticsScope ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Status</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {[
              {
                label: "Google account",
                value: connected ? (syncStatus?.connectedEmail || "✓ Connected") : "✗ Not connected",
                ok: !!connected,
              },
              {
                label: "analytics.readonly scope",
                value: hasAnalyticsScope ? "✓ Granted" : "✗ Missing",
                ok: !!hasAnalyticsScope,
              },
              {
                label: "GA4 property",
                value: propertyId ? (syncStatus?.propertyName || propertyId) : "Not selected",
                ok: !!propertyId,
              },
              {
                label: "Last sync",
                value: lastSync ? new Date(lastSync.syncedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never",
                ok: !!lastSync,
              },
            ].map(({ label, value, ok }) => (
              <div key={label}>
                <p className="text-gray-400 mb-0.5">{label}</p>
                <p className={`font-semibold ${ok ? "text-green-700" : "text-red-500"}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Not connected at all */}
        {!connected && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
            <WifiOff size={24} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-2">Connect a Google account first</p>
            <p className="text-xs text-gray-500 mb-4">GA4 reuses the same Google login as Search Console. Connect once, both integrations use it.</p>
            <a
              href="/admin/growth/seo/setup"
              className="inline-flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
            >
              Go to Search Console Setup →
            </a>
          </div>
        )}

        {/* Connected but missing analytics scope */}
        {connected && !hasAnalyticsScope && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 mb-1">Analytics access not yet granted</p>
                <p className="text-xs text-amber-700 mb-4">
                  Your Google account is connected for Search Console but was linked before GA4 support was added.
                  Click below to reconnect — same Google account, one extra permission click.
                </p>
                <a
                  href="/api/admin/gsc/oauth/start"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700"
                >
                  Reconnect Google Account (add Analytics access)
                </a>
                <p className="text-[11px] text-amber-600 mt-2">
                  This will re-grant both Search Console and Google Analytics read access. Existing sync data is not affected.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Property selector */}
        {connected && hasAnalyticsScope && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">GA4 Property</h3>
            <p className="text-xs text-gray-500 mb-4">Choose the GA4 property to sync analytics data from.</p>

            {/* Admin API disabled — manual entry */}
            {propertiesResp?.adminApiDisabled ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                  <p className="font-semibold mb-1">Analytics Admin API not enabled — enter Property ID manually</p>
                  <p>
                    Property auto-discovery uses a separate Google Cloud API
                    (<code className="bg-amber-100 px-1 rounded">analyticsadmin.googleapis.com</code>)
                    that is not enabled in this project. Data sync uses only the Data API which is working correctly.
                    Enter your GA4 Property ID directly below.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={manualId}
                    onChange={e => setManualId(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 520046025"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={saveManualId}
                    disabled={!manualId.trim() || saving}
                    className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 shrink-0"
                  >
                    {saving ? <RotateCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Find your Property ID in Google Analytics → Admin → Property Settings → Property ID (numeric).
                </p>
              </div>
            ) : propertiesResp?.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700">
                <p className="font-semibold mb-1">Could not load properties</p>
                <p>{propertiesResp.message}</p>
              </div>
            ) : propertiesResp && propertiesResp.properties.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
                No GA4 properties found on this Google account. Make sure the connected account has access to at least one GA4 property in{" "}
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">
                  Google Analytics <ExternalLink size={10} />
                </a>.
              </div>
            ) : propertiesResp && propertiesResp.properties.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">— select a property —</option>
                    {propertiesResp.properties.map(p => (
                      <option key={p.propertyId} value={p.propertyId}>
                        {p.displayName} ({p.accountName}) — ID: {p.propertyId}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button
                  onClick={() => saveProperty()}
                  disabled={!selectedId || saving}
                  className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 shrink-0"
                >
                  {saving ? <RotateCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                  {saving ? "Saving…" : "Save Property"}
                </button>
              </div>
            ) : (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            )}

            {propertyId && (
              <p className="text-[11px] text-green-700 mt-3 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} />
                Currently syncing: {syncStatus?.propertyName || propertyId} (ID: {propertyId})
              </p>
            )}
          </div>
        )}

        {/* Last sync summary */}
        {lastSync && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Last Sync</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${lastSync.status === "ok" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {lastSync.status}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {Object.entries(lastSync.counts ?? {}).map(([k, v]) => (
                <div key={k}>
                  <p className="text-gray-400 capitalize">{k}</p>
                  <p className="font-semibold text-gray-800">{String(v)} rows</p>
                </div>
              ))}
            </div>
            {lastSync.errors && lastSync.errors.length > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {lastSync.errors.map((e, i) => (
                  <p key={i} className="text-[11px] text-amber-600 font-mono">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test results */}
        {testResult && (
          <div className={`rounded-xl border p-5 shadow-sm ${testResult.ok ? "bg-green-50 border-green-200" : "bg-white border-red-200"}`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {testResult.ok
                ? <CheckCircle2 size={15} className="text-green-500" />
                : <XCircle size={15} className="text-red-400" />}
              Test Results
            </h3>
            <div className="space-y-3">
              {testResult.steps.map(step => (
                <div key={step.id} className="flex items-start gap-3">
                  <StepIcon status={step.status} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">{step.label}</p>
                    <p className={`text-[11px] mt-0.5 ${step.status === "fail" ? "text-red-600" : step.status === "warn" ? "text-amber-600" : "text-gray-500"}`}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {testResult.ok && (
              <div className="mt-4 bg-green-100 border border-green-300 rounded-lg px-4 py-3 text-xs text-green-800 font-semibold flex items-center gap-2">
                <BarChart2 size={13} />
                Data API operational. Go to{" "}
                <a href="/admin/growth/analytics" className="underline">Analytics Dashboard</a>{" "}
                and click <strong>Sync now</strong>.
              </div>
            )}
          </div>
        )}

        {/* Info footer */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">About this integration</h3>
          <div className="space-y-1.5 text-xs text-gray-500">
            <p>Syncs the last 28 days of GA4 data into MongoDB on demand. Stores: active users, new users, sessions, engagement rate, avg session duration, page views, landing pages, traffic sources, and conversions.</p>
            <p>No new OAuth credentials needed — reuses the same Google login as Search Console.</p>
            <p>The GA4 Data API and Admin API are both covered by the <code className="bg-gray-100 px-1 rounded text-[10px]">analytics.readonly</code> scope.</p>
            <p className="text-[11px] text-gray-400 mt-2">
              To enable: in Google Cloud Console → APIs &amp; Services → Enable both{" "}
              <a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">
                Google Analytics Data API <ExternalLink size={9} />
              </a>{" "}
              and{" "}
              <a href="https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">
                Google Analytics Admin API <ExternalLink size={9} />
              </a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
