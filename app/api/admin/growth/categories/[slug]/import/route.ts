/**
 * POST /api/admin/growth/categories/[slug]/import
 *
 * Runs a category import job:
 * 1. Finds gem_contracts records whose product_name matches category keywords
 * 2. Tags them with category_slugs: [slug] via $addToSet
 * 3. Updates category stats and job record
 *
 * Resumable: uses cursor on _id, processes BATCH_SIZE records per call.
 * Call repeatedly until job.status === "completed".
 *
 * Body: { resume?: boolean, force?: boolean }
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { CATEGORY_CATALOG } from "@/lib/category-catalog"

export const maxDuration = 55

const BATCH_SIZE = 2000

function buildKeywordRegex(keywords: string[]): RegExp {
  const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  return new RegExp(escaped.join("|"), "i")
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug }  = await params
  const body      = await req.json().catch(() => ({})) as { resume?: boolean; force?: boolean }
  const db        = (await clientPromise).db()

  // Find category definition
  const cat = CATEGORY_CATALOG.find(c => c.slug === slug)
    ?? await db.collection("gem_categories").findOne({ slug })
  if (!cat) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  // Fogging is already in fogging_contracts — no gem_contracts import needed
  if (slug === "fogging-machines") {
    return NextResponse.json({
      ok:      true,
      message: "Fogging Machines data lives in fogging_contracts (v1.4 — fully enriched). No re-import needed.",
      alreadyActive: true,
    })
  }

  // Check for existing running job
  const existingJob = await db.collection("category_jobs").findOne({
    categorySlug: slug,
    status: "running",
  })
  if (existingJob && !body.force) {
    return NextResponse.json({
      ok:     false,
      error:  "Import already running",
      job:    { ...existingJob, _id: existingJob._id.toString() },
    }, { status: 409 })
  }

  // Find or create job record
  let jobDoc = body.resume
    ? await db.collection("category_jobs").findOne({
        categorySlug: slug,
        status: { $in: ["paused", "failed"] },
      })
    : null

  const isResume = !!jobDoc

  if (!jobDoc) {
    const inserted = await db.collection("category_jobs").insertOne({
      categorySlug: slug,
      jobType:      "import",
      status:       "running",
      progress:     { scanned: 0, matched: 0, saved: 0, total: 0 },
      cursor:       null,
      startedAt:    new Date(),
      completedAt:  null,
      lastRunAt:    new Date(),
      errorLog:     [],
    })
    jobDoc = await db.collection("category_jobs").findOne({ _id: inserted.insertedId })
  } else {
    await db.collection("category_jobs").updateOne(
      { _id: jobDoc._id },
      { $set: { status: "running", lastRunAt: new Date() } }
    )
  }

  const jobId    = jobDoc!._id
  const keywords = (cat as { keywords?: string[] }).keywords ?? []
  if (!keywords.length) {
    await db.collection("category_jobs").updateOne(
      { _id: jobId },
      { $set: { status: "failed", errorLog: ["No keywords defined for this category"] } }
    )
    return NextResponse.json({ ok: false, error: "No keywords defined" }, { status: 400 })
  }

  const keywordRegex = buildKeywordRegex(keywords)
  const cursor       = (jobDoc as { cursor?: unknown })?.cursor ?? null

  // Count total matching (only on first run)
  let total = (jobDoc as { progress?: { total?: number } })?.progress?.total ?? 0
  if (!isResume || total === 0) {
    total = await db.collection("gem_contracts").countDocuments({
      product_name: { $regex: keywordRegex },
    })
    await db.collection("category_jobs").updateOne(
      { _id: jobId },
      { $set: { "progress.total": total } }
    )
  }

  // Build query — paginate via cursor on _id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    product_name: { $regex: keywordRegex },
  }
  if (cursor) query._id = { $gt: cursor }

  // Fetch a batch of matching records
  const batch = await db.collection("gem_contracts")
    .find(query)
    .sort({ _id: 1 })
    .limit(BATCH_SIZE)
    .project({ _id: 1 })
    .toArray()

  let saved  = 0
  let newCursor = cursor

  if (batch.length > 0) {
    const ids = batch.map(r => r._id)
    newCursor  = ids[ids.length - 1]

    const result = await db.collection("gem_contracts").updateMany(
      { _id: { $in: ids } },
      { $addToSet: { category_slugs: slug } }
    )
    saved = result.modifiedCount
  }

  const prevScanned = (jobDoc as { progress?: { scanned?: number; matched?: number; saved?: number } })?.progress?.scanned ?? 0
  const prevMatched = (jobDoc as { progress?: { matched?: number } })?.progress?.matched ?? 0
  const prevSaved   = (jobDoc as { progress?: { saved?: number } })?.progress?.saved ?? 0

  const scanned = prevScanned + batch.length
  const matched = prevMatched + batch.length
  const savedTotal = prevSaved + saved

  const isComplete = batch.length < BATCH_SIZE

  // Update job
  await db.collection("category_jobs").updateOne(
    { _id: jobId },
    {
      $set: {
        status:           isComplete ? "completed" : "paused",
        cursor:           isComplete ? null : newCursor,
        completedAt:      isComplete ? new Date() : null,
        lastRunAt:        new Date(),
        "progress.scanned": scanned,
        "progress.matched": matched,
        "progress.saved":   savedTotal,
      },
    }
  )

  // Update category status
  await db.collection("gem_categories").updateOne(
    { slug },
    {
      $set: {
        status:    savedTotal > 0 ? "active" : (isComplete ? "active" : "importing"),
        updatedAt: new Date(),
        ...(isComplete ? { "packs.procurement": "active", "packs.buyer": "active", "packs.supplier": "active" } : {}),
      },
    }
  )

  return NextResponse.json({
    ok:         true,
    jobId:      jobId.toString(),
    status:     isComplete ? "completed" : "paused",
    isComplete,
    progress: {
      scanned,
      matched,
      saved:   savedTotal,
      total,
      pct:    total > 0 ? Math.round((scanned / total) * 100) : 0,
    },
    message: isComplete
      ? `Import complete — ${savedTotal} contracts tagged with category "${slug}"`
      : `Batch done — ${scanned}/${total} processed. Call again to continue.`,
    archiveNote: total === 0
      ? `No contracts found in gem_contracts matching keywords for "${slug}". The GeM archive may not yet include this category. Import more archive data to populate this category.`
      : undefined,
  })
}

// ─── GET — job status ─────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const db   = (await clientPromise).db()
  const { slug } = await params
  const job  = await db.collection("category_jobs").findOne(
    { categorySlug: slug },
    { sort: { startedAt: -1 } }
  )

  if (!job) return NextResponse.json({ job: null })

  return NextResponse.json({
    job: { ...job, _id: job._id.toString() },
  })
}
