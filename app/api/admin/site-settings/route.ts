import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  const client = await clientPromise
  const doc = await client.db().collection("site_settings").findOne({ key: "main" })
  return NextResponse.json(doc ? JSON.parse(JSON.stringify(doc)) : { key: "main" })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const client = await clientPromise
  const update = { ...body, key: "main", updatedAt: new Date().toISOString() }
  await client.db().collection("site_settings").replaceOne(
    { key: "main" },
    update,
    { upsert: true }
  )
  return NextResponse.json({ success: true })
}
