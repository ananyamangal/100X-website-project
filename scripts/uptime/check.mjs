// Site check for .github/workflows/uptime.yml (runs every 10 minutes on GitHub Actions).
//
// DOWN = any target answers non-2xx (402 "paused" and 5xx included), takes longer than
// 15 s, is missing its marker text, or contains "temporarily paused". Failing targets are
// re-probed once after 30 s before anything is reported. State (UP/DOWN, first seen,
// last alert) is a JSON file restored/saved through the Actions cache — never the site DB.
//
//   first failure            -> DOWN alert
//   still failing            -> repeat alert once an hour
//   back to all-2xx          -> one RECOVERED alert with the outage duration
//   SIMULATE_DOWN=true       -> sends a [TEST] DOWN alert, leaves the stored state untouched
//   DRY_RUN=true             -> prints alerts instead of sending them (local testing)
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { assertAlertConfig, describeConfig, sendAlert } from "./notify.mjs"

const SITE_URL = (process.env.SITE_URL || "https://www.100xcircle.com").replace(/\/$/, "")
const DASHBOARD_URL = process.env.VERCEL_DASHBOARD_URL || "https://vercel.com/dashboard"
const TIMEOUT_MS = 15_000
const RETRY_AFTER_MS = Number(process.env.RETRY_AFTER_MS || 30_000)
const REPEAT_EVERY_MS = 60 * 60 * 1000
const PAUSED_RE = /temporarily paused/i
const STATE_DIR = ".uptime-state"
const STATE_FILE = `${STATE_DIR}/state.json`

// Marker = text that must appear in the response body (case-insensitive). Override the whole
// list with the UPTIME_TARGETS repository variable (JSON array of {path, marker}).
const DEFAULT_TARGETS = [
  { path: "/", marker: "100x Circle" },
  { path: "/contact-us", marker: "Contact Us" },
  { path: "/products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1", marker: "100X" },
  { path: "/api/health", marker: '"ok":true' },
]

function targets() {
  const raw = (process.env.UPTIME_TARGETS || "").trim()
  if (!raw) return DEFAULT_TARGETS
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed) || parsed.some((t) => typeof t?.path !== "string" || typeof t?.marker !== "string")) {
    throw new Error("UPTIME_TARGETS must be a JSON array of {path, marker}")
  }
  return parsed
}

