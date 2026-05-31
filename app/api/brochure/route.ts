import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Returns whether a brochure file exists in GridFS.
// Navbar and other consumers use this to decide whether to show the button.
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const count = await db
      .collection("brochures.files")
      .countDocuments({ filename: "main-brochure.pdf" })
    return NextResponse.json({
      hasBrochure: count > 0,
      // Keep mainBrochureUrl for backwards compat — always points to our proxy
      mainBrochureUrl: count > 0 ? "/api/brochure/download" : null,
    })
  } catch {
    return NextResponse.json({ hasBrochure: false, mainBrochureUrl: null })
  }
}
