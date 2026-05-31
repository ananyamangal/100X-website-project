import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db.collection("homepage_sections").find({}).sort({ order: 1 }).toArray()
    return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })))
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const count = await db.collection("homepage_sections").countDocuments()
    const doc = {
      sectionKey: body.sectionKey || `section-${Date.now()}`,
      type: body.type || "custom",
      enabled: body.enabled ?? false,
      order: body.order ?? count,
      placement: body.placement || "after-products",
      headline: body.headline || "",
      subheadline: body.subheadline || "",
      bodyText: body.bodyText || "",
      ctaText: body.ctaText || "",
      ctaUrl: body.ctaUrl || "",
      imageUrl: body.imageUrl || "",
      imageAlt: body.imageAlt || "",
      imagePosition: body.imagePosition || "right",
      badge: body.badge || "",
      theme: body.theme || "light",
      stats: Array.isArray(body.stats) ? body.stats : [],
      showOnMobile: body.showOnMobile ?? true,
      showOnDesktop: body.showOnDesktop ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const result = await db.collection("homepage_sections").insertOne(doc)
    return NextResponse.json({ ...doc, _id: String(result.insertedId) })
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}
