#!/usr/bin/env node
/**
 * Auth & User Lifecycle QA Test Suite
 *
 * Tests every step of the user lifecycle against a live running dev server.
 * Usage:
 *   node scripts/qa-auth-tests.js [--url http://localhost:3000] [--admin-email ...] [--admin-password ...]
 *
 * The suite uses the ADMIN_PASSWORD env var (or --admin-password flag) to log in
 * as the super admin before running each test.
 *
 * All test users are created under the domain @qa-test-100x.internal
 * and are cleaned up at the end of the run.
 */

const http   = require("http")
const https  = require("https")
const { URL } = require("url")

// ── Config ─────────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2)
const getArg = (flag, env, def) => {
  const i = args.indexOf(flag)
  return (i !== -1 && args[i + 1]) ? args[i + 1] : (process.env[env] || def)
}

const BASE_URL      = getArg("--url",            "QA_BASE_URL",      "http://localhost:3000")
const ADMIN_EMAIL   = getArg("--admin-email",    "QA_ADMIN_EMAIL",   "sulabh.mangal@gmail.com")
const ADMIN_PW      = getArg("--admin-password", "ADMIN_PASSWORD",   "")
const TEST_EMAIL    = `qa-test-${Date.now()}@qa-test-100x.internal`
const TEST_PASSWORD = "QaTest@100x2026!"   // meets policy: 10+, upper, lower, number, special
const NEW_PASSWORD  = "QaNew@100x2026!"

// ── HTTP helpers ───────────────────────────────────────────────────────────────

let cookieJar = {}

function extractCookies(headers) {
  const setCookie = headers["set-cookie"] || []
  for (const line of setCookie) {
    const [pair] = line.split(";")
    const [name, value] = pair.split("=")
    if (name && value !== undefined) cookieJar[name.trim()] = value.trim()
  }
}

