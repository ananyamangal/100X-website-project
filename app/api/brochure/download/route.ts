import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: "brochures" })

    // Find the brochure file in GridFS
    const files = await db
      .collection("brochures.files")
      .find({ filename: "main-brochure.pdf" })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray()

    if (!files.length) {
      // Fall back to Cloudinary URL if no GridFS file (legacy uploads)
      const doc = await db.collection("brochure").findOne({ key: "main" })
      const fallbackUrl = doc?.mainBrochureUrl as string | undefined
      if (fallbackUrl && fallbackUrl.startsWith("http")) {
        const upstream = await fetch(fallbackUrl, {
          headers: { "User-Agent": "100xcircle-brochure-proxy/1.0" },
        })
        if (upstream.ok) {
          const body = await upstream.arrayBuffer()
          return new NextResponse(body, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'attachment; filename="100xcircle-brochure.pdf"',
              "Cache-Control": "public, max-age=3600",
            },
          })
        }
      }
      return NextResponse.json({ error: "No brochure uploaded yet" }, { status: 404 })
    }

    // Stream from GridFS
    const fileDoc = files[0]
    const downloadStream = bucket.openDownloadStream(fileDoc._id)

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk))
      downloadStream.on("end", resolve)
      downloadStream.on("error", reject)
    })

    const body = Buffer.concat(chunks)
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="100xcircle-brochure.pdf"',
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err) {
    console.error("Brochure download error:", err)
    return NextResponse.json({ error: "Download failed", detail: String(err) }, { status: 500 })
  }
}
