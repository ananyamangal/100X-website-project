/**
 * PATCH /api/admin/growth/categories/[slug]  — update category (enable, keywords, name)
 * DELETE /api/admin/growth/categories/[slug] — remove custom category (built-ins blocked)
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { BUILT_IN_SLUGS } from "@/lib/category-catalog"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const db   = (await clientPromise).db()
  const body = await req.json()
  const { slug } = await params

  const allowed = ["enabled", "keywords", "name", "description", "icon",
                   "estimate", "packs", "status"]
  const update: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const result = await db.collection("gem_categories").updateOne(
    { slug },
    { $set: update }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (BUILT_IN_SLUGS.has(slug)) {
    return NextResponse.json(
      { error: "Built-in categories cannot be deleted — disable instead (PATCH { enabled: false })" },
      { status: 403 }
    )
  }

  const db = (await clientPromise).db()
  await db.collection("gem_categories").deleteOne({ slug })
  await db.collection("category_jobs").deleteMany({ categorySlug: slug })

  return NextResponse.json({ ok: true })
}
