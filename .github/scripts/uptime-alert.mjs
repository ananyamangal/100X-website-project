// Uptime check + e-mail alerts for .github/workflows/uptime-alert.yml. Docs: docs/UPTIME_ALERTS.md
//
// Probes the home page and one lightweight public page. Each URL gets up to 3 attempts, 20 s
// apart, 15 s timeout each. A URL FAILS when, after its attempts, it answered something other
// than HTTP 200, timed out, failed DNS/TLS/connection, served a page containing "temporarily
// paused" / "DEPLOYMENT_PAUSED", or served a 200 page without the expected text.
//
// State (UP/DOWN, since when, when we last e-mailed) lives in .uptime-state/state.json, which the
// workflow restores from and saves to the GitHub Actions cache — no database, no commits.
//
//   UP   -> UP     nothing sent, job passes
//   UP   -> DOWN   "SITE DOWN" e-mail at once, job fails (GitHub's failure e-mail = 2nd channel)
//   DOWN -> DOWN   "STILL DOWN" e-mail at most once per hour (job fails on those runs only)
//   DOWN -> UP     one "RECOVERED" e-mail with start, end and duration, job passes
//
// MODE=check (default) | smtp-check (log in to SMTP without sending; fail loudly if it cannot).
// MAINTENANCE_MODE=true (repository variable) skips the check entirely: no requests, no e-mail,
// state untouched. SIMULATE=down|recovery sends the matching e-mail without touching the state.
// If an alert e-mail cannot be sent the job fails with a ::error:: line, so GitHub's own
// "workflow run failed" e-mail still reaches the owner when the SMTP path is broken.
//
// Secrets (ALERT_EMAIL_TO, ALERT_EMAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) are read
// from the environment only, masked in the log and never printed; messages name secrets, never
// their values. DRY_RUN=true prints the e-mail instead of sending it; only under DRY_RUN do the
// local test hooks FAKE_RESULT (up|402|paused|500|timeout|dns|tls|content) and FAKE_SMTP_FAIL work,
// so a local run of every transition never contacts the site or a mail server.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const SITE_URL = (process.env.SITE_URL || "https://www.100xcircle.com").replace(/\/$/, "")
const HOST = new URL(SITE_URL).host
const PATHS = ["/", "/contact-us"]
const ATTEMPTS = 3
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS ?? 20_000)
const TIMEOUT_MS = 15_000
const REPEAT_EVERY_MS = 60 * 60_000
// Cron runs drift by a few minutes; a run 57 minutes after the last alert still counts as "an hour".
const REPEAT_SLACK_MS = 5 * 60_000
const PAUSED_PATTERNS = [/temporarily paused/i, /DEPLOYMENT_PAUSED/i]
const EXPECTED_TEXT = /100X/i // every public page carries the brand name; a 200 without it is not our site
const REQUIRED_SECRETS = ["ALERT_EMAIL_TO", "ALERT_EMAIL_FROM", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]
const STATE_FILE = process.env.STATE_FILE || ".uptime-state/state.json"
const VERCEL_DASHBOARD = process.env.VERCEL_DASHBOARD_URL || "https://vercel.com/dashboard"

const env = (name) => (process.env[name] || "").trim()
const flag = (name) => env(name).toLowerCase() === "true"
const MODE = env("MODE") || "check"
const SIMULATE = env("SIMULATE").toLowerCase() // "", "down" or "recovery"
const dryRun = flag("DRY_RUN")
const fakeResult = dryRun ? env("FAKE_RESULT").toLowerCase() : ""
const fakeSmtpFail = dryRun && flag("FAKE_SMTP_FAIL")
const NOW = process.env.FAKE_NOW && dryRun ? new Date(process.env.FAKE_NOW) : new Date()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Causes ─────────────────────────────────────────────────────────────────