const ist = (iso) => `${new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })} IST`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function probe({ path, marker }) {
  const url = SITE_URL + path
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "100x-uptime-check/1 (GitHub Actions)",
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "cache-control": "no-cache",
      },
    })
    const body = await res.text()
    const ms = Date.now() - started
    if (PAUSED_RE.test(body)) return { url, ok: false, status: res.status, ms, reason: `HTTP ${res.status}, body says "temporarily paused"` }
    if (!res.ok) return { url, ok: false, status: res.status, ms, reason: `HTTP ${res.status}` }
    if (!body.toLowerCase().includes(marker.toLowerCase())) {
      return { url, ok: false, status: res.status, ms, reason: `HTTP ${res.status} but marker "${marker}" not found` }
    }
    return { url, ok: true, status: res.status, ms }
  } catch (err) {
    const ms = Date.now() - started
    const timedOut = err?.name === "AbortError"
    return {
      url,
      ok: false,
      status: null,
      ms,
      reason: timedOut ? `timeout after ${TIMEOUT_MS / 1000} s` : `request failed: ${err?.cause?.code || err?.message || err}`,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function probeAll(list) {
  const first = await Promise.all(list.map(probe))
  const failing = first.filter((r) => !r.ok)
  if (failing.length === 0) return first
  console.log(`${failing.length} target(s) failing, retrying once in ${RETRY_AFTER_MS / 1000} s…`)
  await sleep(RETRY_AFTER_MS)
  const retried = await Promise.all(list.filter((t) => failing.some((f) => f.url === SITE_URL + t.path)).map(probe))
  return first.map((r) => (r.ok ? r : retried.find((x) => x.url === r.url) ?? r))
}

function readState() {
  try {
    return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {}
  } catch {
    return {}
  }
}
function writeState(state) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}
function runUrl() {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env
  return GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : "(local run)"
}
function summary(line) {
  console.log(line)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + "\n\n")
}
function durationText(fromIso, toIso) {
  const mins = Math.max(1, Math.round((new Date(toIso) - new Date(fromIso)) / 60000))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`
}

function downText(results, nowIso, firstSeenIso) {
  const failing = results.filter((r) => !r.ok)
  return [
    `${failing.length} of ${results.length} checks failing on ${SITE_URL}`,
    "",
    ...failing.map((r) => `• ${r.url}\n  ${r.reason} (${r.ms} ms)`),
    "",
    `Checked at: ${ist(nowIso)}`,
    `First seen: ${ist(firstSeenIso)}`,
    `Vercel dashboard: ${DASHBOARD_URL}`,
    `Workflow run: ${runUrl()}`,
  ].join("\n")
}

async function main() {
  assertAlertConfig() // fail loudly before touching anything
  const simulate = (process.env.SIMULATE_DOWN || "").toLowerCase() === "true"
  console.log("channels:", JSON.stringify(describeConfig()))

  const list = targets()
  const results = await probeAll(list)
  const nowIso = new Date().toISOString()
  for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.url} ${r.status ?? "-"} ${r.ms} ms${r.ok ? "" : "  <- " + r.reason}`)
  const isDown = results.some((r) => !r.ok)

  if (simulate) {
    const fake = results.map((r) => ({ ...r, ok: false, reason: r.ok ? `SIMULATED (real probe was HTTP ${r.status})` : r.reason }))
    const text =
      `This is a test alert triggered by hand from GitHub Actions (simulate_down). The site may be fine.\n\n` +
      downText(fake, nowIso, nowIso)
    const sent = await sendAlert({ subject: `[TEST] DOWN: ${SITE_URL} (simulated)`, text })
    summary(`Simulated DOWN alert sent: ${JSON.stringify(sent)}. Stored state left untouched.`)
    return
  }

  const state = readState()
  const wasDown = state.status === "DOWN"
  const next = { ...state, lastCheckAt: nowIso, failing: results.filter((r) => !r.ok).map((r) => ({ url: r.url, reason: r.reason })) }

  if (isDown && !wasDown) {
    next.status = "DOWN"
    next.firstSeenAt = nowIso
    const sent = await sendAlert({
      subject: `[DOWN] ${SITE_URL} — ${next.failing.length} check(s) failing`,
      text: downText(results, nowIso, nowIso),
    })
    next.lastAlertAt = nowIso
    summary(`DOWN alert sent: ${JSON.stringify(sent)}`)
  } else if (isDown && wasDown) {
    const since = state.lastAlertAt ? new Date(nowIso) - new Date(state.lastAlertAt) : Infinity
    if (since >= REPEAT_EVERY_MS) {
      const sent = await sendAlert({
        subject: `[STILL DOWN] ${SITE_URL} — down for ${durationText(state.firstSeenAt, nowIso)}`,
        text: downText(results, nowIso, state.firstSeenAt),
      })
      next.lastAlertAt = nowIso
      summary(`Repeat DOWN alert sent: ${JSON.stringify(sent)}`)
    } else {
      summary(`Still DOWN since ${ist(state.firstSeenAt)}; next repeat alert in ${Math.ceil((REPEAT_EVERY_MS - since) / 60000)} min.`)
    }
  } else if (!isDown && wasDown) {
    next.status = "UP"
    const text = [
      `All ${results.length} checks pass again on ${SITE_URL}.`,
      "",
      `Down since: ${ist(state.firstSeenAt)}`,
      `Recovered at: ${ist(nowIso)}`,
      `Outage duration: ${durationText(state.firstSeenAt, nowIso)}`,
      `Vercel dashboard: ${DASHBOARD_URL}`,
      `Workflow run: ${runUrl()}`,
    ].join("\n")
    const sent = await sendAlert({ subject: `[RECOVERED] ${SITE_URL} — back after ${durationText(state.firstSeenAt, nowIso)}`, text })
    next.lastAlertAt = nowIso
    next.recoveredAt = nowIso
    summary(`RECOVERED alert sent: ${JSON.stringify(sent)}`)
  } else {
    next.status = "UP"
    summary(`UP — ${results.length}/${results.length} checks passed at ${ist(nowIso)}.`)
  }
  writeState(next)
}

main().catch((err) => {
  console.error(`::error::${err.message}`)
  process.exit(1)
})
