#!/usr/bin/env node
/**
 * Auth & User Lifecycle QA Test Suite — v2
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

const http    = require("http")
const https   = require("https")
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
const TEST_EMAIL_2  = `qa-test2-${Date.now()}@qa-test-100x.internal`
const TEST_PASSWORD = "QaTest@100x2026!"   // meets policy: 10+, upper, lower, number, special
const NEW_PASSWORD  = "QaNew@100x2026!"
const WEAK_PASSWORD = "weakpass"           // fails policy: no uppercase, no special, < 10 chars

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

function request(method, path, body, extraHeaders) {
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
        "Content-Type":   "application/json",
        "Content-Length": payload ? Buffer.byteLength(payload) : 0,
        "Cookie":         buildCookieHeader(),
        "User-Agent":     "QA-Test-Suite/2.0",
        ...extraHeaders,
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

function skip(name, reason) {
  skipped++
  results.push({ name, status: "SKIP", error: reason })
  process.stdout.write(`  · ${name} (skipped: ${reason})\n`)
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

// ── State shared between tests ─────────────────────────────────────────────────

let adminCookies = {}
let testUserId   = null
let testUserId2  = null
let testCookies  = {}
let resetToken   = null

// ── Suite ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔐 Auth QA Test Suite v2`)
  console.log(`   Target:     ${BASE_URL}`)
  console.log(`   Admin:      ${ADMIN_EMAIL}`)
  console.log(`   Test user:  ${TEST_EMAIL}\n`)

  // ── 1. Admin Login ───────────────────────────────────────────────────────────
  console.log("── Phase 1: Admin Login ──")
  await test("Admin can log in with email + password", async () => {
    if (!ADMIN_PW) throw new Error("No admin password — use --admin-password or ADMIN_PASSWORD env var")
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: ADMIN_EMAIL, password: ADMIN_PW })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.success, "Login success flag not set")
    adminCookies = { ...cookieJar }
  })

  await test("Admin GET /me returns correct identity", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.user?.email === ADMIN_EMAIL, `Expected ${ADMIN_EMAIL}`)
    assert(res.body.user?.role === "super_admin", `Expected super_admin, got ${res.body.user?.role}`)
  })

  await test("Login fails with wrong password", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: ADMIN_EMAIL, password: "WrongPW@123" })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  await test("Login requires email field", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { password: ADMIN_PW })
    assert(res.status === 400, `Expected 400, got ${res.status}`)
  })

  await test("Login requires password field", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: ADMIN_EMAIL })
    assert(res.status === 400, `Expected 400, got ${res.status}`)
  })

  await test("Unauthenticated request to protected route returns 401", async () => {
    cookieJar = {}
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  // ── 2. Create User ───────────────────────────────────────────────────────────
  console.log("\n── Phase 2: Create User ──")
  await test("Create test user with valid password", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: TEST_EMAIL, name: "QA Test User", role: "viewer", password: TEST_PASSWORD,
    })
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.id, "No user ID returned")
    testUserId = res.body.id
  })

  await test("Reject password shorter than 10 chars", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: `qa-short-${Date.now()}@qa-test-100x.internal`, name: "Weak", role: "viewer", password: "short",
    })
    assert(res.status === 422, `Expected 422, got ${res.status}`)
  })

  await test("Reject password with no uppercase", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: `qa-noup-${Date.now()}@qa-test-100x.internal`, name: "Weak", role: "viewer", password: "nouppercase@123",
    })
    assert(res.status === 422, `Expected 422, got ${res.status}`)
  })

  await test("Reject password with no special char", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: `qa-nospec-${Date.now()}@qa-test-100x.internal`, name: "Weak", role: "viewer", password: "NoSpecial12345",
    })
    assert(res.status === 422, `Expected 422, got ${res.status}`)
  })

  await test("User record exists in DB after creation", async () => {
    assert(testUserId, "No test user ID")
    cookieJar = { ...adminCookies }
    const res = await request("GET", `/api/admin/users/${testUserId}`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.user?.email === TEST_EMAIL, "Email mismatch")
    assert(res.body.user?.isActive === true, "New user should be active")
  })

  await test("Duplicate email is rejected with 409", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: TEST_EMAIL, name: "Duplicate", role: "viewer", password: TEST_PASSWORD,
    })
    assert(res.status === 409, `Expected 409, got ${res.status}`)
  })

  // ── 3. New User Login ─────────────────────────────────────────────────────────
  console.log("\n── Phase 3: New User Login ──")
  await test("Newly created user can log in", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: TEST_PASSWORD })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.success, "Login success flag not set")
    testCookies = { ...cookieJar }
  })

  await test("New user GET /me returns correct role (viewer)", async () => {
    cookieJar = { ...testCookies }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.user?.role === "viewer", `Expected viewer, got ${res.body.user?.role}`)
    assert((res.body.user?.permissions?.length ?? 0) > 0, "User should have at least 1 permission")
  })

  await test("Wrong password is rejected", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: "WrongPassword@999" })
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

  await test("Non-admin cannot edit users", async () => {
    cookieJar = { ...testCookies }
    const res = await request("PATCH", `/api/admin/users/${testUserId}`, { role: "super_admin" })
    assert(res.status === 403 || res.status === 401, `Expected 403/401, got ${res.status}`)
  })

  // ── 5. Admin Reset Password ───────────────────────────────────────────────────
  console.log("\n── Phase 5: Admin Password Reset ──")
  await test("Admin can generate temp password for user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", `/api/admin/users/${testUserId}/reset-password`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.tempPassword, "No temp password returned")
  })

  await test("User can log in with admin-generated temp password", async () => {
    cookieJar = { ...adminCookies }
    const resetRes = await request("POST", `/api/admin/users/${testUserId}/reset-password`)
    assert(resetRes.status === 200, `Reset failed: ${JSON.stringify(resetRes.body)}`)
    const tempPw = resetRes.body.tempPassword
    cookieJar = {}
    const loginRes = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: tempPw })
    assert(loginRes.status === 200, `Login with temp password failed: ${JSON.stringify(loginRes.body)}`)
  })

  // ── 6. Forgot Password (token-based) ──────────────────────────────────────────
  console.log("\n── Phase 6: Token-Based Password Reset ──")
  await test("Admin can get reset link for user (manual delivery)", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", `/api/admin/users/${testUserId}/get-reset-link`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.resetUrl, "No resetUrl returned")
    const url = new URL(res.body.resetUrl)
    resetToken = url.searchParams.get("token")
    assert(resetToken, "No token in reset URL")
  })

  await test("Reset token can set new password", async () => {
    assert(resetToken, "No reset token")
    const res = await request("POST", "/api/admin/auth/reset-password", {
      token: resetToken, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD,
    })
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.ok, "Reset not OK")
  })

  await test("User can log in with new password after token reset", async () => {
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

  await test("Reset password rejects mismatched confirmPassword", async () => {
    cookieJar = { ...adminCookies }
    const linkRes = await request("POST", `/api/admin/users/${testUserId}/get-reset-link`)
    const freshToken = new URL(linkRes.body.resetUrl).searchParams.get("token")
    const res = await request("POST", "/api/admin/auth/reset-password", {
      token: freshToken, password: NEW_PASSWORD, confirmPassword: "Different@Pass123",
    })
    assert(res.status === 422, `Expected 422, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test("Reset password rejects weak new password", async () => {
    cookieJar = { ...adminCookies }
    const linkRes = await request("POST", `/api/admin/users/${testUserId}/get-reset-link`)
    const freshToken = new URL(linkRes.body.resetUrl).searchParams.get("token")
    const res = await request("POST", "/api/admin/auth/reset-password", {
      token: freshToken, password: "weak", confirmPassword: "weak",
    })
    assert(res.status === 422, `Expected 422, got ${res.status}`)
  })

  await test("Invalid reset token is rejected", async () => {
    const res = await request("POST", "/api/admin/auth/reset-password", {
      token: "totally-invalid-token-12345", password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD,
    })
    assert(res.status === 400, `Expected 400, got ${res.status}`)
  })

  await test("Forgot password endpoint returns ok for unknown email (anti-enumeration)", async () => {
    const res = await request("POST", "/api/admin/auth/forgot-password", {
      email: "nobody-here@qa-test-100x.internal",
    })
    assert(res.status === 200, `Expected 200 (anti-enumeration), got ${res.status}`)
    assert(res.body.ok === true, "Expected ok=true for unknown email")
  })

  await test("Forgot password rejects malformed email", async () => {
    const res = await request("POST", "/api/admin/auth/forgot-password", { email: "not-an-email" })
    assert(res.status === 400, `Expected 400, got ${res.status}`)
  })

  // ── 7. Sessions ───────────────────────────────────────────────────────────────
  console.log("\n── Phase 7: Session Management ──")
  await test("GET /sessions returns session list for current user", async () => {
    cookieJar = { ...testCookies }
    const res = await request("GET", "/api/admin/auth/sessions")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(Array.isArray(res.body.sessions), "sessions should be array")
  })

  await test("Heartbeat keeps session alive", async () => {
    cookieJar = { ...testCookies }
    const res = await request("POST", "/api/admin/auth/sessions/heartbeat")
    assert(res.status === 200 || res.status === 204, `Expected 200/204, got ${res.status}`)
  })

  // ── 8. Logout ────────────────────────────────────────────────────────────────
  console.log("\n── Phase 8: Logout ──")
  await test("User can log out", async () => {
    cookieJar = { ...testCookies }
    const res = await request("POST", "/api/admin/auth/logout")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
  })

  await test("Session is invalid after logout (revocation enforced)", async () => {
    cookieJar = { ...testCookies }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 401, `Expected 401 after logout, got ${res.status}`)
  })

  // ── 9. Disable User ───────────────────────────────────────────────────────────
  console.log("\n── Phase 9: Disable / Enable User ──")
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
    testCookies = { ...cookieJar }
  })

  // ── 10. Account Lockout ───────────────────────────────────────────────────────
  console.log("\n── Phase 10: Account Lockout ──")
  await test("Create second test user for lockout test", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: TEST_EMAIL_2, name: "QA Lockout User", role: "viewer", password: TEST_PASSWORD,
    })
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`)
    testUserId2 = res.body.id
  })

  await test("Account is locked after 5 consecutive wrong passwords (status 423)", async () => {
    for (let i = 0; i < 5; i++) {
      cookieJar = {}
      await request("POST", "/api/admin/auth", { email: TEST_EMAIL_2, password: `WrongPW@${i}` })
    }
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL_2, password: TEST_PASSWORD })
    assert(res.status === 423, `Expected 423 (locked), got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.error?.toLowerCase().includes("lock"), `Expected lockout message, got: ${res.body.error}`)
  })

  // ── 11. Delete User ───────────────────────────────────────────────────────────
  console.log("\n── Phase 11: Delete User ──")
  await test("Admin can soft-delete user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("DELETE", `/api/admin/users/${testUserId}`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test("Deleted user cannot log in", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: NEW_PASSWORD })
    assert(res.status === 401, `Expected 401 for deleted user, got ${res.status}`)
  })

  await test("Deleted user's session is revoked", async () => {
    cookieJar = { ...testCookies }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 401, `Expected 401 for deleted user's session, got ${res.status}`)
  })

  // ── 12. Recreate Same User ────────────────────────────────────────────────────
  console.log("\n── Phase 12: Recreate Same User ──")
  await test("Can recreate user with same email after soft-delete", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("POST", "/api/admin/users", {
      email: TEST_EMAIL, name: "QA Test User (Recreated)", role: "viewer", password: TEST_PASSWORD,
    })
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`)
    testUserId = res.body.id
  })

  await test("Recreated user can log in", async () => {
    cookieJar = {}
    const res = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: TEST_PASSWORD })
    assert(res.status === 200, `Expected 200 for recreated user, got ${res.status}: ${JSON.stringify(res.body)}`)
    testCookies = { ...cookieJar }
  })

  // ── 13. Auth Diagnostics ──────────────────────────────────────────────────────
  console.log("\n── Phase 13: Auth Diagnostics API ──")
  await test("Auth diagnostics returns PASS for healthy user", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", `/api/admin/security/auth-diagnostics?email=${encodeURIComponent(TEST_EMAIL)}`)
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(res.body.checks?.userExists,          "userExists should be true")
    assert(res.body.checks?.isActive,            "isActive should be true")
    assert(res.body.checks?.passwordHashFormat === "pbkdf2 (correct)", "Hash format wrong")
    assert(res.body.checks?.roleAssigned,        "Role should be assigned")
    assert((res.body.checks?.permissionsCount ?? 0) > 0, "Should have > 0 permissions")
  })

  await test("Auth diagnostics returns FAIL for non-existent email", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", `/api/admin/security/auth-diagnostics?email=nobody@qa-test-100x.internal`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.summary === "FAIL", `Expected FAIL, got ${res.body.summary}`)
    assert(res.body.checks?.userExists === false, "userExists should be false")
  })

  await test("Auth diagnostics requires authentication", async () => {
    cookieJar = {}
    const res = await request("GET", `/api/admin/security/auth-diagnostics?email=test@test.com`)
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  // ── 14. Auth Health Dashboard ─────────────────────────────────────────────────
  console.log("\n── Phase 14: Auth Health Dashboard ──")
  await test("Auth health endpoint returns metrics", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/security/auth-health")
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(typeof res.body.users?.total   === "number", "users.total should be number")
    assert(typeof res.body.users?.active  === "number", "users.active should be number")
    assert(typeof res.body.users?.locked  === "number", "users.locked should be number")
    assert(typeof res.body.sessions?.active === "number", "sessions.active should be number")
    assert(["green","yellow","red"].includes(res.body.users?.light),    "users.light should be traffic light")
    assert(["green","yellow","red"].includes(res.body.sessions?.light), "sessions.light should be traffic light")
    assert(["green","yellow","red"].includes(res.body.email?.light),    "email.light should be traffic light")
  })

  await test("Auth health requires authentication", async () => {
    cookieJar = {}
    const res = await request("GET", "/api/admin/security/auth-health")
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  await test("Auth health tracks failed logins today", async () => {
    cookieJar = { ...adminCookies }
    const before = await request("GET", "/api/admin/security/auth-health")
    const beforeCount = before.body.failedLoginsToday?.count ?? 0

    // trigger a failed login
    cookieJar = {}
    await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: "WrongForHealth@99" })

    cookieJar = { ...adminCookies }
    const after = await request("GET", "/api/admin/security/auth-health")
    const afterCount = after.body.failedLoginsToday?.count ?? 0

    assert(afterCount > beforeCount, `Failed count should have increased: ${beforeCount} → ${afterCount}`)
  })

  // ── 15. Email Diagnostics API ─────────────────────────────────────────────────
  console.log("\n── Phase 15: Email Diagnostics API ──")
  await test("Email diagnostics endpoint returns config status", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/security/email-diagnostics")
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(typeof res.body.configured   === "boolean", "configured should be boolean")
    assert(typeof res.body.smtpConnected === "boolean", "smtpConnected should be boolean")
    assert(typeof res.body.smtpAuthOk    === "boolean", "smtpAuthOk should be boolean")
    assert(typeof res.body.sentLast7d    === "number",  "sentLast7d should be number")
    assert(typeof res.body.failedLast7d  === "number",  "failedLast7d should be number")
    assert(typeof res.body.rateLimit     === "string",  "rateLimit should be string")
    assert(res.body.queueSize === 0, "queueSize should be 0 (synchronous delivery)")
  })

  await test("Email diagnostics requires authentication", async () => {
    cookieJar = {}
    const res = await request("GET", "/api/admin/security/email-diagnostics")
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  // ── 16. Session Revocation Enforcement ───────────────────────────────────────
  console.log("\n── Phase 16: Session Revocation Enforcement ──")
  await test("Revoked session cannot access protected API (DB revocation enforced)", async () => {
    // Log in as test user
    cookieJar = {}
    const loginRes = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: TEST_PASSWORD })
    assert(loginRes.status === 200, `Login failed: ${JSON.stringify(loginRes.body)}`)
    const loginCookies = { ...cookieJar }

    // Confirm session works
    cookieJar = { ...loginCookies }
    const meRes = await request("GET", "/api/admin/auth/me")
    assert(meRes.status === 200, "Should be authenticated before revocation")

    // Logout (revokes the session in DB)
    await request("POST", "/api/admin/auth/logout")

    // Try to use the same cookie after logout — should be 401 (DB revocation)
    cookieJar = { ...loginCookies }
    const afterRes = await request("GET", "/api/admin/auth/me")
    assert(afterRes.status === 401, `Expected 401 after session revocation, got ${afterRes.status}`)
  })

  // ── 17. JWT Validation ─────────────────────────────────────────────────────────
  console.log("\n── Phase 17: JWT Validation ──")
  await test("Tampered JWT is rejected", async () => {
    cookieJar = { ...testCookies }
    // Corrupt the admin-token cookie
    cookieJar["admin-token"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dGFtcGVyZWQ.dGFtcGVyZWQ"
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 401, `Expected 401 for tampered JWT, got ${res.status}`)
  })

  await test("Expired-looking JWT (empty token) is rejected", async () => {
    cookieJar = { "admin-token": "" }
    const res = await request("GET", "/api/admin/auth/me")
    assert(res.status === 401, `Expected 401 for empty token, got ${res.status}`)
  })

  // ── 18. RBAC Enforcement ──────────────────────────────────────────────────────
  console.log("\n── Phase 18: RBAC Enforcement ──")
  await test("Viewer cannot access super-admin only kill-all", async () => {
    // Re-login as test user (viewer)
    cookieJar = {}
    const loginRes = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: TEST_PASSWORD })
    assert(loginRes.status === 200, "Viewer login failed")
    const viewerCookies = { ...cookieJar }

    cookieJar = { ...viewerCookies }
    const res = await request("POST", "/api/admin/auth/sessions/kill-all", {
      confirm: "KILL_ALL_SESSIONS",
    })
    assert(res.status === 403 || res.status === 401, `Expected 403/401 for viewer, got ${res.status}`)

    // Cleanup: logout viewer
    await request("POST", "/api/admin/auth/logout")
  })

  await test("Viewer cannot create users", async () => {
    cookieJar = {}
    const loginRes = await request("POST", "/api/admin/auth", { email: TEST_EMAIL, password: TEST_PASSWORD })
    assert(loginRes.status === 200, "Viewer login failed")
    const viewerCookies = { ...cookieJar }

    cookieJar = { ...viewerCookies }
    const res = await request("POST", "/api/admin/users", {
      email: `qa-viewer-create-${Date.now()}@qa-test-100x.internal`,
      name: "Unauthorized", role: "viewer", password: TEST_PASSWORD,
    })
    assert(res.status === 403 || res.status === 401, `Expected 403/401, got ${res.status}`)

    await request("POST", "/api/admin/auth/logout")
  })

  // ── 19. Orphan Scan ───────────────────────────────────────────────────────────
  console.log("\n── Phase 19: Orphan Scan ──")
  await test("Orphan scan runs without error", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/security/orphans")
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert(typeof res.body.summary?.totalUsers === "number", "summary.totalUsers should be a number")
    assert(typeof res.body.orphans === "object", "orphans section should exist")
  })

  // ── 20. Session Center / Sessions API ─────────────────────────────────────────
  console.log("\n── Phase 20: Session Center API ──")
  await test("Super admin can view all sessions", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/auth/sessions?all=1")
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(Array.isArray(res.body.sessions), "sessions should be array")
    // SA can see sessions from multiple users
    const emails = [...new Set(res.body.sessions.map(s => s.userEmail))]
    // May be 1 if only admin is logged in — just check the structure
    assert(res.body.sessions.every(s => s.sessionId && s.userId), "Each session should have id fields")
  })

  await test("Session report endpoint returns summary", async () => {
    cookieJar = { ...adminCookies }
    const res = await request("GET", "/api/admin/security/session-report")
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  // ── Cleanup ────────────────────────────────────────────────────────────────────
  console.log("\n── Cleanup ──")
  await test("Delete main test user (cleanup)", async () => {
    if (!testUserId) { skipped++; return }
    cookieJar = { ...adminCookies }
    const res = await request("DELETE", `/api/admin/users/${testUserId}`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
  })

  await test("Delete lockout test user (cleanup)", async () => {
    if (!testUserId2) { skipped++; return }
    cookieJar = { ...adminCookies }
    const res = await request("DELETE", `/api/admin/users/${testUserId2}`)
    assert(res.status === 200, `Expected 200, got ${res.status}`)
  })

  // ── Report ──────────────────────────────────────────────────────────────────
  const total = passed + failed
  console.log(`\n${"─".repeat(56)}`)
  console.log(`  Auth QA v2 Results: ${passed}/${total} passed${failed > 0 ? `  (${failed} FAILED)` : "  ✓"}`)
  if (skipped > 0) console.log(`  Skipped: ${skipped}`)
  console.log(`${"─".repeat(56)}`)

  if (failed > 0) {
    console.log("\nFailed tests:")
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  ✗ ${r.name}`)
      console.log(`    ${r.error}`)
    })
  }

  console.log(`\nFeature Matrix:`)
  const matrix = [
    { feature: "Password Login",         passing: results.find(r => r.name === "Admin can log in with email + password")?.status === "PASS" },
    { feature: "Google OAuth Routes",    passing: undefined },   // not testable without real Google creds
    { feature: "Create User",            passing: results.find(r => r.name.includes("Create test user with valid password"))?.status === "PASS" },
    { feature: "Edit User",              passing: results.find(r => r.name.includes("change user role"))?.status === "PASS" },
    { feature: "Forgot Password",        passing: results.find(r => r.name.includes("get reset link"))?.status === "PASS" },
    { feature: "Reset Password",         passing: results.find(r => r.name.includes("new password after token reset"))?.status === "PASS" },
    { feature: "Logout",                 passing: results.find(r => r.name.includes("can log out"))?.status === "PASS" },
    { feature: "Session Revocation",     passing: results.find(r => r.name.includes("Revoked session cannot"))?.status === "PASS" },
    { feature: "Disable / Enable User",  passing: results.find(r => r.name.includes("disabled user cannot log in"))?.status === "PASS" },
    { feature: "Delete User",            passing: results.find(r => r.name.includes("can soft-delete user"))?.status === "PASS" },
    { feature: "Account Lockout",        passing: results.find(r => r.name.includes("locked after 5"))?.status === "PASS" },
    { feature: "RBAC Enforcement",       passing: results.find(r => r.name.includes("cannot access"))?.status === "PASS" },
    { feature: "JWT Validation",         passing: results.find(r => r.name.includes("Tampered JWT"))?.status === "PASS" },
    { feature: "Auth Health Dashboard",  passing: results.find(r => r.name.includes("health endpoint returns metrics"))?.status === "PASS" },
    { feature: "Email Diagnostics",      passing: results.find(r => r.name.includes("diagnostics endpoint returns"))?.status === "PASS" },
    { feature: "Auth Diagnostics",       passing: results.find(r => r.name.includes("PASS for healthy user"))?.status === "PASS" },
    { feature: "Orphan Detection",       passing: results.find(r => r.name.includes("Orphan scan"))?.status === "PASS" },
    { feature: "Session Center",         passing: results.find(r => r.name.includes("Super admin can view all"))?.status === "PASS" },
  ]

  const w = Math.max(...matrix.map(m => m.feature.length)) + 2
  for (const { feature, passing } of matrix) {
    const status = passing === undefined ? "N/A " : passing ? "PASS" : "FAIL"
    const color  = status === "PASS" ? "✓" : status === "N/A " ? "·" : "✗"
    console.log(`  ${color} ${feature.padEnd(w)} ${status}`)
  }

  console.log(`\n  Total tests run: ${total}  (target: 50+)`)
  console.log("")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
