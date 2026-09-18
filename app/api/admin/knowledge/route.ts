import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import clientPromise from "@/lib/mongodb"
import { KNOWLEDGE_CACHE_TAG } from "@/lib/knowledgeQuery"
import type { KnowledgeArticle } from "@/lib/knowledge/types"

const COLLECTION = "knowledge_articles"

// GET - every article including unpublished ones, in hub order
export async function GET() {
  try {
    const client = await clientPromise
    const docs = await client.db().collection(COLLECTION).find({}).sort({ order: 1 }).toArray()
    const articles = docs.map((d) => {
      const { _id, ...rest } = d as unknown as Record<string, unknown>
      void _id
      return rest
    })
    return NextResponse.json(articles)
  } catch (error) {
    console.error("Error fetching knowledge articles:", error)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

// PUT - upsert one article by slug
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<KnowledgeArticle>
    if (!body?.slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 })
    }

    // _id is immutable — a round-tripped document would otherwise fail the update.
    const { _id, createdAt, ...rest } = body as Record<string, unknown>
    void _id
    void createdAt

    const client = await clientPromise
    await client
      .db()
      .collection(COLLECTION)
      .updateOne(
        { slug: body.slug },
        { $set: { ...rest, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      )

    revalidateTag(KNOWLEDGE_CACHE_TAG)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving knowledge article:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
