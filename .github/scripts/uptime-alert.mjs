// Uptime check + e-mail alert for .github/workflows/uptime-alert.yml.
//
// Probes the home page and one lightweight public page. Each URL gets up to 3 attempts,
// 20 s apart, 15 s timeout each, so a single slow response is not an alarm. The site is
// DOWN when any URL still fails after its attempts: HTTP status other than 200 (402 and 5xx
// especially), a timeout / connection error, or a body containing "temporarily paused" or
// "DEPLOYMENT_PAUSED". SIMULATE_DOWN=true forces DOWN to test the e-mail pipeline.
//
// When DOWN: one e-mail to the ALERT_EMAIL_TO recipients, then exit 1 so the workflow run
// fails and GitHub's own failure notification doubles as a second alert. The e-mail goes
// out on every DOWN run, i.e. every hour while the site stays down.
//
// Secrets (ALERT_EMAIL_TO, ALERT_EMAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
// are read from the environment only. They are masked in the job log and never printed;
// error messages name secrets, never their values. DRY_RUN=true prints the e-mail instead
// of sending it (local testing only).

const SITE_URL = (process.env.SITE_URL || "https://www.100xcircle.com").replace(/\/$/, "")
const HOST = new URL(SITE_URL).host
const PATHS = ["/", "/contact-us"]
const ATTEMPTS = 3
const RETRY_DELAY_MS = 20_000
const TIMEOUT_MS = 15_000
const PAUSED_PATTERNS = [/temporarily paused/i, /DEPLOYMENT_PAUSED/i]
const REQUIRED_SECRETS = ["ALERT_EMAIL_TO", "ALERT_EMAIL_FROM", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]

const simulate = (process.env.SIMULATE_DOWN || "").toLowerCase() === "true"
const dryRun = (process.env.DRY_RUN || "").toLowerCase() === "true"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function maskSecrets() {
  // GitHub already masks secret values; this covers values derived from them (e.g. each
  // recipient of a comma-separated list) so they can never appear in the log either.
  if (!process.env.GITHUB_ACTIONS) return
  for (const name of REQUIRED_SECRETS) {
    const value = process.env[name] || ""
    for (const part of value.split(",")) if (part.trim().length >= 3) console.log(`::add-mask::${part.trim()}`)
  }
}

function assertSecrets() {
  const missing = REQUIRED_SECRETS.filter((name) => !(process.env[name] || "").trim())
  if (missing.length) {
    throw new Error(
      `Missing required repository secret(s): ${missing.join(", ")}. ` +
        `Add them under Settings → Secrets and variables → Actions (see docs/UPTIME_ALERTS.md).`,
    )
  }
  if (!process.env.ALERT_EMAIL_TO.split(",").some((s) => s.trim().includes("@"))) {
    throw new Error("ALERT_EMAIL_TO is set but contains no e-mail address (expected a comma-separated list).")
  }
}

async function probeOnce(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "100x-uptime-alert/1 (GitHub Actions)", accept: "text/html,*/*;q=0.8", "cache-control": "no-cache" },
    })
    const body = await res.text()
    const ms = Date.now() - started
    const matched = PAUSED_PATTERNS.map((re) => body.match(re)?.[0]).find(Boolean) || null
    const ok = res.status === 200 && !matched
    return { url, ok, status: res.status, ms, matched, snippet: body.replace(/\s+/g, " ").trim().slice(0, 300), error: null }
  } catch (err) {
    const ms = Date.now() - started
    const timedOut = err?.name === "AbortError"
    return { url, ok: false, status: null, ms, matched: null, snippet: "", error: timedOut ? `timeout after ${TIMEOUT_MS / 1000} s` : `${err?.cause?.code || err?.message || err}` }
  } finally {
    clearTimeout(timer)
  }
}

async function probe(path) {
  const url = SITE_URL + path
  let last
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    last = await probeOnce(url)
    console.log(`${last.ok ? "ok  " : "FAIL"} attempt ${attempt}/${ATTEMPTS} ${url} → ${last.status ?? "-"} ${last.ms} ms${last.ok ? "" : "  " + (last.error || last.matched ? `(${last.error || `matched "${last.matched}"`})` : "")}`)
    if (last.ok) return last
    if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS)
  }
  return last
}

