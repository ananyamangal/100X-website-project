/**
 * Customer Match Export — Google-compliant CSV download
 * GET /api/admin/growth/ads/customer-match/{audienceId}/export
 *
 * Returns SHA-256 hashed CSV (Email, Phone, First Name, Last Name, Country, Zip)
 * per Google Customer Match data format requirements.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import {
  buildAudienceRecords,
  generateGoogleCSV,
  AUDIENCE_META,
  type AudienceType,
} from "@/lib/growth-os/customer-match-engine"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ audienceId: string }> },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { audienceId } = await params
    // audienceId format: "cm_dealers" → strip "cm_" prefix
    const audienceType = audienceId.replace(/^cm_/, "") as AudienceType

    if (!AUDIENCE_META[audienceType]) {
      return NextResponse.json({ error: "Unknown audience. Valid: cm_dealers, cm_crm_leads, cm_government_buyers, cm_existing_customers" }, { status: 400 })
    }

    const db      = (await clientPromise).db()
    const records = await buildAudienceRecords(audienceType, db)
    const csv     = generateGoogleCSV(records)

    const matchable = records.filter(r => r.email || r.phone).length
    const date      = new Date().toISOString().split("T")[0]
    const filename  = `100x-customer-match-${audienceType.replace(/_/g, "-")}-${date}.csv`

    // Log export event
    await db.collection("growth_os_logs").insertOne({
      ts:          new Date().toISOString(),
      agent:       "customer-match-engine",
      action:      "csv_exported",
      audienceType,
      totalRecords: records.length,
      matchableRecords: matchable,
      level:  "success",
      module: "ads",
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control":       "no-store",
        "X-Record-Count":      String(records.length),
        "X-Matchable-Count":   String(matchable),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
