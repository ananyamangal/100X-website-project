import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const revalidate = 300

export async function GET() {
  try {
    const client = await clientPromise
    const doc = await client.db().collection("site_settings").findOne({ key: "main" })
    return NextResponse.json(doc ? JSON.parse(JSON.stringify(doc)) : {})
  } catch {
    return NextResponse.json({})
  }
}
