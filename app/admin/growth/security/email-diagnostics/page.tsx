"use client"

import { useEffect, useState } from "react"
import {
  Mail, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Send, Wifi, WifiOff, Clock, Shield, Activity,
} from "lucide-react"

interface DiagData {
  provider:           string | null
  configured:         boolean
  emailUser:          string | null
  smtpHost:           string | null
  smtpConnected:      boolean
  smtpAuthOk:         boolean
  smtpError:          string | null
  lastEmailSentAt:    string | null
  lastEmailSentTo:    string | null
  lastEmailFailedAt:  string | null
  lastFailureReason:  string | null
  sentLast7d:         number
  failedLast7d:       number
  successRateLast7d:  number | null
  rateLimit:          string
  queueSize:          number
  asOf:               string
}

function StatusChip({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  if (ok)   return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800"><CheckCircle size={10}/>{label}</span>
  if (warn) return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-800"><AlertTriangle size={10}/>{label}</span>
  return     <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-800"><XCircle size={10}/>{label}</span>
}

function Row({ label, value, ok, warn }: { label: string; value: React.ReactNode; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-800/60 last:border-0">
      <span className="text-gray-400 text-xs w-48 shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${ok === true ? "text-green-400" : ok === false ? "text-red-400" : warn ? "text-amber-400" : "text-gray-300"}`}>
        {value}
      </span>
    </div>
  )
}

function fmt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function EmailDiagnosticsPage() {
  const [data,        setData]        = useState<DiagData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [testSending, setTestSending] = useState(false)
  const [testResult,  setTestResult]  = useState<{ ok: boolean; message: string } | null>(null)
  const [error,       setError]       = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/security/email-diagnostics")
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Failed"); return }
      setData(json)
    } catch { setError("Network error") }
    finally  { setLoading(false) }
  }

  const sendTest = async () => {
    setTestSending(true)
    setTestResult(null)
    try {
      const res  = await fetch("/api/admin/security/email-diagnostics", { method: "POST" })
      const json = await res.json()
      if (res.ok) setTestResult({ ok: true,  message: json.message ?? "Test email sent" })
      else        setTestResult({ ok: false, message: json.error  ?? "Send failed" })
    } catch { setTestResult({ ok: false, message: "Network error" }) }
    finally  { setTestSending(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex-1 bg-gray-950 min-h-screen">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-green-500" />
            <h1 className="text-sm font-bold text-white">Email Diagnostics</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            {data?.configured && (
              <button
                onClick={sendTest}
                disabled={testSending}
                className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-900/20 transition-colors"
              >
                <Send size={11} className={testSending ? "animate-pulse" : ""} />
                {testSending ? "Sending…" : "Send Test Email"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl space-y-5">

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        {testResult && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border ${
            testResult.ok ? "bg-green-900/20 border-green-800 text-green-300" : "bg-red-900/20 border-red-800 text-red-300"
          }`}>
            {testResult.ok ? <CheckCircle size={13}/> : <XCircle size={13}/>}
            {testResult.message}
            <button onClick={() => setTestResult(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : data && (
          <>
            {/* Overall status banner */}
            <div className={`rounded-xl px-5 py-4 border flex items-center gap-4 ${
              !data.configured
                ? "bg-amber-900/20 border-amber-800"
                : data.smtpConnected
                  ? "bg-green-900/20 border-green-800"
                  : "bg-red-900/20 border-red-800"
            }`}>
              <div className="flex-shrink-0">
                {!data.configured
                  ? <AlertTriangle size={22} className="text-amber-400"/>
                  : data.smtpConnected
                    ? <CheckCircle size={22} className="text-green-400"/>
                    : <XCircle size={22} className="text-red-400"/>
                }
              </div>
              <div>
                <p className={`font-semibold text-sm ${
                  !data.configured ? "text-amber-300" : data.smtpConnected ? "text-green-300" : "text-red-300"
                }`}>
                  {!data.configured
                    ? "Email not configured — password reset emails will fail"
                    : data.smtpConnected
                      ? "SMTP connected and authenticated"
                      : `SMTP connection failed — ${data.smtpError}`
                  }
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Last checked: {fmt(data.asOf)}</p>
              </div>
            </div>

            {/* SMTP Config */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <Wifi size={13} className="text-gray-400"/>
                <span className="text-xs font-semibold text-gray-200">SMTP Configuration</span>
              </div>
              <div className="px-4 py-2">
                <Row label="Provider"        value={data.provider ?? "Not configured"} />
                <Row label="Configured"      value={<StatusChip ok={data.configured} warn={!data.configured} label={data.configured ? "Yes" : "No"}/>} />
                <Row label="Email address"   value={data.emailUser ?? "—"} />
                <Row label="SMTP host"       value={data.smtpHost ?? "—"} />
                <Row label="SMTP connected"  value={<StatusChip ok={data.smtpConnected}  label={data.smtpConnected ? "Connected" : "Failed"}/>} ok={data.smtpConnected} />
                <Row label="SMTP auth"       value={<StatusChip ok={data.smtpAuthOk}     label={data.smtpAuthOk ? "Authenticated" : "Failed"}/>} ok={data.smtpAuthOk} />
                {data.smtpError && (
                  <div className="mt-2 mb-2 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 text-xs text-red-300 font-mono break-words">
                    {data.smtpError}
                  </div>
                )}
              </div>
            </div>

            {/* Email activity */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <Activity size={13} className="text-gray-400"/>
                <span className="text-xs font-semibold text-gray-200">Email Activity</span>
              </div>
              <div className="px-4 py-2">
                <Row label="Last email sent"     value={fmt(data.lastEmailSentAt)}    warn={!data.lastEmailSentAt} />
                <Row label="Sent to"             value={data.lastEmailSentTo ?? "—"} />
                <Row label="Last email failure"  value={fmt(data.lastEmailFailedAt)}  warn={!!data.lastEmailFailedAt} />
                <Row label="Last failure reason" value={data.lastFailureReason ?? "—"} />
                <Row label="Sent (last 7 days)"  value={data.sentLast7d} />
                <Row label="Failed (last 7 days)" value={data.failedLast7d} warn={data.failedLast7d > 0} />
                <Row
                  label="Success rate (7 days)"
                  value={data.successRateLast7d !== null ? `${data.successRateLast7d}%` : "No data"}
                  ok={data.successRateLast7d !== null && data.successRateLast7d >= 90}
                  warn={data.successRateLast7d !== null && data.successRateLast7d < 90}
                />
              </div>
            </div>

            {/* Limits */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <Shield size={13} className="text-gray-400"/>
                <span className="text-xs font-semibold text-gray-200">Limits &amp; Queue</span>
              </div>
              <div className="px-4 py-2">
                <Row label="Rate limit"  value={data.rateLimit} />
                <Row label="Queue size"  value={data.queueSize === 0 ? "0 (synchronous)" : data.queueSize} ok={data.queueSize === 0} />
              </div>
            </div>

            {/* Setup instructions if not configured */}
            {!data.configured && (
              <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 text-xs space-y-2">
                <p className="text-amber-300 font-semibold flex items-center gap-1.5"><AlertTriangle size={13}/>Setup required</p>
                <ol className="text-amber-200/80 space-y-1 list-decimal list-inside">
                  <li>Go to <strong>myaccount.google.com/apppasswords</strong> (requires 2FA on the Gmail account)</li>
                  <li>Generate a 16-character App Password for &ldquo;Mail&rdquo;</li>
                  <li>In Vercel → Project Settings → Environment Variables, set:</li>
                </ol>
                <div className="bg-gray-900/60 rounded-lg p-3 font-mono text-[11px] text-gray-300 space-y-1">
                  <div>EMAIL_USER=<span className="text-green-400">100xcircle@gmail.com</span></div>
                  <div>EMAIL_APP_PASSWORD=<span className="text-green-400">xxxx xxxx xxxx xxxx</span></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
