import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection("brochure").findOne({ key: "main" })
    const brochureUrl = doc?.mainBrochureUrl as string | undefined

    if (!brochureUrl) {
      return NextResponse.json({ error: "No brochure configured" }, { status: 404 })
    }

    // Proxy the PDF from Cloudinary so browsers always download it cleanly
    const upstream = await fetch(brochureUrl, {
      headers: { "User-Agent": "100xcircle-brochure-proxy/1.0" },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${upstream.status}` },
        { status: 502 },
      )
    }

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="100xcircle-brochure.pdf"',
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err) {
    console.error("Brochure download error:", err)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
