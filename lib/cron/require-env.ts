/**
 * Missing-key guard for Vercel Cron jobs.
 *
 * A scheduled job whose integration was never set up (no API key / token in the
 * environment) must not run on a timer anyway: it would read stale data, write
 * the same rows again and — for the Revenue Director — e-mail the same brief
 * every morning. Call this at the top of the cron handler, after the auth check
 * and before any database, API or e-mail work. When a variable is missing it
 * logs one line naming the variable (never a value) and returns its name; the
 * handler then answers 200 { ok: true, skipped: "missing_env" } so Vercel does
 * not report the job as failed. With every variable present it returns null
 * and the job runs exactly as before.
 */
export function missingCronEnv(
  job: string,
  names: readonly string[],
  env: Record<string, string | undefined> = process.env
): string | null {
  for (const name of names) {
    if (!(env[name] ?? "").trim()) {
      console.log(`[cron:${job}] skipped: ${name} is not set`)
      return name
    }
  }
  return null
}
