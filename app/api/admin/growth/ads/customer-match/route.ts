/**
 * Customer Match Engine — list + build
 * GET  — list all 4 audience configs with cached quality scores
 * POST — build / rebuild an audience from its source collection(s)
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import {
  buildAudienceRecords,
  computeQualityScore,
  AUDIENCE_META,
  type AudienceType,
  type AudienceDoc,
} from "@/lib/growth-os/customer-match-engine"

export const dynamic = "force-dynamic"

const COLL = "customer_match_audiences"
const ALL_TYPES: AudienceType[] = ["government_buyers", "dealers", "existing_customers", "crm_leads"]

// ── GET — list audiences ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const db   = (await clientPromise).db()
    const docs = await db.collection(COLL).find({}).toArray()

    const audiences = ALL_TYPES.map(type => {
      const existing = docs.find(d => d.audienceType === type)
      if (existing) {
        const { _id, ...rest } = existing as Record<string, unknown>
        void _id
        return rest as unknown as AudienceDoc
      }
      return {
        audienceId:    `cm_${type}`,
        audienceType:  type,
        displayName:   AUDIENCE_META[type].displayName,
        qualityScore:  null,
        uploadStatus:  "not_uploaded" as const,
        lastBuiltAt:   null,
      } satisfies AudienceDoc
    })

    return NextResponse.json({ audiences })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST — build / rebuild audience ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { audienceType } = await req.json() as { audienceType: AudienceType }

    if (!audienceType || !AUDIENCE_META[audienceType]) {
      return NextResponse.json({ error: "audienceType must be one of: " + ALL_TYPES.join(", ") }, { status: 400 })
    }

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()

    const records      = await buildAudienceRecords(audienceType, db)
    const qualityScore = computeQualityScore(records)
    const audienceId   = `cm_${audienceType}`

    await db.collection(COLL).updateOne(
      { audienceId },
      {
        $set: {
          audienceId,
          audienceType,
          displayName:  AUDIENCE_META[audienceType].displayName,
          qualityScore,
          lastBuiltAt:  now,
          updatedAt:    now,
        },
        $setOnInsert: {
          uploadStatus: "not_uploaded",
          createdAt:    now,
        },
      },
      { upsert: true }
    )

    await db.collection("growth_os_logs").insertOne({
      ts:     now,
      agent:  "customer-match-engine",
      action: "audience_built",
      audienceType,
      recordCount:         records.length,
      estimatedMatchRate:  qualityScore.estimatedMatchRate,
      level:  "success",
      module: "ads",
    })

    return NextResponse.json({
      ok:          true,
      audienceId,
      audienceType,
      recordCount: records.length,
      qualityScore,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
