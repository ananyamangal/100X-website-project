import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { seedOpportunities, discoverOpportunities, generateOutreachEmail, type BacklinkOpportunity, type OutreachStatus } from "@/lib/growth-os/agents/offpage-seo-director"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  const url    = new URL(req.url)
  const status = url.searchParams.get("status")
  const type   = url.searchParams.get("type")
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200)

  // Seed on first access
  await seedOpportunities()

  const db = (await clientPromise).db()
  const query: Record<string, unknown> = {}
  if (status) query["outreach.status"] = status
  if (type)   query.type = type

  const opps = await db.collection("offpage_opportunities")
    .find(query)
    .sort({ "scores.priorityScore": -1, createdAt: -1 })
    .limit(limit)
    .toArray()

  const stats = {
    total:       await db.collection("offpage_opportunities").countDocuments(),
    pending:     await db.collection("offpage_opportunities").countDocuments({ "outreach.status": "discovered" }),
    inProgress:  await db.collection("offpage_opportunities").countDocuments({ "outreach.status": { $in: ["contacted", "replied", "negotiating"] } }),
    acquired:    await db.collection("offpage_opportunities").countDocuments({ "outreach.status": "acquired" }),
    approved:    await db.collection("offpage_opportunities").countDocuments({ approvalStatus: "approved" }),
  }

  return NextResponse.json({ opportunities: JSON.parse(JSON.stringify(opps)), stats })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db   = (await clientPromise).db()

  if (body.action === "discover") {
    const { vertical = "b2b_india", count = 10 } = body
    try {
      const opps = await discoverOpportunities(vertical, count)
      return NextResponse.json({ ok: true, count: opps.length })
    } catch (err) {
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
    }
  }

  if (body.action === "generate_outreach") {
    const { id } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const opp = await db.collection("offpage_opportunities").findOne({ _id: new ObjectId(id) })
    if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 })

    try {
      const email = await generateOutreachEmail(opp as unknown as BacklinkOpportunity)
      await db.collection("offpage_opportunities").updateOne(
        { _id: new ObjectId(id) },
        { $set: {
          "outreach.emailSubject": email.subject,
          "outreach.emailBody":    email.body,
          "outreach.followUps":    email.followUps,
          updatedAt: new Date().toISOString(),
        }}
      )
      return NextResponse.json({ ok: true, email })
    } catch (err) {
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
    }
  }

  if (body.action === "update_status") {
    const { id, status, notes } = body
    if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 })

    const update: Record<string, unknown> = {
      "outreach.status": status as OutreachStatus,
      updatedAt: new Date().toISOString(),
    }
    if (notes) update["outreach.notes"] = notes
    if (status === "acquired") {
      update["result.acquiredAt"] = new Date().toISOString()
      if (body.liveUrl)    update["result.liveUrl"]    = body.liveUrl
      if (body.anchorText) update["result.anchorText"] = body.anchorText
      if (body.doFollow !== undefined) update["result.doFollow"] = body.doFollow
    }
    if ((status as OutreachStatus) === "contacted") {
      update["outreach.initialEmailAt"] = new Date().toISOString()
      update["outreach.lastContactAt"]  = new Date().toISOString()
    }
    if (["replied","negotiating"].includes(status)) {
      update["outreach.lastContactAt"]  = new Date().toISOString()
    }

    await db.collection("offpage_opportunities").updateOne({ _id: new ObjectId(id) }, { $set: update })
    return NextResponse.json({ ok: true })
  }

  if (body.action === "approve") {
    const { id } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await db.collection("offpage_opportunities").updateOne(
      { _id: new ObjectId(id) },
      { $set: { approvalStatus: "approved", updatedAt: new Date().toISOString() } }
    )
    return NextResponse.json({ ok: true })
  }

  if (body.action === "add") {
    const opp = body.opportunity as Partial<BacklinkOpportunity>
    if (!opp.domain || !opp.url) return NextResponse.json({ error: "domain and url required" }, { status: 400 })
    const doc = {
      ...opp,
      id:             `opp_${Date.now()}`,
      outreach:       { status: "discovered" as OutreachStatus, followUpCount: 0, ...opp.outreach },
      approvalStatus: "pending_review" as const,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    }
    await db.collection("offpage_opportunities").insertOne(doc)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "action required: discover | generate_outreach | update_status | approve | add" }, { status: 400 })
}
