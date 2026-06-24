import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import {
  buildAudienceRecords,
  generatePlainCSV,
  generateGoogleCSV,
  generateFullCSV,
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
    const audienceType = audienceId.replace(/^cm_/, "") as AudienceType

    if (!AUDIENCE_META[audienceType]) {
      return NextResponse.json({ error: "Unknown audience. Valid: cm_dealers, cm_crm_leads, cm_government_buyers, cm_existing_customers" }, { status: 400 })
    }

    const rawFormat    = req.nextUrl.searchParams.get("format") ?? "google"
    const format       = (["full", "plain", "hashed", "google"].includes(rawFormat) ? rawFormat : "google") as
      "full" | "plain" | "hashed" | "google"

    const db             = (await clientPromise).db()
    const { records }    = await buildAudienceRecords(audienceType, db)

    let csv: string
    let filenamePrefix: string

    switch (format) {
      case "full":
        csv = generateFullCSV(records)
        filenamePrefix = "customer_match_full"
        break
      case "hashed":
        csv = generateGoogleCSV(records)
        filenamePrefix = "customer_match_hashed"
        break
      case "plain":
      case "google":
      default:
        csv = generatePlainCSV(records)
        filenamePrefix = "customer_match_google"
        break
    }

    const matchable = records.filter(r => r.email || r.phone).length
    const date      = new Date().toISOString().split("T")[0]
    const slug      = audienceType.replace(/_/g, "-")
    const filename  = `${filenamePrefix}_${slug}_${date}.csv`

    await db.collection("growth_os_logs").insertOne({
      ts:               new Date().toISOString(),
      agent:            "customer-match-engine",
      action:           "csv_exported",
      audienceType,
      format,
      totalRecords:     records.length,
      matchableRecords: matchable,
      level:            "success",
      module:           "ads",
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
