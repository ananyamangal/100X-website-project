/**
 * Super Admin Recovery Script
 * Audits rbac_users, unlocks locked accounts, generates reset token if needed,
 * creates emergency super_admin if none exists.
 * Run: node scripts/super-admin-recovery.js
 */

const { MongoClient, ObjectId } = require("mongodb")
const { pbkdf2Sync, randomBytes, createHash } = require("crypto")

const MONGODB_URI = "mongodb+srv://ananyamangal20:CtzH9HMgZy3COE6k@100x-website-project.sq3cjz5.mongodb.net/100xDB?retryWrites=true&w=majority&appName=100x-website-project"
const DB_NAME     = "100xDB"
const APP_URL     = "https://www.100xcircle.com"

const TARGET_EMAILS = [
  "sulabhmangal@gmail.com",
  "100xcirclefogging2025@gmail.com",
]

// ── Hash helpers (must match lib/rbac/password.ts exactly) ──────────────────
function hashPassword(plaintext) {
  const salt = randomBytes(16).toString("hex")
  const hash = pbkdf2Sync(plaintext, salt, 100_000, 64, "sha512").toString("hex")
  return `pbkdf2:${salt}:${hash}`
}

function sha256hex(s) {
  return createHash("sha256").update(s).digest("hex")
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SUPER ADMIN RECOVERY AUDIT")
  console.log("═══════════════════════════════════════════════════\n")

  // ── 1. Query all users ────────────────────────────────────────────────────
  const users = await db.collection("rbac_users").find({}).toArray()

  if (users.length === 0) {
    console.log("⚠  rbac_users collection is EMPTY — no users exist at all.\n")
  }

  // ── 2. Print table ────────────────────────────────────────────────────────
  const now = new Date()
  console.log("┌─────────────────┬──────────────────────────────────────────┬────────┬──────────────────────────────────┬──────────────┐")
  console.log("│ Role            │ Email                                    │ Active │ Locked Until                     │ Has PwdHash  │")
  console.log("├─────────────────┼──────────────────────────────────────────┼────────┼──────────────────────────────────┼──────────────┤")
  for (const u of users) {
    const role       = (u.role ?? "(none)").padEnd(15)
    const email      = (u.email ?? "(none)").padEnd(40)
    const active     = u.isActive ? "YES    " : "NO     "
    const locked     = u.lockUntil && new Date(u.lockUntil) > now
      ? new Date(u.lockUntil).toISOString().slice(0, 19) + "Z"
      : "(not locked)                    "
    const hasPwdHash = (u.passwordHash && u.passwordHash.startsWith("pbkdf2:")) ? "YES           " : "NO ← PROBLEM  "
    console.log(`│ ${role} │ ${email} │ ${active} │ ${locked} │ ${hasPwdHash} │`)
  }
  console.log("└─────────────────┴──────────────────────────────────────────┴────────┴──────────────────────────────────┴──────────────┘")
  console.log(`\nTotal users: ${users.length}\n`)

  // ── 3. Find target accounts ───────────────────────────────────────────────
  console.log("── Target email lookup ──────────────────────────────────────────")
  for (const email of TARGET_EMAILS) {
    const u = users.find(x => (x.email ?? "").toLowerCase() === email.toLowerCase())
    if (u) {
      console.log(`  FOUND   ${email} — role: ${u.role}, isActive: ${u.isActive}, failedLoginCount: ${u.failedLoginCount ?? 0}`)
    } else {
      console.log(`  MISSING ${email}`)
    }
  }

  const superAdmins = users.filter(u => u.role === "super_admin")
  console.log(`\n  super_admin accounts: ${superAdmins.length}`)
  for (const u of superAdmins) {
    console.log(`    → ${u.email} (isActive: ${u.isActive})`)
  }
  console.log("")

  // ── 4. Recovery actions ───────────────────────────────────────────────────
  console.log("── Recovery Actions ─────────────────────────────────────────────")

  let actionsTaken = 0

  // Unlock any locked super_admin accounts
  for (const u of superAdmins) {
    const isLocked = (u.failedLoginCount >= 5) || (u.lockUntil && new Date(u.lockUntil) > now)
    if (isLocked) {
      await db.collection("rbac_users").updateOne(
        { _id: u._id },
        { $set: { failedLoginCount: 0, lockUntil: null, lockedAt: null } }
      )
      console.log(`  ✓ UNLOCKED: ${u.email} — cleared failedLoginCount, lockUntil, lockedAt`)
      actionsTaken++
    }
  }

  // Also unlock any locked target-email accounts
  for (const email of TARGET_EMAILS) {
    const u = users.find(x => (x.email ?? "").toLowerCase() === email.toLowerCase())
    if (u && u.role !== "super_admin") {
      const isLocked = (u.failedLoginCount >= 5) || (u.lockUntil && new Date(u.lockUntil) > now)
      if (isLocked) {
        await db.collection("rbac_users").updateOne(
          { _id: u._id },
          { $set: { failedLoginCount: 0, lockUntil: null, lockedAt: null } }
        )
        console.log(`  ✓ UNLOCKED: ${u.email} (role: ${u.role})`)
        actionsTaken++
      }
    }
  }

  // Check if any super_admin has a bad/missing password hash
  let needsReset = null
  for (const u of superAdmins) {
    if (!u.passwordHash || !u.passwordHash.startsWith("pbkdf2:")) {
      needsReset = u
      break
    }
  }

  // Determine if we have a usable super_admin
  const usableSuperAdmin = superAdmins.find(
    u => u.isActive && u.passwordHash && u.passwordHash.startsWith("pbkdf2:")
  )

  let recoveryEmail = null

  if (!usableSuperAdmin) {
    // Decide which email to use
    const existingTarget = TARGET_EMAILS.map(e =>
      users.find(u => (u.email ?? "").toLowerCase() === e.toLowerCase())
    ).find(Boolean)

    recoveryEmail = existingTarget
      ? existingTarget.email
      : "sulabhmangal@gmail.com"

    const existingUser = users.find(u =>
      (u.email ?? "").toLowerCase() === recoveryEmail.toLowerCase()
    )

    if (existingUser && existingUser.role !== "super_admin") {
      // Promote existing user to super_admin
      await db.collection("rbac_users").updateOne(
        { _id: existingUser._id },
        { $set: {
            role:             "super_admin",
            isActive:         true,
            failedLoginCount: 0,
            lockUntil:        null,
            lockedAt:         null,
          }
        }
      )
      console.log(`  ✓ PROMOTED: ${recoveryEmail} → super_admin + activated`)
      actionsTaken++
      // Refresh reference
      superAdmins.push({ ...existingUser, role: "super_admin", isActive: true })
    } else if (!existingUser) {
      // Create emergency super_admin from scratch
      const tempPw   = "TempRecovery@" + randomBytes(4).toString("hex").toUpperCase()
      const pwHash   = hashPassword(tempPw)
      const newUser  = {
        email:            recoveryEmail,
        name:             "Super Admin",
        role:             "super_admin",
        passwordHash:     pwHash,
        isActive:         true,
        failedLoginCount: 0,
        lockUntil:        null,
        lockedAt:         null,
        createdAt:        new Date(),
        loginHistory:     [],
      }
      const ins = await db.collection("rbac_users").insertOne(newUser)
      console.log(`  ✓ CREATED emergency super_admin: ${recoveryEmail} (id: ${ins.insertedId})`)
      console.log(`    Temporary password: ${tempPw}`)
      console.log("    CHANGE THIS PASSWORD immediately after login!")
      actionsTaken++
    }
  } else {
    recoveryEmail = usableSuperAdmin.email
  }

  if (actionsTaken === 0 && usableSuperAdmin) {
    console.log("  ✓ No unlock/creation needed — super_admin is already active and unlocked")
  }

  // ── 5. Generate a password reset token for the super_admin ───────────────
  console.log("\n── Password Reset Token ─────────────────────────────────────────")

  const targetEmail = recoveryEmail ?? superAdmins[0]?.email
  if (!targetEmail) {
    console.log("  ✗ Cannot generate reset token — no target email identified")
    await client.close()
    return
  }

  // Ensure indexes
  try {
    await db.collection("password_reset_tokens").createIndex(
      { expiresAt: 1 }, { expireAfterSeconds: 0, background: true }
    )
    await db.collection("password_reset_tokens").createIndex(
      { tokenHash: 1 }, { unique: true, background: true }
    )
  } catch { /* idempotent */ }

  // Invalidate any existing unexpired tokens for this email
  await db.collection("password_reset_tokens").deleteMany({
    email:     targetEmail.toLowerCase(),
    usedAt:    null,
    expiresAt: { $gt: new Date() },
  })

  const rawToken = randomBytes(32).toString("hex")
  const now2     = new Date()
  await db.collection("password_reset_tokens").insertOne({
    email:     targetEmail.toLowerCase(),
    tokenHash: sha256hex(rawToken),
    createdAt: now2,
    expiresAt: new Date(now2.getTime() + 60 * 60 * 1000),  // 60 min
    usedAt:    null,
    ip:        "recovery-script",
    userAgent: "node-recovery",
  })

  const resetUrl = `${APP_URL}/admin/reset-password?token=${rawToken}`
  console.log(`  Email:     ${targetEmail}`)
  console.log(`  Token:     ${rawToken.slice(0, 8)}...${rawToken.slice(-8)}`)
  console.log(`  Expires:   60 minutes from now`)
  console.log(`\n  ┌─────────────────────────────────────────────────────────────┐`)
  console.log(`  │  RESET URL (open in browser):                               │`)
  console.log(`  │                                                              │`)
  console.log(`  │  ${resetUrl.slice(0, 60)}  │`)
  if (resetUrl.length > 60) {
    console.log(`  │  ${resetUrl.slice(60)}`)
  }
  console.log(`  └─────────────────────────────────────────────────────────────┘`)
  console.log(`\n  Full URL:`)
  console.log(`  ${resetUrl}\n`)

  // ── 6. Final summary ──────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════")
  console.log("  RECOVERY SUMMARY")
  console.log("═══════════════════════════════════════════════════")

  const finalUsers = await db.collection("rbac_users").find({}).toArray()
  const finalSuper = finalUsers.filter(u => u.role === "super_admin")

  console.log(`\nActions taken: ${actionsTaken}`)
  console.log(`super_admin accounts now: ${finalSuper.length}`)
  for (const u of finalSuper) {
    const hasHash  = u.passwordHash?.startsWith("pbkdf2:") ? "has password hash" : "NO HASH"
    const lockStr  = (u.lockUntil && new Date(u.lockUntil) > now) ? "LOCKED" : "unlocked"
    console.log(`  → ${u.email}  isActive:${u.isActive}  ${lockStr}  ${hasHash}`)
  }

  console.log("\nNext steps:")
  console.log("  1. Open the reset URL above in your browser")
  console.log("  2. Set a new password (10+ chars, upper, lower, number, special)")
  console.log("  3. Log in at https://www.100xcircle.com/admin/login")
  console.log("  4. Verify your role shows 'Super Admin' in Security Settings\n")

  await client.close()
}

run().catch(err => {
  console.error("\n✗ Script failed:", err.message)
  process.exit(1)
})