const CAUSES = {
  PAUSED: {
    label: "HTTP 402 / Vercel pause or billing",
    first: "Open Vercel -> Usage and Billing for the project; resume the deployment, raise the limit or fix the payment method.",
  },
  APP_ERROR: {
    label: "5xx app error",
    first: "Open Vercel -> Deployments -> the current production deployment -> Logs; if a deploy just went out, use Instant Rollback.",
  },
  TIMEOUT: {
    label: "timeout, site not responding",
    first: "Open Vercel -> Observability / Logs for hung functions, and check MongoDB Atlas is reachable; then retry the URL by hand.",
  },
  DNS: {
    label: "DNS failure",
    first: "Open Vercel -> Domains to check the records are Valid, then the registrar's DNS settings for the domain.",
  },
  TLS: {
    label: "TLS / certificate problem",
    first: "Open Vercel -> Domains and check the certificate status; re-verify the domain if the certificate is expired or missing.",
  },
  CONTENT_MISSING: {
    label: "page loads but expected content is missing",
    first: "Open the URL in a browser: the domain may point at the wrong project or deployment, or a page renders empty; check Vercel -> Deployments.",
  },
  CONNECTION: {
    label: "connection failed",
    first: "Retry the URL by hand; if it fails from several networks, check Vercel status (vercel-status.com) and Vercel -> Domains.",
  },
  UNEXPECTED_STATUS: {
    label: "unexpected HTTP status",
    first: "Open the URL in a browser; a 401/403 points at Deployment Protection or the Firewall, a 404 or 3xx at domain or redirect changes.",
  },
}

const DNS_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL", "ENODATA", "ESERVFAIL"])
const TLS_CODE = /^(CERT_|ERR_TLS|ERR_SSL|UNABLE_TO_|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|HOSTNAME_MISMATCH)/

export function classify(r) {
  if (r.ok) return null
  if (r.matched || r.status === 402) return "PAUSED"
  if (r.status != null && r.status >= 500) return "APP_ERROR"
  if (r.status === 200) return "CONTENT_MISSING"
  if (r.status != null) return "UNEXPECTED_STATUS"
  if (r.timedOut) return "TIMEOUT"
  if (DNS_CODES.has(r.code)) return "DNS"
  if (r.code && TLS_CODE.test(r.code)) return "TLS"
  return "CONNECTION"
}

// ─── Probing ────────────────────────────────────────────────────────────────

const FAKES = {
  up: { status: 200, body: "<title>100X Circle</title>" },
  402: { status: 402, body: "Payment required" },
  paused: { status: 200, body: "This deployment is temporarily paused" },
  500: { status: 500, body: "Internal Server Error" },
  content: { status: 200, body: "<title>Welcome to nginx</title>" },
  timeout: { error: "timeout" },
  dns: { error: "ENOTFOUND" },
  tls: { error: "CERT_HAS_EXPIRED" },
}

async function fetchOnce(url) {
  if (fakeResult) {
    const f = FAKES[fakeResult]
    if (!f) throw new Error(`FAKE_RESULT must be one of: ${Object.keys(FAKES).join(", ")}`)
    if (f.error === "timeout") return { timedOut: true }
    if (f.error) return { code: f.error, message: `fake ${f.error}` }
    return { status: f.status, body: f.body, headers: { "x-vercel-id": "bom1::fake-0000", server: "Vercel" } }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "100x-uptime-alert/2 (GitHub Actions)", accept: "text/html,*/*;q=0.8", "cache-control": "no-cache" },
    })
    const body = await res.text()
    return { status: res.status, body, headers: { "x-vercel-id": res.headers.get("x-vercel-id"), server: res.headers.get("server") } }
  } catch (err) {
    if (err?.name === "AbortError") return { timedOut: true }
    const cause = err?.cause
    return { code: cause?.code || cause?.cause?.code || err?.code || null, message: String(cause?.message || err?.message || err) }
  } finally {
    clearTimeout(timer)
  }
}

