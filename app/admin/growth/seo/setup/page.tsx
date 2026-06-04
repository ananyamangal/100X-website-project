"use client"
import { useEffect, useState, useCallback } from "react"
import { CheckCircle2, XCircle, RotateCw, Play, Clock, ExternalLink, Copy, ChevronDown, ChevronRight, Wifi, WifiOff, AlertTriangle } from "lucide-react"

interface SyncStatus {
  configured: boolean
  siteUrl: string
  lastSync: {
    syncedAt: string
    queryCount: number
    pageCount: number
    status: "ok" | "partial" | "error"
    errors?: string[]
  } | null
}

interface TestStep {
  id: string
  label: string
  status: "pass" | "fail" | "skip"
  detail: string
}

interface TestResult {
  ok: boolean
  steps: TestStep[]
  siteUrl: string
  serviceAccountEmail?: string
  rowsFetched?: number
  error?: string
}

const SITE_URL = "https://www.100xcircle.com/"

function StepIcon({ status }: { status: "pass" | "fail" | "skip" | "pending" | "running" }) {
  if (status === "pass") return <CheckCircle2 size={16} className="text-green-500 shrink-0" />
  if (status === "fail") return <XCircle size={16} className="text-red-500 shrink-0" />
  if (status === "running") return <RotateCw size={16} className="text-brand-500 animate-spin shrink-0" />
  if (status === "skip") return <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
  return <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors" title="Copy">
      <Copy size={11} />
      {copied && <span className="ml-1 text-[10px] text-green-600">Copied</span>}
    </button>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-900 text-green-400 rounded-lg px-3 py-2 text-[11px] font-mono mt-1">
      <span className="flex-1">{children}</span>
      <CopyButton text={children} />
    </div>
  )
}

