# 100x Circle website

Next.js 15 site for www.100xcircle.com with the Growth OS admin. This README currently documents the
operational pieces that live outside the app itself.

## Uptime alerts (GitHub Actions, outside Vercel)

`.github/workflows/uptime.yml` checks the live site **every 10 minutes from GitHub's runners**, so an
outage caused by Vercel itself (the Hobby fair-use pause of 2026-10-07 answered every request with
HTTP 402 and a "temporarily paused" page) is still reported. It also runs a **daily Vercel usage check**
at 09:00 IST. Nothing in this workflow touches the site's database; its small state lives in the
Actions cache.

### What counts as DOWN

Each run requests `/`, `/contact-us`, one product page and `/api/health` (a static, CDN-cached route
that never queries MongoDB). A target fails when it:

- answers anything other than 2xx (402 and 5xx included), or
- takes longer than 15 seconds, or
- is missing its expected marker text, or
- contains the words "temporarily paused".

Failing targets are re-probed once after 30 seconds. If any still fails the site is DOWN:

| situation | what is sent |
|---|---|
| first failing run | `[DOWN]` alert: failing URLs with status/error, time in IST, first-seen time, Vercel dashboard link, link to the workflow run |
| still down | `[STILL DOWN]` repeat **once an hour** |
| back to all-2xx | one `[RECOVERED]` alert with the outage duration |
| daily usage ≥ 70 % / ≥ 90 % of the plan limit | `[USAGE 70 %]` / `[USAGE 90 %]` once per day per threshold |

Alerts go by **e-mail** (mandatory). WhatsApp and the free Telegram / ntfy fallbacks are optional and
switched on simply by adding their secrets.

### Secrets to add (Settings → Secrets and variables → Actions → *Secrets*)

The repository is public: **no address, number, key or token is written anywhere in the repo.**
Everything is read from these secrets. The workflow **fails with a clear error** if the mandatory
ones are missing or if no e-mail transport is configured.

| secret | required | value |
|---|---|---|
| `ALERT_EMAIL_TO` | **yes** | comma-separated recipient e-mail addresses |
| `SMTP_HOST` | yes, for SMTP | e.g. `smtp.gmail.com` (Gmail needs an *app password*, not the account password) |
| `SMTP_PORT` | yes, for SMTP | `465` (TLS) or `587` (STARTTLS) |
| `SMTP_USER` | yes, for SMTP | mailbox that sends the alerts |
| `SMTP_PASS` | yes, for SMTP | its app password |
| `ALERT_EMAIL_FROM` | optional with SMTP (defaults to `SMTP_USER`); required with an API provider | sender address |
| `RESEND_API_KEY` / `BREVO_API_KEY` / `SENDGRID_API_KEY` | alternative to SMTP | one API key if you prefer an e-mail API over SMTP |
| `WHATSAPP_TO` | optional | comma-separated recipient numbers in E.164 digits (country code, no `+`) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANG` | optional (Meta Cloud API) | an approved template whose body is a single `{{1}}` parameter; language code defaults to `en_US` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_CONTENT_SID` | optional (Twilio instead of Meta) | `TWILIO_WHATSAPP_FROM` like `whatsapp:+14155238886`; `TWILIO_CONTENT_SID` is the approved template, needed outside a 24-hour conversation window |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | optional fallback | bot token from @BotFather and the chat/group id |
| `NTFY_TOPIC`, `NTFY_SERVER` | optional fallback | ntfy topic (pick a long random name — topics are public by name); server defaults to `https://ntfy.sh` |
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` | optional, daily usage job | a **read-only** Vercel token; without `VERCEL_TOKEN` the usage job just logs "skipped" |

Fallback rule: Telegram / ntfy are used when WhatsApp is not configured or its send fails. Set the
repository **variable** `ALERT_ALWAYS_FALLBACK=true` to always send them as well.

### Variables (Settings → Secrets and variables → Actions → *Variables*, all optional)

| variable | default | purpose |
|---|---|---|
| `SITE_URL` | `https://www.100xcircle.com` | site to check |
| `VERCEL_DASHBOARD_URL` | `https://vercel.com/dashboard` | link included in every alert |
| `UPTIME_TARGETS` | the four built-in targets | JSON array of `{ "path": "/…", "marker": "text that must appear" }` to replace the list |
| `ALERT_ALWAYS_FALLBACK` | unset | `true` = always send Telegram / ntfy too |
| `VERCEL_USAGE_URL` | `https://api.vercel.com/v2/usage` | usage endpoint for the daily job (see caveat below) |
| `USAGE_LIMIT_CPU_HOURS` | `4` | plan limit the 70 % / 90 % thresholds are measured against |
| `USAGE_LIMIT_INVOCATIONS` | `1000000` | same, for invocations |
| `USAGE_CPU_UNIT` | `s` | unit of the CPU field returned by the usage endpoint (`ms`, `s` or `h`) |

### Testing it ("simulate down")

1. Actions → **Uptime alerts** → **Run workflow**.
2. Tick **simulate_down** and run.
3. Within a minute every configured channel receives a `[TEST] DOWN … (simulated)` alert that lists the
   real probe results. The stored state is **not** modified, so no `RECOVERED` message follows.

Tick **run_usage** instead to run the daily usage check on demand. A run with missing secrets fails
with the list of missing names in the job log.

### Changing recipients

Edit the `ALERT_EMAIL_TO` secret (and `WHATSAPP_TO` / `TELEGRAM_CHAT_ID` / `NTFY_TOPIC` if used). No
code change or deploy is needed; the next run picks the new value up.

### Caveats

- GitHub cron schedules can drift by several minutes under load; the 10-minute cadence is a floor, not
  a guarantee.
- The state lives in the Actions cache, which GitHub evicts after 7 days without access; with a run
  every 10 minutes that never happens, but if the workflow is disabled for a week the next run starts
  from a clean "UP" state.
- **Vercel has no public, stable usage API** (confirmed by Vercel staff on the community forum). The
  daily job calls the endpoint in `VERCEL_USAGE_URL` and reads the first numeric fields named like
  "activeCpu"/"invocations". If the response is not understood it logs the keys, sends a "cannot read
  usage" note at most once a week, and never raises a false threshold alarm. Check Vercel → Usage by
  hand until the endpoint is confirmed.
- `/api/health` is intentionally static (`force-static`, 60 s ISR) so the probe costs no function
  time. It proves the deployment is serving, not that MongoDB is reachable.
