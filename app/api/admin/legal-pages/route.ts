import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const PAGES = ["privacy-policy", "terms-and-conditions", "return-policy", "refund-policy", "shipping-policy", "warranty-policy", "disclaimer", "cookie-policy"] as const
type PageKey = typeof PAGES[number]

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db.collection("legal_pages").find({ key: { $in: [...PAGES] } }).toArray()
    const result: Record<string, { content: string; publishedAt?: string }> = {}
    for (const doc of docs) {
      result[doc.key as string] = { content: doc.content || "", publishedAt: doc.publishedAt || "" }
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error("legal-pages GET error:", err)
    return NextResponse.json({})
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, content } = body
    if (!PAGES.includes(key as PageKey) || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    const client = await clientPromise
    const db = client.db()
    await db.collection("legal_pages").updateOne(
      { key },
      { $set: { key, content, publishedAt: new Date().toISOString(), updatedAt: new Date() } },
      { upsert: true }
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("legal-pages PUT error:", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