async function probeOnce(url) {
  const started = Date.now()
  const raw = await fetchOnce(url)
  const ms = Date.now() - started
  const body = raw.body ?? ""
  const matched = PAUSED_PATTERNS.map((re) => body.match(re)?.[0]).find(Boolean) || null
  const status = raw.status ?? null
  const ok = status === 200 && !matched && EXPECTED_TEXT.test(body)
  const r = {
    url, ok, status, ms, matched,
    timedOut: !!raw.timedOut,
    code: raw.code ?? null,
    error: raw.timedOut ? `timeout after ${TIMEOUT_MS / 1000} s` : raw.code || raw.message || null,
    headers: raw.headers || {},
    snippet: body.replace(/\s+/g, " ").trim().slice(0, 300),
  }
  r.cause = classify(r)
  return r
}

async function probe(path) {
  const url = SITE_URL + path
  let last
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    last = await probeOnce(url)
    const detail = last.ok ? "" : `  (${last.cause}${last.error ? `: ${last.error}` : last.matched ? `: matched "${last.matched}"` : ""})`
    console.log(`${last.ok ? "ok  " : "FAIL"} attempt ${attempt}/${ATTEMPTS} ${url} -> ${last.status ?? "-"} ${last.ms} ms${detail}`)
    if (last.ok) return last
    if (attempt < ATTEMPTS) await sleep(fakeResult ? 0 : RETRY_DELAY_MS)
  }
  return last
}

// ─── State ──────────────────────────────────────────────────────────────────

function readState() {
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf8"))
    return s && (s.status === "UP" || s.status === "DOWN") ? s : { status: "UP" }
  } catch {
    return { status: "UP" } // first run, or the cache was evicted: assume UP (worst case one extra alert)
  }
}

function writeState(s) {
  mkdirSync(dirname(STATE_FILE), { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + "\n")
}

/** Pure transition: what to send and what to remember. */
export function decide(prev, down, now, cause) {
  const t = now.toISOString()
  if (!down) {
    if (prev.status === "DOWN") return { send: "RECOVERED", next: { status: "UP", lastRecoveredAt: t, lastDownSince: prev.since } }
    return { send: null, next: { status: "UP", ...(prev.lastRecoveredAt ? { lastRecoveredAt: prev.lastRecoveredAt } : {}) } }
  }
  if (prev.status !== "DOWN") return { send: "DOWN", next: { status: "DOWN", since: t, lastAlertAt: t, cause } }
  // The previous alert e-mail failed: retry it now, keeping the original outage start.
  if (prev.pendingAlert) {
    const { pendingAlert, ...rest } = prev
    return { send: prev.lastAlertAt ? "STILL_DOWN" : "DOWN", next: { ...rest, lastAlertAt: t, cause } }
  }
  const sinceAlert = now - new Date(prev.lastAlertAt || prev.since)
  if (sinceAlert >= REPEAT_EVERY_MS - REPEAT_SLACK_MS) return { send: "STILL_DOWN", next: { ...prev, lastAlertAt: t, cause } }
  return { send: null, next: { ...prev, cause } }
}

// ─── E-mail ─────────────────────────────────────────────────────────────────

const fmtUtc = (d) => d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC")
const fmtIst = (d) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST"
const both = (d) => `${fmtUtc(d)} / ${fmtIst(d)}`

export function fmtDuration(ms) {
  const m = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d) return `${d}d ${h % 24}h ${m % 60}m`
  return h ? `${h}h ${m % 60}m` : `${m}m`
}

function runLink() {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env
  return GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : "(local run)"
}

function footer() {
  return [
    `Checked at:   ${both(NOW)}`,
    `Actions run:  ${runLink()}`,
    `Vercel:       ${VERCEL_DASHBOARD}`,
    `Checks run every 10 minutes. While the site is down this e-mail repeats at most once an hour; one RECOVERED e-mail follows when it is back.`,
  ]
}

