"use client"
import { useEffect, useState, useCallback } from "react"
import { CheckCircle2, XCircle, RotateCw, Play, Clock, ExternalLink, ChevronDown, ChevronRight, Wifi, WifiOff, AlertTriangle, LogOut, Link } from "lucide-react"

interface OAuthStatus {
  oauthConfigured: boolean
  missing: string[]
  connected: boolean
  connectedEmail: string | null
  connectedAt: string | null
  scope: string | null
  tokenExpiresAt: string | null
  siteUrl: string
  redirectUri: string
}

interface SyncInfo {
  connected: boolean
  connectedEmail: string | null
  siteUrl: string
  lastSync: {
    syncedAt: string; queryCount: number; pageCount: number
    status: string; errors?: string[]
  } | null
}

interface TestStep {
  id: string; label: string; status: "pass" | "fail" | "skip" | "warn"; detail: string
}

interface TestResult {
  ok: boolean; steps: TestStep[]
  connectedEmail?: string; siteUrl: string; redirectUri: string; rowsFetched?: number
}

const SITE_URL = "https://www.100xcircle.com/"

function StepIcon({ status }: { status: TestStep["status"] | "pending" | "running" }) {
  if (status === "pass") return <CheckCircle2 size={15} className="text-green-500 shrink-0" />
  if (status === "fail") return <XCircle size={15} className="text-red-500 shrink-0" />
  if (status === "warn") return <AlertTriangle size={15} className="text-amber-500 shrink-0" />
  if (status === "skip") return <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
  if (status === "running") return <RotateCw size={15} className="text-brand-500 animate-spin shrink-0" />
  return <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
}

