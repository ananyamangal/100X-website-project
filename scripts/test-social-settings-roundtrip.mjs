#!/usr/bin/env node
/**
 * Round-trip test for Task 1: saves every social platform through the real
 * admin API, reads it back, and asserts nothing was dropped or renamed —
 * i.e. Facebook/Instagram persist exactly like YouTube/LinkedIn do.
 *
 * /api/admin/site-settings requires an authenticated admin session, so this
 * script needs a session cookie from a real logged-in browser: open /admin
 * in Chrome, DevTools > Application > Cookies, copy the value of the
 * session cookie (see lib/rbac/jwt.ts SESSION_COOKIE, currently "admin-token"),
 * and run:
 *
 *   ADMIN_SESSION_COOKIE=<value> node scripts/test-social-settings-roundtrip.mjs [--base http://localhost:3000]
 *
 * The script restores the original settings document when it's done (pass
 * or fail), so it's safe to run against a real environment.
 */
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:3000"
const COOKIE = process.env.ADMIN_SESSION_COOKIE

if (!COOKIE) {
  console.error("Set ADMIN_SESSION_COOKIE to a logged-in admin session cookie value. See script header for how to get one.")
  process.exit(1)
}

const SOCIAL_PLATFORM_KEYS = [
  "youtube", "facebook", "instagram", "linkedin", "twitter", "whatsapp", "telegram", "googleBiz",
]

function buildTestSocial() {
  const social = {}
  for (const key of SOCIAL_PLATFORM_KEYS) {
    social[key] = {
      url: `https://example.com/roundtrip-test/${key}`,
      showInHeader: true,
      showInFooter: true,
      showOnContactPage: true,
      showOnProductPages: true,
    }
  }
  return social
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Cookie: `admin-token=${COOKIE}`,
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text().catch(() => "")}`)
  return res.json()
}

async function main() {
  console.log(`[roundtrip] base=${BASE}`)
  const original = await req("/api/admin/site-settings")
  console.log("[roundtrip] fetched current settings (will restore at the end)")

  const testSocial = buildTestSocial()
  await req("/api/admin/site-settings", {
    method: "POST",
    body: JSON.stringify({ ...original, social: testSocial }),
  })
  console.log("[roundtrip] saved test payload for all", SOCIAL_PLATFORM_KEYS.length, "platforms")

  const after = await req("/api/admin/site-settings")

  let failures = 0
  for (const key of SOCIAL_PLATFORM_KEYS) {
    const expected = testSocial[key]
    const actual = after.social?.[key]
    const ok =
      actual &&
      actual.url === expected.url &&
      actual.showInHeader === expected.showInHeader &&
      actual.showInFooter === expected.showInFooter &&
      actual.showOnContactPage === expected.showOnContactPage &&
      actual.showOnProductPages === expected.showOnProductPages
    console.log(`  ${ok ? "OK  " : "FAIL"} ${key}:`, JSON.stringify(actual))
    if (!ok) failures++
  }

  // Restore original settings regardless of outcome.
  await req("/api/admin/site-settings", { method: "POST", body: JSON.stringify(original) })
  console.log("[roundtrip] restored original settings")

  if (failures > 0) {
    console.error(`[roundtrip] FAILED — ${failures} platform(s) did not round-trip`)
    process.exit(1)
  }
  console.log("[roundtrip] PASSED — every platform round-tripped correctly")
}

main().catch((err) => {
  console.error("[roundtrip] error:", err.message)
  process.exit(1)
})