function Section({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(open)
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {expanded && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  )
}

export default function SearchConsoleSetup() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const d = await fetch("/api/admin/gsc/sync").then(r => r.json()) as SyncStatus
      setSyncStatus(d)
    } catch {}
    setLoadingStatus(false)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const d = await fetch("/api/admin/gsc/test", { method: "POST" }).then(r => r.json()) as TestResult
      setTestResult(d)
      await loadStatus()
    } catch (e) {
      setTestResult({ ok: false, steps: [{ id: "network", label: "Network", status: "fail", detail: String(e) }], siteUrl: SITE_URL })
    }
    setTesting(false)
  }

  const configured = syncStatus?.configured ?? false
  const lastSync = syncStatus?.lastSync
  const hasErrors = lastSync?.errors && lastSync.errors.length > 0

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loadingStatus ? (
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
            ) : configured ? (
              <Wifi size={18} className="text-green-500" />
            ) : (
              <WifiOff size={18} className="text-red-400" />
            )}
            <div>
              <h1 className="text-base font-bold text-gray-900">Search Console Setup</h1>
              <p className="text-gray-400 text-[11px]">
                {loadingStatus ? "Checking configuration…" :
                  configured ? "Google Search Console is connected" :
                  "Not connected — follow the steps below"}
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

      <div className="px-8 py-6 max-w-[900px] space-y-5">

        {/* ── Live Connection Status ─────────────────────────────────────── */}
        <div className={`rounded-xl border p-5 shadow-sm ${configured ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-start gap-3">
            {configured ? <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> : <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className={`text-sm font-semibold ${configured ? "text-green-800" : "text-red-800"}`}>
                  {configured ? "Connected" : "Not Connected"}
                </p>
                {lastSync && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${lastSync.status === "ok" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    Last sync: {lastSync.status}
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500 mb-0.5">GOOGLE_SC_KEY</p>
                  <p className={`font-medium ${configured ? "text-green-700" : "text-red-600"}`}>
                    {configured ? "✓ Set" : "✗ Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">GOOGLE_SC_SITE_URL</p>
                  <p className={`font-medium ${syncStatus?.siteUrl ? "text-green-700" : "text-red-600"}`}>
                    {syncStatus?.siteUrl || "✗ Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Last sync</p>
                  <p className="font-medium text-gray-700 flex items-center gap-1">
                    <Clock size={10} />
                    {lastSync ? new Date(lastSync.syncedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}
                  </p>
                </div>
                {lastSync && (
                  <>
                    <div>
                      <p className="text-gray-500 mb-0.5">Queries stored</p>
                      <p className="font-medium text-gray-700">{lastSync.queryCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">Pages stored</p>
                      <p className="font-medium text-gray-700">{lastSync.pageCount.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
              {hasErrors && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle size={11} /> Last sync had errors:</p>
                  {lastSync!.errors!.map((e, i) => <p key={i} className="text-[11px] text-amber-600 font-mono">{e}</p>)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Live Test Results ────────────────────────────────────────────── */}
        {testResult && (
          <div className={`rounded-xl border p-5 shadow-sm ${testResult.ok ? "bg-green-50 border-green-200" : "bg-white border-red-200"}`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {testResult.ok ? <CheckCircle2 size={15} className="text-green-500" /> : <XCircle size={15} className="text-red-400" />}
              Connection Test Results
              {testResult.serviceAccountEmail && <span className="text-[10px] text-gray-400 font-normal">{testResult.serviceAccountEmail}</span>}
            </h3>
            <div className="space-y-3">
              {testResult.steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <StepIcon status={step.status} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">{step.label}</p>
                    <p className={`text-[11px] mt-0.5 ${step.status === "fail" ? "text-red-600" : "text-gray-500"}`}>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            {testResult.ok && (
              <div className="mt-4 bg-green-100 border border-green-300 rounded-lg px-4 py-3 text-xs text-green-800 font-semibold">
                ✓ Ready to sync. Go to SEO Command Center → click &quot;Sync now&quot; to pull your first 28 days of data.
              </div>
            )}
          </div>
        )}

        {/* ── Step-by-step guide ───────────────────────────────────────────── */}
        <Section title="Step 1 — Create a Google Cloud project (skip if you already have one)" open={!configured}>
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <p>You need a Google Cloud project to host the service account. If you already have one, skip this step.</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline flex items-center gap-1 inline-flex">console.cloud.google.com <ExternalLink size={10} /></a></li>
              <li>Click <strong>Select a project → New Project</strong></li>
              <li>Name it anything (e.g. <code className="bg-gray-100 px-1 rounded">100x-growth-os</code>)</li>
            </ol>
          </div>
        </Section>

        <Section title="Step 2 — Enable the Search Console API" open={!configured}>
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <p>Exactly one API needs to be enabled. No others.</p>
            <p className="font-semibold">API to enable: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">searchconsole.googleapis.com</code></p>
            <a href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-50">
              <ExternalLink size={12} /> Open Search Console API in Cloud Console
            </a>
            <p className="text-gray-500">Click <strong>Enable</strong>. That&apos;s it for this step.</p>
          </div>
        </Section>

        <Section title="Step 3 — Create a service account and download the JSON key" open={!configured}>
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <ol className="space-y-3 list-decimal list-inside">
              <li>In Google Cloud Console → <strong>IAM &amp; Admin → Service Accounts → Create Service Account</strong></li>
              <li>Name: anything (e.g. <code className="bg-gray-100 px-1 rounded">growth-os-sync</code>)</li>
              <li>Description: <code className="bg-gray-100 px-1 rounded">Growth OS GSC read-only access</code></li>
              <li>Click <strong>Create and Continue</strong></li>
              <li>On the &quot;Grant this service account access to project&quot; step: <strong>skip it</strong> (leave blank, click Continue)</li>
              <li>Click <strong>Done</strong></li>
              <li>In the service accounts list, click the email → <strong>Keys → Add Key → Create new key → JSON</strong></li>
              <li>A JSON file downloads. <strong>Keep it safe</strong> — this is your key.</li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
              <strong>IAM roles in GCP:</strong> You do NOT need to assign any GCP role to this service account. Access to Search Console data is controlled inside Search Console (next step).
            </div>
            <p>Your service account email will look like:</p>
            <CodeBlock>growth-os-sync@your-project-id.iam.gserviceaccount.com</CodeBlock>
          </div>
        </Section>

        <Section title="Step 4 — Add the service account to Search Console" open={!configured}>
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <p>This is the step most people miss. The service account must be granted access <strong>inside Search Console</strong>, not in Google Cloud.</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://search.google.com/search-console/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">Google Search Console <ExternalLink size={10} /></a></li>
              <li>Select the <strong>{SITE_URL}</strong> property</li>
              <li>Left sidebar → <strong>Settings</strong> → <strong>Users and permissions</strong></li>
              <li>Click <strong>Add user</strong></li>
              <li>Enter the service account email from Step 3</li>
              <li>Permission: <strong>Owner</strong></li>
              <li>Click <strong>Add</strong></li>
            </ol>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700">
              <strong>Why Owner?</strong> &quot;Restricted user&quot; cannot access Search Analytics data. &quot;Full user&quot; and &quot;Owner&quot; both work. Owner is recommended.
            </div>
            <p>The property in Search Console must show:</p>
            <CodeBlock>{SITE_URL}</CodeBlock>
            <p className="text-gray-500">If it shows a different URL (without www, or with sc-domain:), use that exact URL as <code className="bg-gray-100 px-1 rounded">GOOGLE_SC_SITE_URL</code>.</p>
          </div>
        </Section>

        <Section title="Step 5 — Add environment variables in Vercel" open={!configured}>
          <div className="space-y-4 mt-4 text-xs text-gray-600">
            <p>Go to your <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline inline-flex items-center gap-0.5">Vercel dashboard <ExternalLink size={10} /></a> → 100X Circle project → <strong>Settings → Environment Variables</strong></p>

            <div>
              <p className="font-semibold text-gray-800 mb-1">Variable 1: <code className="bg-gray-100 px-1.5 py-0.5 rounded">GOOGLE_SC_KEY</code></p>
              <p className="mb-1">Value: the <strong>entire contents</strong> of the JSON key file you downloaded in Step 3. Open the file in a text editor, select all, copy, paste into Vercel.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-[10px] text-gray-600 overflow-x-auto whitespace-pre">{`{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\\nMIIE...\\n-----END RSA PRIVATE KEY-----\\n",
  "client_email": "growth-os-sync@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}`}</div>
            </div>

            <div>
              <p className="font-semibold text-gray-800 mb-1">Variable 2: <code className="bg-gray-100 px-1.5 py-0.5 rounded">GOOGLE_SC_SITE_URL</code></p>
              <p className="mb-1">Value: the exact property URL as shown in Search Console (copy-paste it, don&apos;t type it).</p>
              <CodeBlock>{SITE_URL}</CodeBlock>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
              <strong>After adding env vars:</strong> Vercel does not auto-redeploy. Trigger a redeploy manually: Deployments → &quot;...&quot; → Redeploy.
            </div>
          </div>
        </Section>

        <Section title="Step 6 — Verify and sync" open>
          <div className="space-y-3 mt-4 text-xs text-gray-600">
            <p>After setting env vars and redeploying:</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Click <strong>Test Connection</strong> at the top of this page</li>
              <li>All 5 steps should show green checkmarks</li>
              <li>If anything fails, the error message tells you exactly which step to revisit</li>
              <li>Once the test passes, go to <strong>SEO Command Center</strong> and click <strong>Sync now</strong></li>
              <li>The first sync pulls 28 days of query and page data into MongoDB</li>
              <li>Keywords, near-wins, trends, and pages will populate immediately</li>
            </ol>
          </div>
        </Section>

        {/* ── Troubleshooting ────────────────────────────────────────────── */}
        <Section title="Troubleshooting — common errors">
          <div className="space-y-4 mt-4 text-xs">
            {[
              { error: "403 Forbidden", cause: "Service account not added to Search Console, or added as Restricted User instead of Owner/Full User.", fix: "Search Console → Settings → Users and permissions → verify the service account email is listed as Owner." },
              { error: "404 Not Found", cause: "GOOGLE_SC_SITE_URL doesn't match a verified property.", fix: `Compare GOOGLE_SC_SITE_URL exactly against what Search Console shows. Common mismatch: http vs https, www vs no-www, trailing slash missing. Current value: ${syncStatus?.siteUrl || "not set"}.` },
              { error: "Token exchange failed / 401", cause: "private_key in GOOGLE_SC_KEY is malformed, or Search Console API is not enabled.", fix: "1. Verify the Search Console API is enabled in Cloud Console. 2. Re-download the JSON key and paste it fresh — make sure there are no extra quotes or line wraps." },
              { error: "Could not parse JSON", cause: "GOOGLE_SC_KEY contains a file path or is truncated.", fix: "Paste the full contents of the JSON file, not the file path. The value must start with { and end with }." },
              { error: "0 rows returned", cause: "Not an error — GSC may not have data for the last 7 days (new property, or data is delayed by 1-3 days).", fix: "Wait 48 hours and try again. Run a full sync from SEO Command Center for the 28-day window." },
            ].map(({ error, cause, fix }) => (
              <div key={error} className="border border-gray-200 rounded-xl p-4">
                <p className="font-semibold text-red-600 mb-1">{error}</p>
                <p className="text-gray-600 mb-1"><strong>Cause:</strong> {cause}</p>
                <p className="text-gray-600"><strong>Fix:</strong> {fix}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Verification Checklist ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Verification Checklist</h3>
          <div className="space-y-2 text-xs">
            {[
              "Google Cloud project exists",
              "Search Console API enabled (searchconsole.googleapis.com)",
              "Service account created, JSON key downloaded",
              `Service account email added to ${SITE_URL} in Search Console as Owner`,
              "GOOGLE_SC_KEY set in Vercel (full JSON file contents)",
              `GOOGLE_SC_SITE_URL set to ${SITE_URL}`,
              "Vercel redeployed after adding env vars",
              "Test Connection shows all green checkmarks",
              "First sync run from SEO Command Center",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  configured && i <= 6 ? "border-green-400 bg-green-50" : "border-gray-300"
                }`}>
                  {configured && i <= 6 && <CheckCircle2 size={10} className="text-green-500" />}
                </div>
                <span className={configured && i <= 6 ? "text-green-700" : "text-gray-600"}>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
