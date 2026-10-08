import { NextRequest, NextResponse } from "next/server"
import { scheduleAutoSync } from "@/lib/knowledge/sync/execute"
import { revalidateTag } from "next/cache"
import { LAYOUT_DATA_TAG } from "@/lib/layoutData"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const { _id, createdAt, ...update } = body
    await db.collection("case_studies").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { ...update, updatedAt: new Date().toISOString() } },
    )
    scheduleAutoSync(["case_studies"])
    revalidateTag(LAYOUT_DATA_TAG) // header Performance menu
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db()
    await db.collection("case_studies").deleteOne({ _id: new ObjectId(params.id) })
    scheduleAutoSync(["case_studies"])
    revalidateTag(LAYOUT_DATA_TAG) // header Performance menu
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
