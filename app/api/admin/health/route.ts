import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { isEmailConfigured } from "@/lib/email"

export const dynamic = "force-dynamic"

export async function GET() {
  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    email: {
      configured: isEmailConfigured(),
      EMAIL_USER: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.slice(0, 6)}…` : "MISSING",
      EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD
        ? `${process.env.EMAIL_APP_PASSWORD.slice(0, 4)}… (${process.env.EMAIL_APP_PASSWORD.length} chars)`
        : "MISSING",
      EMAIL_TO: process.env.EMAIL_TO || "(falls back to EMAIL_USER)",
    },
    mongodb: { connected: false, collections: {} as Record<string, any> },
  }

  try {
    const client = await clientPromise
    const db = client.db()
    report.mongodb.connected = true
    report.mongodb.databaseName = db.databaseName

    // List every collection that exists in the database
    const allCollections = await db.listCollections().toArray()
    report.mongodb.allCollections = allCollections.map(c => c.name).sort()

    // Count documents in every collection that matters
    const COLLECTIONS = [
      // CMS
      "products", "categories", "reviews", "blogs", "pages",
      // Leads / submissions
      "rfq_popup_leads", "submissions", "gem_inquiries", "brochure_leads",
      // Growth OS
      "growth_os_logs", "growth_os_automations", "growth_os_opportunities", "growth_os_drafts",
      // Config / misc
      "rfq_popup_config", "ads_settings", "ads_searchterm_rows",
      "growth_os_sessions", "rbac_users", "rbac_sessions",
    ]

    const counts = await Promise.all(
      COLLECTIONS.map(name => db.collection(name).countDocuments().then(n => ({ name, count: n })))
    )
    report.mongodb.counts = Object.fromEntries(counts.map(({ name, count }) => [name, count]))

    // MONGODB_URI masked — show only the database name portion and host
    const uri = process.env.MONGODB_URI || ""
    const uriDbMatch = uri.match(/\/([^/?]+)\?/)
    report.mongodb.uriDbName = uriDbMatch?.[1] ?? "(not parseable)"
    report.mongodb.uriHost = uri.match(/@([^/]+)\//)?.[1]?.slice(0, 40) ?? "(not parseable)"

  } catch (err) {
    report.mongodb.error = String(err)
  }

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store, no-cache" },
  })
}
