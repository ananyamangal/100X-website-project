import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET() {
  const db = (await clientPromise).db()
  const tasks = await db
    .collection("growth_os_citation_tasks")
    .find({ status: "pending" })
    .sort({ priority: -1, createdAt: 1 })
    .toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(tasks)))
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status } = body
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 })

  const db = (await clientPromise).db()
  await db.collection("growth_os_citation_tasks").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date().toISOString() } }
  )
  return NextResponse.json({ ok: true })
}
