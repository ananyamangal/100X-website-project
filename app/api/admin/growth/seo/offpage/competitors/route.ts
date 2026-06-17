import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db   = (await clientPromise).db()
  const coll = db.collection("seo_competitors")

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50)

  const items = await coll.find({}).sort({ rank: 1, "scores.total": -1 }).limit(limit).toArray()

  return NextResponse.json(items.map(c => ({ ...c, _id: String(c._id) })))
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { _id, ai_mentions, website, notes } = body

  if (!_id) return NextResponse.json({ error: "Missing _id" }, { status: 400 })

  const db   = (await clientPromise).db()
  const coll = db.collection("seo_competitors")
  const now  = new Date().toISOString()

  const updates: Record<string, unknown> = { last_updated: now }
  if (ai_mentions) {
    const count = Object.values(ai_mentions).filter(Boolean).length
    updates["ai_mentions.chatgpt"]        = ai_mentions.chatgpt    ?? false
    updates["ai_mentions.gemini"]         = ai_mentions.gemini     ?? false
    updates["ai_mentions.claude"]         = ai_mentions.claude     ?? false
    updates["ai_mentions.perplexity"]     = ai_mentions.perplexity ?? false
    updates["ai_mentions.mention_count"]  = count
    updates["ai_mentions.last_checked"]   = now
  }
  if (website !== undefined) updates.website = website
  if (notes   !== undefined) updates.notes   = notes

  await coll.updateOne({ _id: new ObjectId(String(_id)) }, { $set: updates })

  return NextResponse.json({ ok: true })
}