function likelyCause(r) {
  if (r.matched) return "Vercel has paused the deployment (Hobby fair-use limit or a billing issue). Check Vercel → Usage / Billing and resume or upgrade the project."
  if (r.status === 402) return "HTTP 402 is Vercel's fair-use pause (Hobby plan usage limit) or a billing issue on the account. Check Vercel → Usage / Billing."
  if (r.status === null) return r.error?.startsWith("timeout") ? "No response within 15 s: a hung function, an overloaded upstream (MongoDB) or a network problem." : "The connection failed: DNS, TLS or the domain is not attached to a running deployment."
  if (r.status >= 500) return "Server error: a failed deployment, a crashing function or an upstream (MongoDB) failure. Check Vercel → Deployments and Logs."
  if (r.status === 404) return "The URL is missing: the domain may point at a deployment without this route, or a redirect rule changed."
  if (r.status === 401 || r.status === 403) return "Access is blocked: Deployment Protection, Vercel Firewall / Attack Mode or an auth rule is covering the public site."
  if (r.status >= 300 && r.status < 400) return "Unexpected redirect: domain or redirect configuration changed."
  return `Unexpected HTTP ${r.status}.`
}

function codeOf(results) {
  const first = results.find((r) => !r.ok)
  if (simulate && !first) return "SIMULATED"
  if (!first) return "200"
  return first.status === null ? (first.error?.startsWith("timeout") ? "TIMEOUT" : "ERROR") : String(first.status)
}

function runLink() {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env
  return GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : "(local run)"
}

function buildEmail(results) {
  const code = codeOf(results)
  const failing = results.filter((r) => !r.ok)
  const nowUtc = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC")
  const lines = [`${HOST} is ${simulate && failing.length === 0 ? "being reported DOWN by a simulate_down test run (the real checks passed)" : "DOWN"}.`, ""]
  for (const r of simulate && failing.length === 0 ? results : failing) {
    lines.push(`URL:          ${r.url}`)
    lines.push(`Status:       ${r.status ?? r.error}${simulate && r.ok ? " (real result; alert simulated)" : ""}`)
    lines.push(`Matched text: ${r.matched ?? "none"}`)
    lines.push(`Likely cause: ${simulate && r.ok ? "none — this is a test" : likelyCause(r)}`)
    lines.push(`Body (first 300 chars): ${r.snippet || "(empty)"}`)
    lines.push("")
  }
  lines.push(`Checked at:   ${nowUtc}`)
  lines.push(`Actions run:  ${runLink()}`)
  lines.push(`Checks run every hour; this e-mail repeats every hour while the site stays down.`)
  return { subject: `SITE DOWN: ${HOST} (HTTP ${code})`, text: lines.join("\n") }
}

async function sendEmail({ subject, text }) {
  if (dryRun) {
    console.log(`\n[dry-run] would e-mail ${process.env.ALERT_EMAIL_TO.split(",").filter((s) => s.trim()).length} recipient(s)\n[dry-run] subject: ${subject}\n[dry-run] body:\n${text}\n`)
    return
  }
  const { default: nodemailer } = await import("nodemailer")
  const port = Number(process.env.SMTP_PORT)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  const to = process.env.ALERT_EMAIL_TO.split(",").map((s) => s.trim()).filter(Boolean)
  await transporter.sendMail({ from: process.env.ALERT_EMAIL_FROM, to, subject, text })
  console.log(`alert e-mail sent to ${to.length} recipient(s)`)
}

async function main() {
  maskSecrets()
  assertSecrets() // fail loudly before any network call
  console.log(`checking ${SITE_URL} (${PATHS.length} URLs, ${ATTEMPTS} attempts each, ${RETRY_DELAY_MS / 1000} s apart, ${TIMEOUT_MS / 1000} s timeout)${simulate ? " — SIMULATE_DOWN" : ""}`)

  const results = []
  for (const path of PATHS) results.push(await probe(path))
  const down = simulate || results.some((r) => !r.ok)

  if (!down) {
    console.log(`UP — ${results.length}/${results.length} URLs answered 200.`)
    return
  }
  const email = buildEmail(results)
  await sendEmail(email)
  // Fail the job so GitHub's own "workflow run failed" notification is a second alert.
  throw new Error(`${email.subject} — alert e-mail sent; failing the job on purpose.`)
}

main().catch((err) => {
  console.error(`::error::${err.message}`)
  process.exit(1)
})
