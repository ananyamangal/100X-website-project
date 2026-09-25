import { NextResponse } from "next/server"
import { scheduleAutoSync } from "@/lib/knowledge/sync/execute"
import clientPromise from "@/lib/mongodb"

export async function POST() {
  try {
    const client = await clientPromise
    const db = client.db()

    // Publish all unpublished case studies (auto-generated and manually created)
    // isSample docs are excluded — they are demonstration content only
    const result = await db.collection("case_studies").updateMany(
      { published: false, isSample: { $ne: true } },
      { $set: { published: true, updatedAt: new Date().toISOString() } }
    )
    if (result.modifiedCount > 0) scheduleAutoSync(["case_studies"])

    return NextResponse.json({
      ok: true,
      published: result.modifiedCount,
      message: `Published ${result.modifiedCount} case ${result.modifiedCount === 1 ? "study" : "studies"}.`,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
