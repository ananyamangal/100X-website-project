// Daily Vercel usage warning (09:00 IST) for .github/workflows/uptime.yml.
//
// Vercel has stated (community thread, 2025) that there is NO public, stable usage/billing
// endpoint. This job therefore does its best with a read-only token and the usage URL the
// owner configures (VERCEL_USAGE_URL repository variable; default
// https://api.vercel.com/v2/usage) and NEVER raises a false alarm: when the response cannot
// be understood it logs the top-level keys and sends one "could not read usage" note at most
// once a week. Thresholds: 70 % and 90 % of USAGE_LIMIT_CPU_HOURS (default 4, Hobby) and
// USAGE_LIMIT_INVOCATIONS (default 1,000,000). Each threshold is reported once per UTC day.
// Skipped entirely (exit 0) when VERCEL_TOKEN is not set.
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { assertAlertConfig, sendAlert } from "./notify.mjs"

const STATE_DIR = ".uptime-state"
const STATE_FILE = `${STATE_DIR}/usage.json`
const env = (n) => (process.env[n] ?? "").trim()
const ist = (d) => `${new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })} IST`

function readState() {
  try {
    return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {}
  } catch {
    return {}
  }
}
function writeState(s) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
}
function summary(line) {
  console.log(line)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + "\n\n")
}

// Depth-first search for the first numeric value whose key matches `pattern`.
function findMetric(node, pattern, path = "") {
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      const p = path ? `${path}.${k}` : k
      if (typeof v === "number" && pattern.test(k)) return { value: v, path: p }
      const hit = findMetric(v, pattern, p)
      if (hit) return hit
    }
  }
  return null
}

async function unreadable(state, why) {
  summary(`::warning::Vercel usage could not be read: ${why}`)
  const last = state.unreadableNotifiedAt ? new Date(state.unreadableNotifiedAt) : null
  if (!last || Date.now() - last.getTime() > 7 * 24 * 3600 * 1000) {
    await sendAlert({
      subject: "[USAGE] Vercel usage check cannot read usage data",
      text:
        `The daily usage check could not read Vercel usage: ${why}\n\n` +
        `Vercel has no public usage API; set the VERCEL_USAGE_URL repository variable to a working endpoint ` +
        `or remove the VERCEL_TOKEN secret to disable this job. This note repeats at most once a week.`,
    })
    writeState({ ...state, unreadableNotifiedAt: new Date().toISOString() })
  }
}

async function main() {
  if (!env("VERCEL_TOKEN")) {
    summary("Usage check skipped: VERCEL_TOKEN secret is not set.")
    return
  }
  assertAlertConfig()
  const state = readState()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const url = new URL(env("VERCEL_USAGE_URL") || "https://api.vercel.com/v2/usage")
  if (env("VERCEL_TEAM_ID")) url.searchParams.set("teamId", env("VERCEL_TEAM_ID"))
  if (env("VERCEL_PROJECT_ID")) url.searchParams.set("projectId", env("VERCEL_PROJECT_ID"))
  url.searchParams.set("from", String(now.getTime() - 30 * 24 * 3600 * 1000))
  url.searchParams.set("to", String(now.getTime()))

  let json
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${env("VERCEL_TOKEN")}` } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    json = await res.json()
  } catch (err) {
    await unreadable(state, `request to ${url.host}${url.pathname} failed: ${err.message}`)
    return
  }

  const cpu = findMetric(json, /active.?cpu|cpu.?(time|hours|seconds|ms)/i)
  const inv = findMetric(json, /invocation/i)
  if (!cpu && !inv) {
    await unreadable(state, `response has no recognisable CPU/invocation field; top-level keys: ${Object.keys(json).join(", ") || "(none)"}`)
    return
  }

  const cpuUnit = (env("USAGE_CPU_UNIT") || "s").toLowerCase() // ms | s | h
  const cpuHours = cpu ? cpu.value / (cpuUnit === "ms" ? 3.6e6 : cpuUnit === "h" ? 1 : 3600) : null
  const limits = {
    cpuHours: Number(env("USAGE_LIMIT_CPU_HOURS") || 4),
    invocations: Number(env("USAGE_LIMIT_INVOCATIONS") || 1_000_000),
  }
  const metrics = [
    cpu && { name: "Active CPU", used: cpuHours, limit: limits.cpuHours, fmt: (v) => `${v.toFixed(2)} h`, source: `${cpu.path} (unit ${cpuUnit})` },
    inv && { name: "Invocations", used: inv.value, limit: limits.invocations, fmt: (v) => v.toLocaleString("en-IN"), source: inv.path },
  ].filter(Boolean)

  const lines = metrics.map((m) => `${m.name}: ${m.fmt(m.used)} of ${m.fmt(m.limit)} (${Math.round((m.used / m.limit) * 100)} %) — field ${m.source}`)
  summary(`Vercel usage (last 30 days, read ${ist(now)}):\n${lines.join("\n")}`)

  const warned = state.warned ?? {}
  const due = []
  for (const m of metrics) {
    const pct = (m.used / m.limit) * 100
    for (const threshold of [90, 70]) {
      if (pct >= threshold) {
        if (warned[`${m.name}:${threshold}`] !== today) due.push({ m, threshold, pct })
        break
      }
    }
  }
  if (due.length) {
    const worst = Math.max(...due.map((d) => d.threshold))
    const text = [
      `Vercel usage for the last 30 days has crossed ${worst} % of the plan limit.`,
      "",
      ...lines,
      "",
      `Read at: ${ist(now)}`,
      `Vercel dashboard: ${env("VERCEL_DASHBOARD_URL") || "https://vercel.com/dashboard"}`,
    ].join("\n")
    await sendAlert({ subject: `[USAGE ${worst} %] Vercel usage warning — ${due.map((d) => d.m.name).join(", ")}`, text })
    for (const d of due) warned[`${d.m.name}:${d.threshold}`] = today
    summary(`Usage warning sent for ${due.map((d) => `${d.m.name} ≥ ${d.threshold} %`).join(", ")}.`)
  }
  writeState({ ...state, warned, lastReadAt: now.toISOString() })
}

main().catch((err) => {
  console.error(`::error::${err.message}`)
  process.exit(1)
})
