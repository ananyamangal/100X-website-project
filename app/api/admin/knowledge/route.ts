import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import clientPromise from "@/lib/mongodb"
import { KNOWLEDGE_CACHE_TAG } from "@/lib/knowledgeQuery"
import type { KnowledgeArticle } from "@/lib/knowledge/types"
import { requirePermission, isAuthResult } from "@/lib/rbac/server";

const COLLECTION = "knowledge_articles"

// GET - every article including unpublished ones, in hub order
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "knowledge.view");
  if (!isAuthResult(auth)) return auth;
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
  const auth = await requirePermission(request, "knowledge.edit");
  if (!isAuthResult(auth)) return auth;
  try {
    const body = (await request.json()) as Partial<KnowledgeArticle>
    if (!body?.slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 })
    }

    // _id is immutable — a round-tripped document would otherwise fail the update.
    // `sync` is the sync engine's bookkeeping, never taken from the client: it is set below.
    const { _id, createdAt, sync, ...rest } = body as Record<string, unknown>
    void _id
    void createdAt
    void sync

    const client = await clientPromise
    const col = client.db().collection(COLLECTION)
    const $set: Record<string, unknown> = { ...rest, updatedAt: new Date() }

    // An admin edit of a synced article locks it: the Knowledge Base sync then leaves it (and its
    // published / draft state) alone, so a reviewed draft is never flipped back by the next run.
    const existing = await col.findOne({ slug: body.slug }, { projection: { sync: 1 } })
    if (existing?.sync) $set["sync.locked"] = true

    await col.updateOne(
      { slug: body.slug },
      { $set, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    )

    revalidateTag(KNOWLEDGE_CACHE_TAG)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving knowledge article:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
