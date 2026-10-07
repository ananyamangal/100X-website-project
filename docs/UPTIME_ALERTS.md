# Uptime alerts for www.100xcircle.com

`.github/workflows/uptime-alert.yml` checks the live site **once an hour from GitHub's runners**, i.e.
outside Vercel, so an outage caused by Vercel itself is still reported. On 2026-10-07 the Hobby
fair-use pause answered every request with HTTP 402 and a "temporarily paused" page, and nothing
told us. This workflow is the fix for that.

## How it works

1. At minute 7 of every hour (`7 * * * *`) the job requests `https://www.100xcircle.com/` and
   `https://www.100xcircle.com/contact-us`.
2. Each URL gets up to **3 attempts, 20 seconds apart, 15 seconds timeout each**, so one slow
   response is not an alarm.
3. The site is **DOWN** when any URL still fails after its attempts:
   - HTTP status other than **200** (402 and 5xx especially), or
   - a timeout or connection error, or
   - the body contains **"temporarily paused"** or **"DEPLOYMENT_PAUSED"**, or
   - the run was started by hand with **simulate_down** ticked.
4. When DOWN, the job sends **one e-mail per run** to the recipients in the `ALERT_EMAIL_TO` secret,
   then **fails on purpose**, so GitHub's own "workflow run failed" notification is a second alert.
   Because the check is hourly, the e-mail repeats every hour while the site stays down.
5. When UP, the job logs `UP — 2/2 URLs answered 200` and sends nothing.

The e-mail subject is `SITE DOWN: www.100xcircle.com (HTTP <code>)` (`<code>` is the first failing
status, or `TIMEOUT`, `ERROR` or `SIMULATED`). The body lists, per failing URL, the status, the
matched text, the likely cause (for 402: Vercel's fair-use pause or a billing issue) and the first
300 characters of the response, plus the UTC time and a link to the Actions run.

The check script is `.github/scripts/uptime-alert.mjs` (Node 22, one pinned dependency:
`nodemailer@6.9.16`, installed at run time). No app code, middleware, `vercel.json` or SEO file is
involved.

## Secrets (Settings → Secrets and variables → Actions → *Repository secrets*)

The repository is public, so **no address, password or key is written anywhere in the repo**, in the
job log or in a pull request. All six secrets below are **required**; if any is missing the job fails
immediately with a message naming the missing secret (names only, never values). Secret values are
masked in the log, including each recipient of the comma-separated list.

| secret | value |
|---|---|
| `ALERT_EMAIL_TO` | comma-separated recipient e-mail addresses |
| `ALERT_EMAIL_FROM` | sender address shown in the e-mail (for Gmail, the same mailbox as `SMTP_USER`) |
| `SMTP_HOST` | SMTP server, e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `465` (implicit TLS) or `587` (STARTTLS) |
| `SMTP_USER` | mailbox that sends the alerts |
| `SMTP_PASS` | its password; for Gmail an **app password** (Google Account → Security → 2-Step Verification → App passwords), not the account password |

To change recipients, edit the `ALERT_EMAIL_TO` secret. No code change is needed; the next run picks
it up.

## Testing with simulate_down

1. GitHub → **Actions** → **Uptime alert** → **Run workflow**.
2. Tick **simulate_down** and run.
3. Within about a minute every `ALERT_EMAIL_TO` recipient receives
   `SITE DOWN: www.100xcircle.com (HTTP SIMULATED)` whose body shows the real probe results marked as
   simulated. The run is shown as **failed** — that is expected (DOWN fails the job) and also proves the
   failure-notification path.
4. Run it again **without** the tick: the job passes and logs `UP — 2/2 URLs answered 200`.

A run with a missing secret fails in the first step with
`Missing required repository secret(s): <names>`.

## Things to know

- **GitHub disables scheduled workflows after 60 days without repository activity** (no commits or
  other activity on the default branch). When that happens the Actions page shows a banner with an
  "Enable workflow" button; any commit also re-enables it. Check the Actions page occasionally, or
  keep a monthly dummy commit if the repo goes quiet.
- **Cron can run a few minutes late** under GitHub load; the hourly cadence is approximate, and a
  scheduled run is sometimes skipped entirely at peak times. The `workflow_dispatch` button always
  works.
- The job fails whenever the site is DOWN, so the Actions page turning red is itself a signal.
- GitHub sends its own "workflow run failed" e-mail to the person who last touched the workflow
  (Settings → Notifications → Actions). That is the second alert path; it carries no site details.
- Only GET requests are made; nothing is written to the site or its database.
