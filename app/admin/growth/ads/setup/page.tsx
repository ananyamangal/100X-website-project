"use client"
import { useEffect, useState, useCallback } from "react"
import {
  CheckCircle2, XCircle, AlertTriangle, RotateCw, Play,
  Wifi, WifiOff, ChevronDown, ExternalLink, Megaphone,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncStatus {
  oauthConfigured: boolean
  devTokenConfigured: boolean
  connected: boolean
  connectedEmail: string | null
  hasAdsScope: boolean
  customerId: string | null
  customerName: string | null
  currencyCode: string
  lastSync: { syncedAt: string; counts: Record<string, number>; status: string; errors?: string[] } | null
}

interface AdsCustomer {
  customerId: string
  descriptiveName: string
  currencyCode: string
  isManager: boolean
}

interface AccountsResponse {
  customers: AdsCustomer[]
  selectedCustomerId: string | null
  devTokenMissing?: boolean
  discoveryError?: string
  error?: string
}

interface TestStep {
  id: string; label: string; status: "pass" | "fail" | "warn"; detail: string
}

function StepIcon({ status }: { status: TestStep["status"] }) {
  if (status === "pass") return <CheckCircle2 size={15} className="text-green-500 shrink-0" />
  if (status === "fail") return <XCircle size={15} className="text-red-500 shrink-0" />
  return <AlertTriangle size={15} className="text-amber-500 shrink-0" />
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdsSetup() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [accountsResp, setAccountsResp] = useState<AccountsResponse | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [manualId, setManualId] = useState("")
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; steps: TestStep[] } | null>(null)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(true)

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const justConnected = searchParams?.get("connected") === "1"
  const urlError = searchParams?.get("error")

  const loadStatus = useCallback(async () => {
    setLoading(true)
    const s = await fetch("/api/admin/ads/sync").then(r => r.json()) as SyncStatus
    setSyncStatus(s)
    if (s.customerId) setSelectedId(s.customerId)
    setLoading(false)
  }, [])

  const loadAccounts = useCallback(async () => {
    const d = await fetch("/api/admin/ads/accounts").then(r => r.json()) as AccountsResponse
    setAccountsResp(d)
    if (d.selectedCustomerId && !selectedId) setSelectedId(d.selectedCustomerId)
  }, [selectedId])

  useEffect(() => { loadStatus() }, [loadStatus])

  useEffect(() => {
    if (syncStatus?.connected && syncStatus.hasAdsScope && syncStatus.devTokenConfigured) {
      loadAccounts()
    }
  }, [syncStatus, loadAccounts])

  const saveAccount = async (idOverride?: string) => {
    const id = (idOverride ?? selectedId).replace(/-/g, "")
    if (!id) return
    const customer = accountsResp?.customers.find(c => c.customerId === id)
    setSaving(true)
    await fetch("/api/admin/ads/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: id,
        customerName: customer?.descriptiveName || `Account ${id}`,
        currencyCode: customer?.currencyCode || "INR",
      }),
    })
    await loadStatus()
    setSaving(false)
    setManualId("")
  }

  const runTest = async () => {
    setTesting(true); setTestResult(null)
    const d = await fetch("/api/admin/ads/test", { method: "POST" }).then(r => r.json())
    setTestResult(d)
    setTesting(false)
  }

  const { connected, hasAdsScope, devTokenConfigured, customerId, lastSync } = syncStatus ?? {}

  const showAccountSelector = connected && hasAdsScope && devTokenConfigured

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading
              ? <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
              : connected && hasAdsScope
                ? <Wifi size={18} className="text-green-500" />
                : <WifiOff size={18} className="text-red-400" />}
            <div>
              <h1 className="text-base font-bold text-gray-900">Google Ads Setup</h1>
              <p className="text-gray-400 text-[11px]">
                {loading ? "Checking…"
                  : !connected ? "Connect your Google account first"
                  : !hasAdsScope ? "Ads scope missing — reconnect Google account"
                  : !devTokenConfigured ? "GOOGLE_ADS_DEVELOPER_TOKEN required"
                  : !customerId ? "Select a Google Ads account"
                  : `Account: ${syncStatus?.customerName || customerId}`}
              </p>
            </div>
          </div>
          <button onClick={runTest} disabled={testing}
            className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
            {testing ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
            {testing ? "Testing…" : "Test Connection"}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[860px] space-y-5">

        {justConnected && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Google account connected</p>
              <p className="text-xs text-green-700 mt-0.5">Select your Ads account below, then click <strong>Test Connection</strong>.</p>
            </div>
          </div>
        )}

        {urlError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">OAuth error: {urlError}</p>
          </div>
        )}

        {/* Status card */}
        <div className={`rounded-xl border p-5 shadow-sm ${connected && hasAdsScope && devTokenConfigured ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Status</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {[
              { label: "Google account", value: connected ? (syncStatus?.connectedEmail || "✓ Connected") : "✗ Not connected", ok: !!connected },
              { label: "adwords scope", value: hasAdsScope ? "✓ Granted" : "✗ Missing", ok: !!hasAdsScope },
              { label: "Developer token", value: devTokenConfigured ? "✓ Set" : "✗ Missing", ok: !!devTokenConfigured },
              { label: "Ads account", value: customerId ? (syncStatus?.customerName || customerId) : "Not selected", ok: !!customerId },
            ].map(({ label, value, ok }) => (
              <div key={label}>
                <p className="text-gray-400 mb-0.5">{label}</p>
                <p className={`font-semibold ${ok ? "text-green-700" : "text-red-500"}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Not connected */}
        {!connected && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
            <WifiOff size={24} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-2">Connect a Google account first</p>
            <p className="text-xs text-gray-500 mb-4">Google Ads reuses the same login as Search Console and GA4.</p>
            <a href="/admin/growth/seo/setup"
              className="inline-flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
              Go to Search Console Setup →
            </a>
          </div>
        )}

        {/* Missing adwords scope */}
        {connected && !hasAdsScope && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 mb-1">Ads access not yet granted</p>
                <p className="text-xs text-amber-700 mb-4">Your account was connected before Google Ads support was added. Click below to reconnect — same Google account, one extra permission click.</p>
                <a href="/api/admin/gsc/oauth/start"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700">
                  Reconnect Google Account (add Ads access)
                </a>
                <p className="text-[11px] text-amber-600 mt-2">Grants Search Console + GA4 + Google Ads access. Existing data is not affected.</p>
              </div>
            </div>
          </div>
        )}

        {/* Missing developer token */}
        {connected && hasAdsScope && !devTokenConfigured && (
          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              Add GOOGLE_ADS_DEVELOPER_TOKEN
            </h3>
            <div className="space-y-3 text-xs text-gray-600">
              <ol className="list-decimal list-inside space-y-2">
                <li>Sign in to <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">Google Ads <ExternalLink size={9} /></a></li>
                <li>Click the wrench icon → <strong>API Center</strong></li>
                <li>Copy your <strong>Developer token</strong> (test or approved)</li>
                <li>Go to Vercel → 100X Circle project → <strong>Settings → Environment Variables</strong></li>
                <li>Add: <code className="bg-gray-100 px-1.5 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code> = your token</li>
                <li>Redeploy (Vercel doesn't auto-redeploy on env var changes)</li>
              </ol>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-amber-700">
                <p className="font-semibold mb-0.5">Test token vs. approved token</p>
                <p>A test developer token only works against test accounts. To query real account data, you need an approved (standard or basic access) developer token. Apply in Google Ads → Tools → API Center → Apply for Basic Access.</p>
              </div>
            </div>
          </div>
        )}

        {/* Account selector */}
        {showAccountSelector && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Select Google Ads Account</h3>
            <p className="text-xs text-gray-500 mb-4">Choose the customer account to sync data from.</p>

            {accountsResp?.devTokenMissing ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                Developer token missing — configure it above first.
              </div>
            ) : accountsResp?.discoveryError ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                  <p className="font-semibold mb-1">Auto-discovery failed — enter Customer ID manually</p>
                  <p className="font-mono text-[10px] break-all">{accountsResp.discoveryError}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={manualId}
                    onChange={e => setManualId(e.target.value.replace(/[^\d-]/g, ""))}
                    placeholder="e.g. 123-456-7890"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button onClick={() => saveAccount(manualId.replace(/-/g, ""))} disabled={!manualId || saving}
                    className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 shrink-0">
                    {saving ? <RotateCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">Find your Customer ID in Google Ads (top right, shown as 123-456-7890).</p>
              </div>
            ) : accountsResp && accountsResp.customers.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">— select an account —</option>
                    {accountsResp.customers.map(c => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.descriptiveName} — ID: {c.customerId}{c.isManager ? " (Manager)" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button onClick={() => saveAccount()} disabled={!selectedId || saving}
                  className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 shrink-0">
                  {saving ? <RotateCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <div className="h-9 bg-gray-100 rounded animate-pulse" />
            )}

            {customerId && (
              <p className="text-[11px] text-green-700 mt-3 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} />
                Currently syncing: {syncStatus?.customerName || customerId} (ID: {customerId})
              </p>
            )}
          </div>
        )}

        {/* Last sync */}
        {lastSync && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Last Sync</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${lastSync.status === "ok" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {lastSync.status}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
              {Object.entries(lastSync.counts ?? {}).map(([k, v]) => (
                <div key={k}>
                  <p className="text-gray-400 capitalize">{k}</p>
                  <p className="font-semibold text-gray-800">{String(v)}</p>
                </div>
              ))}
            </div>
            {lastSync.errors && lastSync.errors.length > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {lastSync.errors.map((e, i) => <p key={i} className="text-[11px] text-amber-600 font-mono">{e}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Test results */}
        {testResult && (
          <div className={`rounded-xl border p-5 shadow-sm ${testResult.ok ? "bg-green-50 border-green-200" : "bg-white border-red-200"}`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {testResult.ok ? <CheckCircle2 size={15} className="text-green-500" /> : <XCircle size={15} className="text-red-400" />}
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
                <Megaphone size={13} />
                Fully operational. Go to{" "}
                <a href="/admin/growth/ads/dashboard" className="underline">Ads Dashboard</a>
                {" "}and click <strong>Sync now</strong>.
              </div>
            )}
          </div>
        )}

        {/* About */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">About this integration</h3>
          <div className="space-y-1.5 text-xs text-gray-500">
            <p>Syncs the last 30 days of Google Ads data into MongoDB on demand using GAQL (Google Ads Query Language).</p>
            <p>Stores campaigns, keywords, search terms, device breakdown, geographic data, and conversion actions.</p>
            <p>Reuses the same Google login as Search Console and GA4. No new OAuth credentials required.</p>
            <p className="text-[11px] text-gray-400 mt-2">
              The <code className="bg-gray-100 px-1 rounded">adwords</code> scope must be approved for your Google Ads account.
              In Google Cloud Console → APIs &amp; Services → enable{" "}
              <a href="https://console.cloud.google.com/apis/library/googleads.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">
                Google Ads API <ExternalLink size={9} />
              </a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
