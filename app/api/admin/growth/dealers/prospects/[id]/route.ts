/**
 * Dealer Prospect — single record ops
 * PATCH  /api/admin/growth/dealers/prospects/:id  — enrich/update
 * DELETE /api/admin/growth/dealers/prospects/:id  — reject
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
const COLL = "dealer_prospects"

function normalizePhone(raw: string): string {
  if (!raw) return ""
  const digits = String(raw).replace(/\D/g, "")
  if (digits.length === 10) return digits
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2)
  if (digits.startsWith("0")  && digits.length === 11) return digits.slice(1)
  return digits.length >= 7 ? digits : ""
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const body = await req.json() as Record<string, string | boolean | number>
    const db   = (await clientPromise).db()
    const now  = new Date().toISOString()

    const email  = body.email  ? String(body.email).toLowerCase().trim()          : undefined
    const mobile = body.mobile ? normalizePhone(String(body.mobile))              : undefined
    const gst    = body.gst    ? String(body.gst).toUpperCase().trim()            : undefined

    const update: Record<string, unknown> = { updated_at: now }
    if (body.dealer_name    !== undefined) update.dealer_name    = body.dealer_name
    if (body.contact_person !== undefined) update.contact_person = body.contact_person
    if (body.city           !== undefined) update.city           = body.city
    if (body.state          !== undefined) update.state          = body.state
    if (body.notes          !== undefined) update.notes          = body.notes
    if (body.status         !== undefined) update.status         = body.status
    if (email  !== undefined) update.email  = email
    if (mobile !== undefined) update.mobile = mobile
    if (gst    !== undefined) update.gst    = gst

    // Recalculate score — pull current doc first to fill missing fields
    const current = await db.collection(COLL).findOne({ _id: new ObjectId(id) })
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const finalEmail  = (email  ?? current.email  ?? "")  as string
    const finalMobile = (mobile ?? current.mobile ?? "")  as string
    const finalGst    = (gst    ?? current.gst    ?? "")  as string
    const finalCity   = (update.city           ?? current.city           ?? "") as string
    const finalPerson = (update.contact_person ?? current.contact_person ?? "") as string

    update.dealer_score     = (finalEmail  ? 30 : 0) + (finalMobile ? 30 : 0) +
                              (finalGst    ? 20 : 0) + (finalCity   ? 10 : 0) +
                              (finalPerson ? 10 : 0)
    update.needs_enrichment = !finalEmail || !finalMobile

    if (finalEmail || finalMobile || finalGst) {
      const newKey = finalEmail
        ? `email:${finalEmail}`
        : finalMobile ? `phone:${finalMobile}`
        : `gst:${finalGst}`
      update.dedup_key = newKey
    }

    const result = await db.collection(COLL).updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )

    if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ ok: true, updated: result.modifiedCount > 0 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const db = (await clientPromise).db()

    const result = await db.collection(COLL).updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "rejected", updated_at: new Date().toISOString() } }
    )

    if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
