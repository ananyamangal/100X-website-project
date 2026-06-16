import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { generateExecutionPack } from "@/lib/growth-os/agents/execution-pack-generator"
import type { DirectorRec } from "@/lib/growth-os/director-types"

export const dynamic = "force-dynamic"

const VALID_ACTIONS = [
  "approved", "rejected", "deferred", "applied",  // original (preserved)
  "in_progress", "completed", "won", "lost",       // v1.1 lifecycle
  "update_meta",                                    // v1.1 owner + target date update
]

/**
 * POST /api/admin/growth/director/approvals/[id]
 * Actions: approved | rejected | deferred | in_progress | completed | won | lost | update_meta
 * Body:
 *   action: string
 *   reason?: string (for rejected)
 *   realized_impact?: number (for won/lost)
 *   outcome_notes?: string (for completed/won/lost)
 *   owner?: string (for update_meta or in_progress)
 *   target_completion_date?: string (for update_meta or in_progress)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = params
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid recommendation ID" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(" | ")}` }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  // Build the update object
  const update: Record<string, unknown> = { status: action === "update_meta" ? undefined : action }
  delete update.status // will add conditionally below

  if (action !== "update_meta") update.status = action
  update.reviewed_at = now

  // Action-specific fields
  if (action === "rejected" && body.reason) update.rejection_reason = body.reason
  if (action === "applied" || action === "in_progress") {
    update.in_progress_at = now
    update.applied_at = now // backward compat
    if (body.owner) update.owner = body.owner
    if (body.target_completion_date) update.target_completion_date = body.target_completion_date
  }
  if (action === "completed") {
    update.completed_at = now
    if (body.outcome_notes) update.outcome_notes = body.outcome_notes
  }
  if (action === "won") {
    update.won_at = now
    update.completed_at = update.completed_at || now
    if (body.realized_impact !== undefined) update.realized_impact = Number(body.realized_impact)
    if (body.outcome_notes) update.outcome_notes = body.outcome_notes
  }
  if (action === "lost") {
    update.lost_at = now
    update.completed_at = update.completed_at || now
    if (body.realized_impact !== undefined) update.realized_impact = Number(body.realized_impact) || 0
    if (body.outcome_notes) update.outcome_notes = body.outcome_notes
  }
  if (action === "update_meta") {
    if (body.owner !== undefined) update.owner = body.owner
    if (body.target_completion_date !== undefined) update.target_completion_date = body.target_completion_date
  }

  const result = await db.collection("director_recommendations").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
  }

  // Write to outcomes collection for learning loop
  if (["approved", "rejected", "deferred", "in_progress", "completed", "won", "lost"].includes(action)) {
    const rec = await db.collection("director_recommendations").findOne({ _id: new ObjectId(id) }) as DirectorRec | null
    if (rec) {
      await db.collection("director_outcomes").insertOne({
        rec_id: id,
        run_date: rec.run_date,
        rec_type: rec.type,
        title: rec.title,
        decision: action,
        decided_at: now,
        expected_revenue: rec.expected_revenue_impact || 0,
        actual_revenue: action === "won" ? (Number(body.realized_impact) || null) : null,
        outcome_notes: body.outcome_notes || null,
        closed_at: ["won", "lost", "rejected"].includes(action) ? now : null,
        created_at: now,
      })

      // On approval: auto-create downstream CRM / workflow records + generate execution pack
      if (action === "approved") {
        // ── Auto-record creation (synchronous — must exist before response returns) ──
        try {
          const recId   = id
          const recType = rec.type

          // Guard: skip if a downstream record already exists for this rec
          const existingDealer = await db.collection("crm_dealers").findOne({ source_recommendation_id: recId })
          const existingOpp    = await db.collection("crm_opportunities").findOne({ source_recommendation_id: recId })
          const existingSeo    = await db.collection("seo_workflow_items").findOne({ source_recommendation_id: recId })
          const existingAds    = await db.collection("ads_workflow_items").findOne({ source_recommendation_id: recId })

          const DEALER_TYPES  = ["dealer_recruit"]
          const OPP_DEALER_TYPES = [] as string[]  // dealer recs → dealer CRM, not opp CRM
          const OPP_TYPES     = ["oem_displacement", "procurement_target"]
          const SEO_TYPES     = ["content_create", "landing_page_create"]
          const ADS_TYPES     = [
            "search_campaign", "remarketing_campaign", "youtube_campaign",
            "performance_max_campaign", "customer_match_campaign",
            "competitor_conquest_campaign", "creative_refresh",
            "budget_reallocate", "negative_keyword", "customer_match",
          ]

          if (DEALER_TYPES.includes(recType) && !existingDealer) {
            await db.collection("crm_dealers").insertOne({
              name:                    rec.title,
              company:                 (rec.payload?.state as string) ? `Target: ${rec.payload.state}` : "",
              state:                   (rec.payload?.state as string) ?? "",
              stage:                   "lead",
              gem_status:              "unknown",
              oem_status:              "unknown",
              expected_revenue:        rec.expected_revenue_impact ?? 0,
              notes:                   rec.why_now ?? "",
              source_recommendation_id: recId,
              source_type:             "director_auto",
              created_at:              now,
              updated_at:              now,
            })
          }

          if (OPP_TYPES.includes(recType) && !existingOpp) {
            const oppType = recType === "oem_displacement" ? "oem_displacement"
                          : recType === "procurement_target" ? "procurement"
                          : "other"
            await db.collection("crm_opportunities").insertOne({
              name:                    rec.title,
              organization:            (rec.payload?.organization_name as string) ?? "",
              state:                   (rec.payload?.organization_state as string) ?? "",
              opportunity_type:        oppType,
              stage:                   "identified",
              value:                   rec.expected_revenue_impact ?? 0,
              probability:             50,
              actual_revenue:          0,
              owner:                   "",
              next_action:             rec.expected_action ?? "",
              notes:                   rec.why_now ?? "",
              source_recommendation_id: recId,
              source_type:             "director_auto",
              created_at:              now,
              updated_at:              now,
            })
          }

          if (SEO_TYPES.includes(recType) && !existingSeo) {
            await db.collection("seo_workflow_items").insertOne({
              title:                   rec.title,
              target_keyword:          (rec.payload?.query as string) ?? (rec.payload?.keyword as string) ?? "",
              stage:                   "identified",       // first valid stage in SEO workflow
              target_url:              "",
              content_type:            recType === "landing_page_create" ? "landing_page" : "blog",
              draft_content:           "",
              publish_url:             "",
              owner:                   "",
              notes:                   rec.why_now ?? "",
              source_recommendation_id: recId,
              source_opportunity_id:   recId,             // SEO UI reads this field for attribution
              created_at:              now,
              updated_at:              now,
              published_at:            null,
            })
          }

          if (ADS_TYPES.includes(recType) && !existingAds) {
            await db.collection("ads_workflow_items").insertOne({
              name:                    rec.title,          // Ads UI uses 'name' not 'title'
              campaign_type:           recType,
              stage:                   "recommendation",   // first valid stage; Ads UI starts here
              brief:                   rec.expected_action ?? "",
              budget:                  (rec.payload?.budget_recommendation_inr as number) ?? 0,
              notes:                   rec.why_now ?? "",
              owner:                   "",
              actual_spend:            0,
              actual_clicks:           0,
              actual_conversions:      0,
              source_recommendation_id: recId,
              created_at:              now,
              updated_at:              now,
              deployed_at:             null,
            })
          }
        } catch (err) {
          // Auto-creation failure is non-fatal — log but don't block the approval response
          console.error("Auto-record creation failed:", err)
        }

        // ── Execution pack generation (async fire-and-forget) ──
        generateExecutionPack(rec, db)
          .then(async (pack) => {
            if (!pack) return
            const packResult = await db.collection("director_execution_packs").insertOne({
              rec_id: id,
              rec_type: rec.type,
              rec_title: rec.title,
              generated_at: new Date().toISOString(),
              pack,
            })
            const packId = packResult.insertedId.toString()
            await db.collection("director_recommendations").updateOne(
              { _id: new ObjectId(id) },
              { $set: { execution_pack_id: packId } }
            )
          })
          .catch((err) => {
            console.error("Execution pack generation failed:", err)
          })
      }
    }
  }

  return NextResponse.json({ ok: true, id, action })
}