export function buildDownEmail(kind, results, state, simulated) {
  const failing = results.filter((r) => !r.ok)
  const shown = failing.length ? failing : results
  const cause = failing[0]?.cause || (simulated ? "SIMULATED" : "UNKNOWN")
  const label = CAUSES[cause]?.label || "simulated outage (test)"
  const code = failing[0] ? failing[0].status ?? failing[0].error : "SIMULATED"
  const since = new Date(state.since || NOW)
  const prefix = simulated ? "[TEST] " : ""
  const subject =
    kind === "STILL_DOWN"
      ? `${prefix}STILL DOWN for ${fmtDuration(NOW - since)} [${label}]: ${HOST} (${code})`
      : `${prefix}SITE DOWN [${label}]: ${HOST} (${code})`
  const lines = [
    simulated ? `TEST ONLY: simulate_down was ticked; the real checks below are shown as they were.` : `${HOST} is DOWN: ${label}.`,
    kind === "STILL_DOWN" ? `Down since: ${both(since)} (${fmtDuration(NOW - since)} so far).` : `First detected: ${both(since)}.`,
    "",
  ]
  if (CAUSES[cause]) lines.push(`What to do first: ${CAUSES[cause].first}`, "")
  for (const r of shown) {
    lines.push(`URL:           ${r.url}`)
    lines.push(`Result:        ${r.ok ? "OK" : `${r.cause} (${CAUSES[r.cause]?.label})`}`)
    lines.push(`Status code:   ${r.status ?? "none"}${r.error ? `  [${r.error}]` : ""}`)
    lines.push(`Matched text:  ${r.matched ?? "none"}`)
    lines.push(`x-vercel-id:   ${r.headers["x-vercel-id"] ?? "none"}`)
    lines.push(`server:        ${r.headers.server ?? "none"}`)
    lines.push(`Body (first 300 chars): ${r.snippet || "(empty)"}`)
    lines.push("")
  }
  lines.push(...footer())
  return { subject, text: lines.join("\n") }
}

export function buildRecoveredEmail(downSince, upAt, lastCause, simulated) {
  const start = new Date(downSince)
  const subject = `${simulated ? "[TEST] " : ""}RECOVERED after ${fmtDuration(upAt - start)}: ${HOST}`
  const lines = [
    simulated ? `TEST ONLY: simulate_recovery was ticked; no real outage happened.` : `${HOST} is back UP.`,
    "",
    `Outage start:  ${both(start)}`,
    `Outage end:    ${both(upAt)}`,
    `Duration:      ${fmtDuration(upAt - start)}`,
    `Last cause:    ${CAUSES[lastCause]?.label ?? lastCause ?? "unknown"}`,
    "",
    ...footer(),
  ]
  return { subject, text: lines.join("\n") }
}

function maskSecrets() {
  // GitHub masks secret values already; this also masks each recipient of a comma-separated list.
  if (!process.env.GITHUB_ACTIONS) return
  for (const name of REQUIRED_SECRETS) {
    for (const part of (process.env[name] || "").split(",")) if (part.trim().length >= 3) console.log(`::add-mask::${part.trim()}`)
  }
}

function assertSecrets() {
  const missing = REQUIRED_SECRETS.filter((name) => !env(name))
  if (missing.length) {
    throw new Error(`Missing required repository secret(s): ${missing.join(", ")}. Add them under Settings -> Secrets and variables -> Actions (see docs/UPTIME_ALERTS.md).`)
  }
  if (!env("ALERT_EMAIL_TO").split(",").some((s) => s.includes("@"))) {
    throw new Error("ALERT_EMAIL_TO is set but contains no e-mail address (expected a comma-separated list).")
  }
}

