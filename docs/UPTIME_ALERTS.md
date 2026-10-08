# Uptime alerts for www.100xcircle.com

`.github/workflows/uptime-alert.yml` checks the live site **from GitHub's runners**, i.e. outside
Vercel, so an outage caused by Vercel itself is still reported. On 2026-10-07 the Hobby fair-use
pause answered every request with HTTP 402 and a "temporarily paused" page, and nothing told us.
This workflow is the fix for that. It is the only uptime workflow in the repo.

## How it works

1. Every 10 minutes (`*/10 * * * *`) the job requests `https://www.100xcircle.com/` and
   `https://www.100xcircle.com/contact-us` (GET only; nothing is written to the site or its database).
2. Each URL gets up to **3 attempts, 20 seconds apart, 15 seconds timeout each**, so one slow
   response is not an alarm.
3. A URL **fails** when, after its attempts, it:
   - answered anything other than **HTTP 200**, or
   - timed out, or failed DNS / TLS / the connection, or
   - served a page containing **"temporarily paused"** or **"DEPLOYMENT_PAUSED"**, or
   - answered 200 but without the expected text (`100X`), i.e. not our site.
4. The site is **DOWN** when any URL fails. What happens next depends on the previous state:

| previous → now | e-mail | job result |
|---|---|---|
| UP → UP | none | passes |
| UP → DOWN | **SITE DOWN** at once | fails (GitHub's own failure e-mail is a second channel) |
| DOWN → DOWN, < 1 h since the last alert | none (a warning in the run log) | passes |
| DOWN → DOWN, ≥ 1 h since the last alert | **STILL DOWN for …** | fails |
| DOWN → UP | one **RECOVERED** with start, end and duration | passes |

The job fails only on runs that send an alert, so a long outage does not turn every 10-minute run
red and does not multiply GitHub's own failure e-mails.

### Where the UP/DOWN state lives (and why)

A small JSON file, `.uptime-state/state.json` (`status`, `since`, `lastAlertAt`, `cause`), is
restored from and saved to the **GitHub Actions cache** on every run. Cache keys are immutable, so
each run saves under its own run id and the next run restores the newest one by prefix. This was
chosen over the alternatives because:

- it needs no database, no commits to the repo and no extra token;
- an artifact cannot be read by the next run without an API token and a lookup;
- "the last run's conclusion" does not say *when* the outage started or when we last e-mailed, so it
  cannot produce the recovery duration or the hourly limit.

If the cache entry is ever missing (GitHub evicts entries unused for 7 days, which cannot happen
while the job runs every 10 minutes), the run assumes UP; the worst case is one extra DOWN e-mail.
Test runs (`simulate_down`, `simulate_recovery`) never save state.

If an alert e-mail cannot be sent, the state remembers the outage with its real start time and marks
the alert as pending; the next run retries it. A failed RECOVERED e-mail is retried the same way.

## Alert e-mails

Subjects:

- `SITE DOWN [<cause>]: www.100xcircle.com (<status or error>)`
- `STILL DOWN for 1h 20m [<cause>]: www.100xcircle.com (<status or error>)`
- `RECOVERED after 1h 40m: www.100xcircle.com`
- test runs are prefixed with `[TEST]`

The DOWN body has, per failing URL: the cause, status code, matched text, the `x-vercel-id` and
`server` response headers and the first 300 characters of the body, plus the time in UTC and IST,
the link to the Actions run and the link to the Vercel project dashboard. The RECOVERED body has the
outage start, end and duration in UTC and IST, and the last cause seen.

### Causes and what to do first

| cause (in the subject) | means | what to do first |
|---|---|---|
| HTTP 402 / Vercel pause or billing | 402, or a "temporarily paused" / `DEPLOYMENT_PAUSED` page | Open Vercel → **Usage** and **Billing** for the project; resume the deployment, raise the limit or fix the payment method. |
| 5xx app error | the app answered 500–599 | Vercel → **Deployments** → current production deployment → **Logs**; if a deploy just went out, use **Instant Rollback**. |
| timeout, site not responding | no answer within 15 s | Vercel → **Observability / Logs** for hung functions; check MongoDB Atlas is reachable; retry by hand. |
| DNS failure | the name did not resolve | Vercel → **Domains** (records Valid?), then the registrar's DNS settings. |
| TLS / certificate problem | certificate expired, missing or wrong | Vercel → **Domains** → certificate status; re-verify the domain. |
| page loads but expected content is missing | 200 without "100X" | Open the URL: the domain may point at the wrong project/deployment, or the page renders empty. |
| connection failed | refused / reset | Retry from another network; check vercel-status.com and Vercel → Domains. |
| unexpected HTTP status | 401/403/404/3xx | 401/403: Deployment Protection or Firewall covering the public site; 404/3xx: domain or redirect changes. |

## Secrets (Settings → Secrets and variables → Actions → *Repository secrets*)

The repository is public, so **no address, password or key is written anywhere in the repo**, in the
job log or in a pull request. All six are **required**; if one is missing the job fails at once with
a message naming it (names only, never values). Values are masked in the log, including each
recipient of the comma-separated list.

| secret | value |
|---|---|
| `ALERT_EMAIL_TO` | comma-separated recipient e-mail addresses |
| `ALERT_EMAIL_FROM` | sender address (for Gmail, the same mailbox as `SMTP_USER`) |
| `SMTP_HOST` | SMTP server, e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `465` (implicit TLS) or `587` (STARTTLS) |
| `SMTP_USER` | mailbox that sends the alerts |
| `SMTP_PASS` | its password; for Gmail an **app password**, not the account password |

To change recipients, edit `ALERT_EMAIL_TO`; the next run picks it up.

## Repository variable: maintenance mode

Settings → Secrets and variables → Actions → **Variables** → `MAINTENANCE_MODE` = `true` silences the
monitor during planned work: runs log `MAINTENANCE_MODE is on` and make **no requests and send no
e-mail**; the saved state is left as it was. Delete the variable (or set it to anything else) when
the work is done; if the site is still down at that point, the next run alerts as usual.

## Testing

GitHub → **Actions** → **Uptime alert** → **Run workflow**, then tick one option:

- **simulate_down**: sends `[TEST] SITE DOWN …` with the real probe results marked as a test; the run
  fails on purpose (that also proves GitHub's failure-notification path).
- **simulate_recovery**: sends `[TEST] RECOVERED after 47m …`; the run passes.
- neither: a normal check, plus the SMTP login check below.

Neither test option changes the saved UP/DOWN state, and both make the same two GET requests as a
normal run (no extra load, no data created).

Locally, `DRY_RUN=true` prints e-mails instead of sending them, and only under `DRY_RUN` the hooks
`FAKE_RESULT=up|402|paused|500|timeout|dns|tls|content`, `FAKE_SMTP_FAIL=true` and `FAKE_NOW=<ISO time>`
let you walk through every transition without contacting the site or a mail server:

```
DRY_RUN=true STATE_FILE=/tmp/s.json FAKE_RESULT=402 ALERT_EMAIL_TO=a@example.invalid \
  ALERT_EMAIL_FROM=x@example.invalid SMTP_HOST=h SMTP_PORT=465 SMTP_USER=u SMTP_PASS=p \
  node .github/scripts/uptime-alert.mjs
```

## Watching the watcher

- **Daily monitor health run** (`23 3 * * *`, 08:53 IST, and on every manual run): logs in to SMTP
  without sending anything. If the login fails the run fails with `SMTP LOGIN FAILED`, so a broken
  alert mailbox shows up as a red run and GitHub's own failure e-mail even while the site is UP.
- An alert e-mail that cannot be sent fails the run with `ALERT E-MAIL COULD NOT BE SENT`.
- **Keep-alive:** GitHub disables scheduled workflows after 60 days without repository activity. The
  daily run calls the "enable workflow" API on this workflow (`actions: write`, `GITHUB_TOKEN` only),
  which keeps the schedule alive. If it is ever disabled anyway, the Actions page shows a banner
  with an **Enable workflow** button.
- **GitHub cron is best-effort.** Scheduled runs can start late or be skipped when GitHub is busy;
  on 2026-10-07/08 the old 10-minute and hourly schedules actually ran only every 4–6 hours. If that
  continues, add an external trigger: any free scheduler (cron-job.org, Better Stack, UptimeRobot
  webhook, …) can `POST https://api.github.com/repos/<owner>/<repo>/dispatches` with
  `{"event_type":"uptime-check"}` every 10 minutes using a fine-grained token limited to this
  repository with **Contents: read and write** (required by that endpoint), stored only in that
  scheduler. The workflow already listens for `repository_dispatch` type `uptime-check`; the
  state/cooldown logic keeps e-mails at most hourly no matter how often it is triggered.
- Check the Actions tab after any long quiet period; the run history is the monitor's own log.

## Files

- `.github/workflows/uptime-alert.yml` — schedules, cache restore/save, monitor-health job
- `.github/scripts/uptime-alert.mjs` — checks, state machine, e-mails (Node 22, one pinned dependency:
  `nodemailer@6.9.16`, installed at run time)
- `/api/health` (`app/api/health/route.ts`) is a static, CDN-cached probe route kept for external
  monitors; this workflow does not call it.

## WhatsApp / Telegram / ntfy (not wired, out of scope for now)

E-mail is the only channel. The optional WhatsApp (Meta Cloud API or Twilio), Telegram and ntfy
senders from the earlier 10-minute workflow lived in `scripts/uptime/notify.mjs`, which was removed
together with that duplicate workflow because nothing called it any more. The code is kept in git
history (`git show ead7701:scripts/uptime/notify.mjs`) and can be wired into
`.github/scripts/uptime-alert.mjs` once the WhatsApp number is decided.
