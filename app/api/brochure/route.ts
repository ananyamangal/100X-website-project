import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Brochure status barely changes — cache for 5 minutes at the CDN edge.
// If the Navbar now receives hasBrochure from the server layout, this
// endpoint is only hit by legacy/external callers.
export const revalidate = 300

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const count = await db
      .collection("brochures.files")
      .countDocuments({ filename: "main-brochure.pdf" })
    const res = NextResponse.json({
      hasBrochure: count > 0,
      mainBrochureUrl: count > 0 ? "/api/brochure/download" : null,
    })
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    return res
  } catch {
    return NextResponse.json({ hasBrochure: false, mainBrochureUrl: null })
  }
}