async function transport() {
  const { default: nodemailer } = await import("nodemailer")
  const port = Number(env("SMTP_PORT"))
  return nodemailer.createTransport({ host: env("SMTP_HOST"), port, secure: port === 465, auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") } })
}

class MailError extends Error {}

async function sendEmail({ subject, text }) {
  const to = env("ALERT_EMAIL_TO").split(",").map((s) => s.trim()).filter(Boolean)
  try {
    if (fakeSmtpFail) throw Object.assign(new Error("fake SMTP failure"), { code: "EAUTH" })
    if (dryRun) {
      console.log(`\n[dry-run] would e-mail ${to.length} recipient(s)\n[dry-run] subject: ${subject}\n[dry-run] body:\n${text}\n`)
      return
    }
    await (await transport()).sendMail({ from: env("ALERT_EMAIL_FROM"), to, subject, text })
    console.log(`e-mail sent to ${to.length} recipient(s): ${subject}`)
  } catch (err) {
    // Only the error class/code: SMTP error text can echo the account name.
    throw new MailError(`ALERT E-MAIL COULD NOT BE SENT (${err?.code || err?.name || "error"}) for: ${subject}. The alert system is not delivering; check the SMTP_* secrets.`)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  maskSecrets()

  if (flag("MAINTENANCE_MODE")) {
    console.log("::notice::MAINTENANCE_MODE is on: check skipped, no e-mail sent, state unchanged.")
    return 0
  }
  assertSecrets() // fail loudly before any network call

  if (MODE === "smtp-check") {
    if (dryRun) {
      if (fakeSmtpFail) throw new MailError("SMTP LOGIN FAILED (EAUTH): alerts could not be delivered. Check the SMTP_* secrets.")
      console.log("[dry-run] SMTP login would be verified here")
      return 0
    }
    try {
      await (await transport()).verify()
    } catch (err) {
      throw new MailError(`SMTP LOGIN FAILED (${err?.code || err?.name || "error"}): alerts could not be delivered. Check the SMTP_* secrets.`)
    }
    console.log("SMTP login OK: the alert e-mail path works.")
    return 0
  }

  if (SIMULATE === "recovery") {
    const start = new Date(NOW - 47 * 60_000)
    await sendEmail(buildRecoveredEmail(start.toISOString(), NOW, "PAUSED", true))
    console.log("simulate_recovery: RECOVERED test e-mail sent; real state untouched.")
    return 0
  }

  console.log(`checking ${SITE_URL} (${PATHS.length} URLs, ${ATTEMPTS} attempts each, ${RETRY_DELAY_MS / 1000} s apart, ${TIMEOUT_MS / 1000} s timeout)${SIMULATE === "down" ? " - SIMULATE down" : ""}${fakeResult ? ` - FAKE_RESULT=${fakeResult}` : ""}`)
  const results = []
  for (const path of PATHS) results.push(await probe(path))
  const realDown = results.some((r) => !r.ok)

  if (SIMULATE === "down") {
    await sendEmail(buildDownEmail("DOWN", results, { since: NOW.toISOString() }, true))
    throw new Error("simulate_down: test alert e-mail sent; failing the job on purpose (real state untouched).")
  }

  const prev = readState()
  const cause = results.find((r) => !r.ok)?.cause ?? null
  const { send, next } = decide(prev, realDown, NOW, cause)
  console.log(`state: ${prev.status} -> ${next.status}${send ? `, sending ${send}` : ", nothing to send"}`)

  // If an alert e-mail fails, remember the outage (with its real start) but mark the alert as
  // pending so the next run retries it; a failed RECOVERED e-mail leaves the state DOWN, so the
  // next UP run sends it again. Either way the job fails loudly below.
  try {
    if (send === "DOWN" || send === "STILL_DOWN") await sendEmail(buildDownEmail(send, results, next, false))
    if (send === "RECOVERED") await sendEmail(buildRecoveredEmail(prev.since, NOW, prev.cause, false))
  } catch (err) {
    if (send !== "RECOVERED") writeState({ ...next, lastAlertAt: prev.status === "DOWN" ? prev.lastAlertAt ?? null : null, pendingAlert: true })
    throw err
  }
  writeState(next)

  if (send === "DOWN" || send === "STILL_DOWN") {
    // Fail the job on alert runs only, so GitHub's own failure e-mail is a second channel without
    // turning every 10-minute run red-and-noisy for the whole outage.
    throw new Error(`${HOST} is DOWN (${cause}); alert e-mail sent, failing the job on purpose.`)
  }
  if (realDown) console.log(`::warning::${HOST} still DOWN (${cause}) since ${prev.since}; next reminder e-mail within the hour.`)
  else console.log(`UP - ${results.length}/${results.length} URLs answered 200 with the expected content.`)
  return 0
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())
if (isMain) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`::error::${err.message}`)
      process.exit(1)
    })
}