function Section({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(open)
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {expanded && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  )
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2 text-[11px] font-mono mt-1">
      <span className="flex-1 text-green-400 break-all">{children}</span>
      <button onClick={() => { navigator.clipboard.writeText(children).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="text-gray-500 hover:text-white text-[10px] shrink-0">{copied ? "✓" : "copy"}</button>
    </div>
  )
}

export default function SearchConsoleSetup() {
  const [status, setStatus] = useState<OAuthStatus | null>(null)
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Read URL params (connected=1, error=...)
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const justConnected = searchParams?.get("connected") === "1"
  const urlError = searchParams?.get("error")
  const urlErrorDetail = searchParams?.get("detail")

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([
      fetch("/api/admin/gsc/oauth/status").then(r => r.json()).then(setStatus),
      fetch("/api/admin/gsc/sync").then(r => r.json()).then(setSyncInfo),
    ])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const runTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      const d = await fetch("/api/admin/gsc/test", { method: "POST" }).then(r => r.json()) as TestResult
      setTestResult(d)
    } catch (e) {
      setTestResult({ ok: false, steps: [{ id: "network", label: "Network", status: "fail", detail: String(e) }], siteUrl: SITE_URL, redirectUri: "" })
    }
    setTesting(false)
  }

  const disconnect = async () => {
    if (!confirm("Disconnect your Google account? Existing sync data in MongoDB will not be deleted, but future syncs will stop working until you reconnect.")) return
    setDisconnecting(true)
    await fetch("/api/admin/gsc/oauth/status", { method: "DELETE" })
    await loadAll()
    setDisconnecting(false)
  }

  const connected = status?.connected ?? false
  const oauthConfigured = status?.oauthConfigured ?? false
  const lastSync = syncInfo?.lastSync

  const redirectUri = status?.redirectUri || `https://100-x-website-project.vercel.app/api/admin/gsc/oauth/callback`

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading ? <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
              : connected ? <Wifi size={18} className="text-green-500" />
              : <WifiOff size={18} className="text-red-400" />}
            <div>
              <h1 className="text-base font-bold text-gray-900">Search Console Setup</h1>
              <p className="text-gray-400 text-[11px]">
                {loading ? "Checking…"
                  : connected ? `Connected as ${status?.connectedEmail || "Google account"}`
                  : oauthConfigured ? "OAuth app ready — connect your Google account below"
                  : "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <button onClick={disconnect} disabled={disconnecting}
                className="flex items-center gap-1.5 text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50">
                {disconnecting ? <RotateCw size={11} className="animate-spin" /> : <LogOut size={11} />}
                Disconnect
              </button>
            )}
            <button onClick={runTest} disabled={testing}
              className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {testing ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
              {testing ? "Testing…" : "Test Connection"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[900px] space-y-5">

        {/* Success banner — just connected */}
        {justConnected && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Google account connected successfully</p>
              <p className="text-xs text-green-700 mt-0.5">
                Click <strong>Test Connection</strong> to verify, then go to SEO Command Center and click <strong>Sync now</strong> to pull your first 28 days of data.
              </p>
            </div>
          </div>
        )}

        {/* Error banner — OAuth error */}
        {urlError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {urlError === "access_denied" ? "Access denied — you cancelled the Google sign-in" :
                  urlError === "no_refresh_token" ? "Google did not issue a refresh token" :
                  urlError === "invalid_state" ? "CSRF state mismatch — please try connecting again" :
                  `OAuth error: ${urlError}`}
              </p>
              {urlErrorDetail && <p className="text-[11px] text-red-600 mt-1 font-mono break-all">{decodeURIComponent(urlErrorDetail)}</p>}
              {urlError === "no_refresh_token" && (
                <p className="text-xs text-red-600 mt-1">This happens if Google previously granted access and didn&apos;t re-issue a token. Try: Google Account → Security → Third-party apps → remove this app → try connecting again.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Connection Status ──────────────────────────────────────────────── */}
        <div className={`rounded-xl border p-5 shadow-sm ${connected ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Current Status</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {[
              {
                label: "GOOGLE_OAUTH_CLIENT_ID",
                value: oauthConfigured || !status?.missing.includes("GOOGLE_OAUTH_CLIENT_ID") ? "✓ Set" : "✗ Missing",
                ok: oauthConfigured || !status?.missing.includes("GOOGLE_OAUTH_CLIENT_ID"),
              },
              {
                label: "GOOGLE_OAUTH_CLIENT_SECRET",
                value: oauthConfigured || !status?.missing.includes("GOOGLE_OAUTH_CLIENT_SECRET") ? "✓ Set" : "✗ Missing",
                ok: oauthConfigured || !status?.missing.includes("GOOGLE_OAUTH_CLIENT_SECRET"),
              },
              {
                label: "Google account",
                value: connected ? (status?.connectedEmail || "✓ Connected") : "✗ Not connected",
                ok: connected,
              },
              {
                label: "GOOGLE_SC_SITE_URL",
                value: status?.siteUrl || SITE_URL,
                ok: true,
              },
            ].map(({ label, value, ok }) => (
              <div key={label}>
                <p className="text-gray-400 mb-0.5">{label}</p>
                <p className={`font-semibold ${ok ? "text-green-700" : "text-red-600"}`}>{value}</p>
              </div>
            ))}
            {lastSync && (
              <>
                <div>
                  <p className="text-gray-400 mb-0.5">Last sync</p>
                  <p className="font-medium text-gray-700 flex items-center gap-1"><Clock size={10} />{new Date(lastSync.syncedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">Queries stored</p>
                  <p className="font-medium text-gray-700">{lastSync.queryCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">Pages stored</p>
                  <p className="font-medium text-gray-700">{lastSync.pageCount.toLocaleString()}</p>
                </div>
              </>
            )}
          </div>
          {lastSync?.errors && lastSync.errors.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle size={11} /> Last sync errors:</p>
              {lastSync.errors.map((e, i) => <p key={i} className="text-[11px] text-amber-600 font-mono">{e}</p>)}
            </div>
          )}
        </div>

        {/* ── Connect button ─────────────────────────────────────────────────── */}
        {!connected && (
          <div className={`rounded-xl border p-6 shadow-sm text-center ${oauthConfigured ? "bg-white border-brand-200" : "bg-gray-50 border-gray-200"}`}>
            {oauthConfigured ? (
              <>
                <p className="text-sm font-semibold text-gray-800 mb-1">OAuth app is configured</p>
                <p className="text-xs text-gray-500 mb-4">Click below to sign in with your Google account and grant read-only Search Console access.</p>
                <a href="/api/admin/gsc/oauth/start"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                  <Link size={16} />
                  Connect Google Account
                </a>
                <p className="text-[11px] text-gray-400 mt-3">You will be redirected to Google&apos;s sign-in page. Only read-only Search Console access is requested.</p>
              </>
            ) : (
              <>
                <WifiOff size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-600 mb-1">Set up OAuth credentials first</p>
                <p className="text-xs text-gray-400 mb-1">Missing: <code className="bg-gray-100 px-1 rounded">{(status?.missing || []).join("</code>, <code className='bg-gray-100 px-1 rounded'>")}</code></p>
                <p className="text-xs text-gray-400">Follow the setup guide below, then return here.</p>
              </>
            )}
          </div>
        )}

        {/* ── Test Results ──────────────────────────────────────────────────── */}
        {testResult && (
          <div className={`rounded-xl border p-5 shadow-sm ${testResult.ok ? "bg-green-50 border-green-200" : "bg-white border-red-200"}`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {testResult.ok ? <CheckCircle2 size={15} className="text-green-500" /> : <XCircle size={15} className="text-red-400" />}
              Test Results
              {testResult.connectedEmail && <span className="text-[10px] text-gray-400 font-normal ml-1">{testResult.connectedEmail}</span>}
            </h3>
            <div className="space-y-3">
              {testResult.steps.map(step => (
                <div key={step.id} className="flex items-start gap-3">
                  <StepIcon status={step.status} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">{step.label}</p>
                    <p className={`text-[11px] mt-0.5 ${step.status === "fail" ? "text-red-600" : step.status === "warn" ? "text-amber-600" : "text-gray-500"}`}>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            {testResult.ok && (
              <div className="mt-4 bg-green-100 border border-green-300 rounded-lg px-4 py-3 text-xs text-green-800 font-semibold">
                ✓ Fully operational. Go to SEO Command Center → click &quot;Sync now&quot;.
              </div>
            )}
          </div>
        )}

        {/* ── Setup Guide ────────────────────────────────────────────────────── */}
        <Section title="Step 1 — Create an OAuth 2.0 Client ID in Google Cloud" open={!oauthConfigured}>
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <ol className="space-y-2.5 list-decimal list-inside">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={10} /></a> → select or create a project</li>
              <li>Enable <strong>Google Search Console API</strong>: <a href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">direct link <ExternalLink size={10} /></a></li>
              <li>Go to <strong>APIs &amp; Services → Credentials → Create Credentials → OAuth 2.0 Client ID</strong></li>
              <li>Application type: <strong>Web application</strong></li>
              <li>Name: anything (e.g. <code className="bg-gray-100 px-1 rounded">Growth OS</code>)</li>
              <li>Under <strong>Authorized redirect URIs</strong> → Add URI → paste exactly:
                <Code>{redirectUri}</Code>
                <p className="text-amber-600 mt-1">⚠ This must match exactly — no trailing slash differences.</p>
              </li>
              <li>Click <strong>Create</strong> → copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
            </ol>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-blue-700 mt-2">
              <p className="font-semibold mb-1">Why OAuth instead of a service account?</p>
              <p>Your Google Cloud organization has disabled service account JSON key creation (<code className="bg-blue-100 px-1 rounded text-[10px]">iam.disableServiceAccountKeyCreation</code>). OAuth web flow is more secure — tokens are stored in MongoDB and auto-refresh, no keys to manage.</p>
            </div>
          </div>
        </Section>

        <Section title="Step 2 — Configure OAuth consent screen" open={!oauthConfigured}>
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <p>If prompted to configure the OAuth consent screen before Step 1 completes:</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>User type: <strong>Internal</strong> (since this is for your own Google Workspace account) <em>or</em> External if your Google account is personal</li>
              <li>App name: <code className="bg-gray-100 px-1 rounded">100X Circle Growth OS</code></li>
              <li>User support email: <code className="bg-gray-100 px-1 rounded">sulabh.mangal@gmail.com</code></li>
              <li>Scopes: add <code className="bg-gray-100 px-1 rounded text-[10px]">https://www.googleapis.com/auth/webmasters.readonly</code></li>
              <li>Test users (if External): add <code className="bg-gray-100 px-1 rounded">sulabh.mangal@gmail.com</code></li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
              <strong>Internal vs External:</strong> If your Google account is a personal Gmail (not Google Workspace), choose External. You don&apos;t need to publish the app — keep it in Testing mode and add your email as a test user.
            </div>
          </div>
        </Section>

        <Section title="Step 3 — Add env vars in Vercel" open={!oauthConfigured}>
          <div className="space-y-4 mt-4 text-xs text-gray-600">
            <p>Go to Vercel → 100X Circle project → <strong>Settings → Environment Variables</strong> → add these three:</p>
            <div className="space-y-3">
              {[
                { name: "GOOGLE_OAUTH_CLIENT_ID", value: "your-client-id.apps.googleusercontent.com", note: "From Cloud Console → Credentials → your OAuth 2.0 Client ID" },
                { name: "GOOGLE_OAUTH_CLIENT_SECRET", value: "GOCSPX-...", note: "From Cloud Console → Credentials → Client Secret" },
                { name: "GOOGLE_OAUTH_REDIRECT_URI", value: redirectUri, note: "Must match the redirect URI you registered in Step 1 exactly" },
              ].map(({ name, value, note }) => (
                <div key={name}>
                  <p className="font-semibold text-gray-800 mb-0.5"><code className="bg-gray-100 px-1.5 py-0.5 rounded">{name}</code></p>
                  <Code>{value}</Code>
                  <p className="text-gray-400 mt-0.5">{note}</p>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
              After adding env vars: Vercel does not auto-redeploy. Go to <strong>Deployments → ••• → Redeploy</strong> to apply.
            </div>
            <p className="text-gray-500">Optional: <code className="bg-gray-100 px-1 rounded">GOOGLE_SC_SITE_URL</code> — your Search Console property URL. Current default: <code className="bg-gray-100 px-1 rounded">{SITE_URL}</code></p>
          </div>
        </Section>

        <Section title="Step 4 — Connect your Google account">
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <ol className="space-y-2 list-decimal list-inside">
              <li>After env vars are set and Vercel has redeployed, return to this page</li>
              <li>The &quot;Connect Google Account&quot; button will be enabled</li>
              <li>Click it → you&apos;ll be redirected to Google&apos;s sign-in page</li>
              <li>Sign in with the Google account that has Search Console access to <code className="bg-gray-100 px-1 rounded">{SITE_URL}</code></li>
              <li>Grant <strong>read-only</strong> Search Console access</li>
              <li>You&apos;ll be redirected back here with a success message</li>
              <li>Click <strong>Test Connection</strong> — all 5 steps should pass</li>
              <li>Go to SEO Command Center → click <strong>Sync now</strong></li>
            </ol>
          </div>
        </Section>

        <Section title="Troubleshooting">
          <div className="space-y-4 mt-4 text-xs">
            {[
              { error: "redirect_uri_mismatch", cause: "The redirect URI in your OAuth client doesn't exactly match GOOGLE_OAUTH_REDIRECT_URI.", fix: `In Cloud Console → Credentials → your OAuth 2.0 Client ID → Authorized redirect URIs → make sure this exact URI is listed: ${redirectUri}` },
              { error: "access_denied", cause: "You clicked 'Cancel' on the Google consent screen, or your account is not added as a test user (for External apps).", fix: "For External apps: OAuth consent screen → Test users → add your email. Then try connecting again." },
              { error: "no_refresh_token", cause: "Google didn't issue a refresh token — this happens if you previously granted access and the token wasn't re-issued.", fix: "Go to myaccount.google.com/permissions → find this app → Remove access → click Connect again here." },
              { error: "GSC 403", cause: "The signed-in Google account does not have Search Console access to this property.", fix: `In Google Search Console → ${SITE_URL} → Settings → Users and permissions → verify your email is listed as Owner or Full User.` },
              { error: "GSC 404", cause: "GOOGLE_SC_SITE_URL doesn't match a verified property.", fix: `Check Search Console — does it show ${SITE_URL} with trailing slash? Or without www? Or sc-domain:100xcircle.com? Set GOOGLE_SC_SITE_URL to match exactly.` },
            ].map(({ error, cause, fix }) => (
              <div key={error} className="border border-gray-200 rounded-xl p-4">
                <p className="font-semibold text-red-600 mb-1">{error}</p>
                <p className="text-gray-600 mb-1"><strong>Cause:</strong> {cause}</p>
                <p className="text-gray-600"><strong>Fix:</strong> {fix}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Future integrations ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Future integrations — same Google login</h3>
          <div className="space-y-2 text-xs text-gray-500">
            <p>The OAuth infrastructure is built to support multiple Google products from one connected account.</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              {[
                { name: "Search Console", scope: "webmasters.readonly", status: "active" },
                { name: "Google Analytics 4", scope: "analytics.readonly", status: "planned" },
                { name: "Google Ads", scope: "adwords", status: "planned" },
              ].map(({ name, scope, status: s }) => (
                <div key={name} className={`rounded-lg border p-3 ${s === "active" ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                  <p className={`font-semibold text-xs mb-0.5 ${s === "active" ? "text-green-700" : "text-gray-500"}`}>{name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{scope}</p>
                  <p className={`text-[10px] mt-1 font-semibold ${s === "active" ? "text-green-600" : "text-gray-400"}`}>{s === "active" ? "✓ Connected" : "Coming soon"}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">When GA4 or Ads is added, you will be asked to reconnect with expanded scopes — same Google account, one additional click.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
