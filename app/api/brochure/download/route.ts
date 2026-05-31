import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: "brochures" })

    const files = await db
      .collection("brochures.files")
      .find({ filename: "main-brochure.pdf" })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray()

    if (!files.length) {
      return NextResponse.json({ error: "No brochure uploaded yet" }, { status: 404 })
    }

    const downloadStream = bucket.openDownloadStream(files[0]._id)
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (c: Buffer) => chunks.push(c))
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
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