function buildCookieHeader() {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; ")
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(path, BASE_URL)
    const payload = body ? JSON.stringify(body) : null
    const mod     = url.protocol === "https:" ? https : http
    const opts    = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === "https:" ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        "Content-Type":    "application/json",
        "Content-Length":  payload ? Buffer.byteLength(payload) : 0,
        "Cookie":          buildCookieHeader(),
        "User-Agent":      "QA-Test-Suite/1.0",
      },
    }
    const req = mod.request(opts, res => {
      let data = ""
      res.on("data", chunk => { data += chunk })
      res.on("end", () => {
        extractCookies(res.headers)
        try { resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers }) }
        catch { resolve({ status: res.statusCode, body: data, headers: res.headers }) }
      })
    })
    req.on("error", reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ── Test runner ────────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0
const results = []

async function test(name, fn) {
  try {
    await fn()
    passed++
    results.push({ name, status: "PASS" })
    process.stdout.write(`  ✓ ${name}\n`)
  } catch (err) {
    failed++
    results.push({ name, status: "FAIL", error: err.message })
    process.stdout.write(`  ✗ ${name}\n    ${err.message}\n`)
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

// ── State shared between tests ─────────────────────────────────────────────────

let adminCookies = {}
let testUserId   = null
let testCookies  = {}
let resetToken   = null

// ── Suite ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔐 Auth QA Test Suite`)
  console.log(`   Target:  ${BASE_URL}`)
  console.log(`   Admin:   ${ADMIN_EMAIL}`)
  console.log(`   Test user: ${TEST_EMAIL}\n`)

  // ── 1. Admin Login ───────────────────────────────────────────────────────────
  console.log("── Phase 1: Admin Login ──")
  await test("Admin can log in with email + password", async () => {
    if (!ADMIN_PW) throw new Error("No admin password set — use --admin-password or ADMIN_PASSWORD env var")
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", {
      email: ADMIN_EMAIL,
      password: ADMIN_PW,
    })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.success, "Login success flag not set")
    adminCookies = { ...cookieJar }
  })

  await test("Admin GET /me returns correct identity", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.user?.email === ADMIN_EMAIL, `Expected ${ADMIN_EMAIL}, got ${res.body.user?.email}`)
    assert(res.body.user?.role === "super_admin", `Expected super_admin, got ${res.body.user?.role}`)
  })

  // ── 2. Create User ───────────────────────────────────────────────────────────
  console.log("\n── Phase 2: Create User ──")
  await test("Create test user with valid password", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email:    TEST_EMAIL,
      name:     "QA Test User",
      role:     "viewer",
      password: TEST_PASSWORD,
    })
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.id, "No user ID returned")
    testUserId = res.body.id
  })

  await test("Reject weak password on create (< 10 chars, no special)", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email:    `qa-weak-${Date.now()}@qa-test-100x.internal`,
      name:     "Weak Password User",
      role:     "viewer",
      password: "weakpass",
    })
    assert(res.status === 422, `Expected 422, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test("User record exists in DB (via GET /api/admin/users/[id])", async () => {
    assert(testUserId, "No test user ID from previous test")
    cookieJar = { ...adminCookies }
    const res = await request("GET", `/api/admin/users/${testUserId}`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.user?.email === TEST_EMAIL, "Email mismatch in DB")
    assert(res.body.user?.isActive === true, "New user should be active")
  })

  await test("Duplicate email rejected on create", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: TEST_EMAIL, name: "Duplicate", role: "viewer", password: TEST_PASSWORD,
    })
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`)
  })

  // ── 3. New User Login ─────────────────────────────────────────────────────────
  console.log("\n── Phase 3: New User Login ──")
  await test("Newly created user can log in", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", {
      email:    TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.success, "Login success flag not set")
    testCookies = { ...cookieJar }
  })

  await test("New user GET /me returns correct role", async () => {
    cookieJar = { ...testCookies }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.user?.role === "viewer", `Expected viewer, got ${res.body.user?.role}`)
    assert(res.body.user?.permissions?.length > 0, "User should have at least 1 permission")
  })

  await test("Wrong password is rejected", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", {
      email: TEST_EMAIL, password: "WrongPassword@999",
    })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  // ── 4. Edit User ──────────────────────────────────────────────────────────────
  console.log("\n── Phase 4: Edit User ──")
  await test("Admin can change user role", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("PATCH", `/api/admin/users/${testUserId}`, { role: "content_team" })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test("Role change persists in DB", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", `/api/admin/users/${testUserId}`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.user?.role === "content_team", `Expected content_team, got ${res.body.user?.role}`)
  })

  // ── 5. Admin Reset Password ───────────────────────────────────────────────────
  console.log("\n── Phase 5: Admin Password Reset ──")
  await test("Admin can generate temp password for user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", `/api/admin/users/${testUserId}/reset-password`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.tempPassword, "No temp password returned")
  })

  await test("User can log in with new temp password (admin-generated)", async () => {
    cookieJar = { ...adminCookies }
    // First get the temp password
    const resetRes = await request("POST", `/api/admin/users/${testUserId}/reset-password`)
    assert(resetRes.status === 200, `Reset failed: ${JSON.stringify(resetRes.body)}`)
    const tempPw = resetRes.body.tempPassword
    cookieJar = {}
    const loginRes = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: tempPw })
    assert(loginRes.status === 200, `Login with temp password failed: ${JSON.stringify(loginRes.body)}`)
  })

  // ── 6. Forgot Password (token-based) ──────────────────────────────────────────
  console.log("\n── Phase 6: Forgot Password (Token) ──")
  await test("Admin can get reset link for user (manual delivery)", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", `/api/admin/users/${testUserId}/get-reset-link`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.resetUrl, "No resetUrl returned")
    // Extract token from URL
    const url  = new URL(res.body.resetUrl)
    resetToken = url.searchParams.get("token")
    assert(resetToken, "No token in reset URL")
  })

  await test("Reset token can be used to set new password", async () => {
    assert(resetToken, "No reset token from previous test")
    const res = await request("POST", "/api/admin/auth/reset-password", {
      token:           resetToken,
      password:        NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.ok, "Reset not OK")
  })

  await test("User can log in with new password after reset", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: NEW_PASSWORD })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    testCookies = { ...cookieJar }
  })

  await test("Old password no longer works after reset", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: TEST_PASSWORD })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  await test("Used reset token cannot be reused", async () => {
    assert(resetToken, "No reset token")
    const res = await request("POST", "/api/admin/auth/reset-password", {
      token: resetToken, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD,
    })
    assert(res.status === 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.error?.includes("already been used"), `Expected 'already been used', got: ${res.body.error}`)
  })

  // ── 7. Logout ────────────────────────────────────────────────────────────────
  console.log("\n── Phase 7: Logout ──")
  await test("User can log out", async () => {
    cookieJar = { ...testCookies }
    const res = await request("POST", "/api/admin/auth/logout")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
  })

  await test("Session is invalid after logout", async () => {
    cookieJar = { ...testCookies }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 401, `Expected 401 after logout, got ${res.status}`)
  })

  // ── 8. Disable User ───────────────────────────────────────────────────────────
  console.log("\n── Phase 8: Disable User ──")
  await test("Re-login as test user before disabling", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: NEW_PASSWORD })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    testCookies = { ...cookieJar }
  })

  await test("Admin can disable user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("PATCH", `/api/admin/users/${testUserId}`, { isActive: false })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test("Disabled user cannot log in", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: NEW_PASSWORD })
    assert(res.status === 401, `Expected 401 for disabled user, got ${res.status}`)
  })

  await test("Disabled user's existing session is revoked", async () => {
    cookieJar = { ...testCookies }
    const res = await request("GET", "/api/admin/auth/me")
    // Session was revoked by PATCH, so should 401
    assert(res.status === 401, `Expected 401 (session revoked), got ${res.status}`)
  })

  await test("Admin can re-enable user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("PATCH", `/api/admin/users/${testUserId}`, { isActive: true })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
  })

  await test("Re-enabled user can log in again", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: NEW_PASSWORD })
    assert(res.status === 200, `Expected 200 after re-enable, got ${res.status}`)
  })

  // ── 9. Delete User ────────────────────────────────────────────────────────────
  console.log("\n── Phase 9: Delete User ──")
  await test("Admin can delete (soft-delete) user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("DELETE", `/api/admin/users/${testUserId}`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test("Deleted user cannot log in", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: NEW_PASSWORD })
    assert(res.status === 401, `Expected 401 for deleted user, got ${res.status}`)
  })

  // ── 10. Recreate Same User ────────────────────────────────────────────────────
  console.log("\n── Phase 10: Recreate Same User ──")
  await test("Can recreate user with same email after soft-delete", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email:    TEST_EMAIL,
      name:     "QA Test User (Recreated)",
      role:     "viewer",
      password: TEST_PASSWORD,
    })
    assert(res.status === 201, `Expected 201 on recreation, got ${res.status}: ${JSON.stringify(res.body)}`)
    testUserId = res.body.id  // new ID
  })

  await test("Recreated user can log in", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: TEST_PASSWORD })
    assert(res.status === 200, `Expected 200 for recreated user, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  // ── 11. Auth Diagnostics ──────────────────────────────────────────────────────
  console.log("\n── Phase 11: Auth Diagnostics ──")
  await test("Auth diagnostics returns PASS for healthy user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", `/api/admin/security/auth-diagnostics?email=${encodeURIComponent(TEST_EMAIL)}`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.checks?.userExists, "userExists should be true")
    assert(res.body.checks?.isActive,   "isActive should be true")
    assert(res.body.checks?.passwordHashFormat === "pbkdf2 (correct)", "Hash format wrong")
    assert(res.body.checks?.roleAssigned, "Role should be assigned")
    assert(res.body.checks?.permissionsCount > 0, "Should have > 0 permissions")
  })

  await test("Auth diagnostics returns FAIL for non-existent user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", `/api/admin/security/auth-diagnostics?email=nobody@qa-test-100x.internal`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.summary === "FAIL", `Expected FAIL, got ${res.body.summary}`)
    assert(res.body.checks?.userExists === false, "userExists should be false")
  })

  // ── 12. Orphan Scan ───────────────────────────────────────────────────────────
  console.log("\n── Phase 12: Orphan Scan ──")
  await test("Orphan scan runs without error", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/security/orphans")
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(typeof res.body.summary?.totalUsers === "number", "summary.totalUsers should be a number")
    assert(typeof res.body.orphans === "object",             "orphans section should exist")
  })

  // ── Cleanup ────────────────────────────────────────────────────────────────────
  console.log("\n── Cleanup ──")
  await test("Delete test user (final cleanup)", async () => {
    if (!testUserId) { skipped++; return }
    cookieJar = { ...adminCookies }
    const res = await request("DELETE", `/api/admin/users/${testUserId}`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
  })

  // ── Report ──────────────────────────────────────────────────────────────────
  const total = passed + failed
  console.log(`\n${"─".repeat(48)}`)
  console.log(`  Auth QA Results: ${passed}/${total} passed  ${failed > 0 ? `(${failed} FAILED)` : "✓"}`)
  console.log(`${"─".repeat(48)}`)

  if (failed > 0) {
    console.log("\nFailed tests:")
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  ✗ ${r.name}`)
      console.log(`    ${r.error}`)
    })
  }

  console.log(`\nFeature Matrix:`)
  const matrix = [
    { feature: "Create User",          passing: passed > 0 },
    { feature: "Edit User",            passing: results.find(r => r.name.includes("change user role"))?.status === "PASS" },
    { feature: "Delete User",          passing: results.find(r => r.name.includes("can delete"))?.status === "PASS" },
    { feature: "Forgot Password",      passing: results.find(r => r.name.includes("get reset link"))?.status === "PASS" },
    { feature: "Reset Password",       passing: results.find(r => r.name.includes("new password after reset"))?.status === "PASS" },
    { feature: "Login",                passing: results.find(r => r.name.includes("Newly created user can log in"))?.status === "PASS" },
    { feature: "Logout",               passing: results.find(r => r.name.includes("can log out"))?.status === "PASS" },
    { feature: "Disable User",         passing: results.find(r => r.name.includes("cannot log in"))?.status === "PASS" },
    { feature: "Session Revocation",   passing: results.find(r => r.name.includes("session is revoked"))?.status === "PASS" },
    { feature: "User Recreation",      passing: results.find(r => r.name.includes("same email after soft-delete"))?.status === "PASS" },
    { feature: "Auth Diagnostics",     passing: results.find(r => r.name.includes("PASS for healthy"))?.status === "PASS" },
    { feature: "Orphan Detection",     passing: results.find(r => r.name.includes("Orphan scan"))?.status === "PASS" },
  ]

  const w = Math.max(...matrix.map(m => m.feature.length)) + 2
  for (const { feature, passing } of matrix) {
    const status = passing === undefined ? "SKIPPED" : passing ? "WORKING" : "BROKEN"
    const color  = status === "WORKING" ? "✓" : status === "BROKEN" ? "✗" : "·"
    console.log(`  ${color} ${feature.padEnd(w)} ${status}`)
  }

  console.log("")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
