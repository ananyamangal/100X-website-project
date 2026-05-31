import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export const dynamic = "force-dynamic"

const MAX_BYTES = 30 * 1024 * 1024 // 30MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file received" }, { status: 400 })
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files allowed" }, { status: 415 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 30MB)" }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const client = await clientPromise
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: "brochures" })

    // Delete previous brochure file(s) so only one exists at a time
    const existing = await db.collection("brochures.files").find({ filename: "main-brochure.pdf" }).toArray()
    for (const f of existing) {
      await bucket.delete(f._id)
    }

    // Upload new file
    const uploadStream = bucket.openUploadStream("main-brochure.pdf", {
      contentType: "application/pdf",
      metadata: { uploadedAt: new Date().toISOString(), size: file.size },
    })
    uploadStream.end(buffer)

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("finish", resolve)
      uploadStream.on("error", reject)
    })

    const fileId = String(uploadStream.id)

    // Also update the brochure config to use our internal URL
    const internalUrl = `/api/brochure/download`
    await db.collection("brochure").updateOne(
      { key: "main" },
      { $set: { key: "main", mainBrochureUrl: internalUrl, gridfsId: fileId, updatedAt: new Date() } },
      { upsert: true },
    )

    return NextResponse.json({ ok: true, fileId, url: internalUrl })
  } catch (err) {
    console.error("Brochure upload error:", err)
    return NextResponse.json({ error: "Upload failed", detail: String(err) }, { status: 500 })
  }
}
