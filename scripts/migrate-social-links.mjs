#!/usr/bin/env node
/**
 * One-off backfill for the `site_settings.social` document (Task 1 fix).
 *
 * Rewrites every platform's record to the canonical schema
 * { url, showInHeader, showInFooter, showOnContactPage, showOnProductPages },
 * translating the legacy short field names (header/footer/contact/products)
 * used by the old admin form, and filling in any missing platform with its
 * previous hardcoded default from lib/seo/site-config.ts so the public site
 * renders identically before/after this migration runs.
 *
 * Additive / non-destructive: only touches the `social` field, leaves every
 * other site_settings field untouched, never removes a platform's data, and
 * keeps the legacy flag names in place next to the canonical ones.
 *
 * Usage: node scripts/migrate-social-links.mjs [--dry-run]
 */
import { MongoClient } from "mongodb"
import { readFileSync } from "node:fs"

const dryRun = process.argv.includes("--dry-run")

function loadEnvUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI
  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(file, "utf8")
      const m = content.match(/^MONGODB_URI=(.*)$/m)
      if (m) return m[1].trim().replace(/^["']|["']$/g, "")
    } catch {}
  }
  throw new Error("MONGODB_URI not found in env or .env.local/.env")
}

const SOCIAL_PLATFORM_KEYS = [
  "youtube", "facebook", "instagram", "linkedin", "twitter", "whatsapp", "telegram", "googleBiz",
]

const DEFAULT_SOCIAL_LINKS = {
  youtube: { url: "https://www.youtube.com/@100Xcircle", showInHeader: true, showInFooter: true, showOnContactPage: true, showOnProductPages: false },
  facebook: { url: "https://www.facebook.com/100xcircle", showInHeader: false, showInFooter: true, showOnContactPage: true, showOnProductPages: false },
  instagram: { url: "https://www.instagram.com/100xcircle", showInHeader: true, showInFooter: true, showOnContactPage: false, showOnProductPages: false },
  linkedin: { url: "https://www.linkedin.com/company/100xcircle", showInHeader: false, showInFooter: true, showOnContactPage: false, showOnProductPages: false },
  twitter: { url: "https://x.com/100xcircle", showInHeader: false, showInFooter: true, showOnContactPage: false, showOnProductPages: false },
  whatsapp: { url: "https://wa.me/917827229116", showInHeader: false, showInFooter: true, showOnContactPage: true, showOnProductPages: true },
  telegram: { url: "", showInHeader: false, showInFooter: false, showOnContactPage: false, showOnProductPages: false },
  googleBiz: { url: "", showInHeader: false, showInFooter: false, showOnContactPage: true, showOnProductPages: false },
}

function flag(raw, canonicalKey, legacyKey, fallback) {
  if (typeof raw[canonicalKey] === "boolean") return raw[canonicalKey]
  if (typeof raw[legacyKey] === "boolean") return raw[legacyKey]
  return fallback
}

function normalizePlatform(raw, fallback) {
  if (!raw || typeof raw !== "object") return fallback
  return {
    url: typeof raw.url === "string" ? raw.url.trim() : fallback.url,
    showInHeader: flag(raw, "showInHeader", "header", fallback.showInHeader),
    showInFooter: flag(raw, "showInFooter", "footer", fallback.showInFooter),
    showOnContactPage: flag(raw, "showOnContactPage", "contact", fallback.showOnContactPage),
    showOnProductPages: flag(raw, "showOnProductPages", "products", fallback.showOnProductPages),
  }
}

async function main() {
  const uri = loadEnvUri()
  const client = new MongoClient(uri)
  await client.connect()
  try {
    const db = client.db()
    const col = db.collection("site_settings")
    const doc = await col.findOne({ key: "main" })

    if (!doc) {
      console.log("[migrate-social-links] no site_settings doc found — nothing to migrate (public site will use defaults).")
      return
    }

    const rawSocial = doc.social && typeof doc.social === "object" ? doc.social : {}
    const normalized = {}
    for (const key of SOCIAL_PLATFORM_KEYS) {
      // Additive: the canonical fields are written alongside whatever is
      // already stored, so the legacy header/footer/contact/products flags
      // survive and a rollback to the old admin form still reads its data.
      const existing = rawSocial[key] && typeof rawSocial[key] === "object" ? rawSocial[key] : {}
      normalized[key] = { ...existing, ...normalizePlatform(rawSocial[key], DEFAULT_SOCIAL_LINKS[key]) }
    }

    console.log("[migrate-social-links] before:", JSON.stringify(rawSocial, null, 2))
    console.log("[migrate-social-links] after: ", JSON.stringify(normalized, null, 2))

    if (dryRun) {
      console.log("[migrate-social-links] --dry-run: no write performed")
      return
    }

    await col.updateOne({ key: "main" }, { $set: { social: normalized, updatedAt: new Date().toISOString() } })
    console.log("[migrate-social-links] done — site_settings.social backfilled to canonical schema.")
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
