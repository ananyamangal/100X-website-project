/**
 * GET  /api/admin/growth/director/contacts?org_name=...  — list contacts for org
 * POST /api/admin/growth/director/contacts               — create contact
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const orgName = searchParams.get("org_name") || ""

  const db = (await clientPromise).db()

  const query = orgName
    ? { org_name: { $regex: orgName, $options: "i" } }
    : {}

  const contacts = await db.collection("contact_intelligence")
    .find(query)
    .sort({ created_at: -1 })
    .toArray()

  return NextResponse.json({
    contacts: contacts.map(c => ({
      _id: c._id.toString(),
      org_name: c.org_name,
      contact_name: c.contact_name,
      designation: c.designation || "",
      department: c.department || "",
      email: c.email || "",
      phone: c.phone || "",
      source: c.source || "founder_added",
      confidence: c.confidence ?? 80,
      created_at: c.created_at,
    })),
    total: contacts.length,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const { org_name, contact_name, designation, department, email, phone, source, confidence } = body

  if (!org_name || !contact_name) {
    return NextResponse.json({ error: "org_name and contact_name are required" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const db = (await clientPromise).db()

  const result = await db.collection("contact_intelligence").insertOne({
    org_name: String(org_name),
    contact_name: String(contact_name),
    designation: String(designation || ""),
    department: String(department || ""),
    email: String(email || ""),
    phone: String(phone || ""),
    source: String(source || "founder_added"),
    confidence: Number(confidence ?? 80),
    created_at: now,
    updated_at: now,
  })

  const contact = await db.collection("contact_intelligence").findOne({ _id: result.insertedId })

  return NextResponse.json({
    contact: {
      _id: result.insertedId.toString(),
      org_name: contact?.org_name,
      contact_name: contact?.contact_name,
      designation: contact?.designation || "",
      department: contact?.department || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      source: contact?.source || "founder_added",
      confidence: contact?.confidence ?? 80,
      created_at: contact?.created_at,
    },
  })
}
