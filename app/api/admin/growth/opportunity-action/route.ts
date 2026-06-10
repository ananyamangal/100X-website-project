import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { COLL } from "@/lib/growth-os/opportunity-core"
import { ACTION_STATUSES, type ActionStatus, type Segment } from "@/lib/growth-os/opportunity-config"

const SEGMENTS: Segment[] = ["dealer", "machine_buyer"]

/**
 * Opportunity Action Center — per-recommendation workflow state.
 * Backs Call / WhatsApp / Email (links rendered client-side) plus
 * Assign owner, Add notes, Schedule follow-up, and outcome status.
 *
 * GET  ?segment=&entityKey=  → full action record (status, owner, notes[], followUpAt, history)
 * POST { segment, entityKey, action, value, by? }
 *      action ∈ status | owner | note | followup | logcontact
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const segment = searchParams.get("segment") as Segment
  const entityKey = searchParams.get("entityKey") || ""
  if (!SEGMENTS.includes(segment) || !entityKey) {
    return NextResponse.json({ error: "segment and entityKey required" }, { status: 400 })
  }
  const db = (await clientPromise).db()
  const rec = await db.collection(COLL.status).findOne({ segment, entityKey })
  const clean = rec ? (JSON.parse(JSON.stringify(rec)) as Record<string, unknown>) : null
  return NextResponse.json({
    segment, entityKey,
    status: (clean?.status as string) || "New",
    owner: (clean?.owner as string) || null,
    notes: (clean?.noteLog as unknown[]) || [],
    followUpAt: (clean?.followUpAt as string) || null,
    statusHistory: (clean?.statusHistory as unknown[]) || [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const segment = body.segment as Segment
  const entityKey = String(body.entityKey || "").trim()
  const action = String(body.action || "")
  const by = body.by ? String(body.by) : "admin"
  if (!SEGMENTS.includes(segment) || !entityKey) {
    return NextResponse.json({ error: "segment and entityKey required" }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const now = new Date().toISOString()
  const set: Record<string, unknown> = { updatedAt: now }
  const push: Record<string, unknown> = {}
  let logAction = ""

  switch (action) {
    case "status": {
      const status = body.value as ActionStatus
      if (!ACTION_STATUSES.includes(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 })
      set.status = status
      push.statusHistory = { status, at: now, by }
      logAction = `${entityKey} → ${status}`
      break
    }
    case "owner": {
      set.owner = body.value ? String(body.value) : null
      logAction = `${entityKey} owner → ${set.owner || "unassigned"}`
      break
    }
    case "note": {
      const text = String(body.value || "").trim()
      if (!text) return NextResponse.json({ error: "note text required" }, { status: 400 })
      push.noteLog = { text, at: now, by }
      logAction = `Note added to ${entityKey}`
      break
    }
    case "followup": {
      set.followUpAt = body.value ? String(body.value) : null
      logAction = `${entityKey} follow-up → ${set.followUpAt || "cleared"}`
      break
    }
    case "logcontact": {
      // record an outbound touch (call/whatsapp/email) on the timeline
      const channel = String(body.value || "contact")
      push.contactLog = { channel, at: now, by }
      logAction = `${channel} logged for ${entityKey}`
      break
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 })
  }

  const update: Record<string, unknown> = { $set: set, $setOnInsert: { segment, entityKey, createdAt: now } }
  if (Object.keys(push).length) update.$push = push

  await db.collection(COLL.status).updateOne({ segment, entityKey }, update, { upsert: true })

  // Reflect status onto the current week's recommendation rows immediately
  if (action === "status") {
    await db.collection(COLL.opportunities).updateMany({ segment, entityKey }, { $set: { actionStatus: body.value } })
  }

  await db.collection("growth_os_logs").insertOne({
    ts: now, agent: "Opportunity Action Center", action: logAction,
    reason: `via Action Center (${action})`, expectedImpact: "", actualImpact: "",
    level: action === "status" && (body.value === "Won") ? "success" : "info", module: "dealers",
  })

  return NextResponse.json({ ok: true })
}
