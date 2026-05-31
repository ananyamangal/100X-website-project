import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export const dynamic = "force-dynamic"

const MAX_BYTES = 30 * 1024 * 1024 // 30MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

// Generic admin file upload — stores in MongoDB GridFS, returns /api/files/[id]
// Used for: per-product brochures, case study PDFs, any admin-uploaded document.
// Images should still use Cloudinary (better CDN, transformations). This is for PDFs/docs.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file received" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 30MB)" }, { status: 413 })
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const client = await clientPromise
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: "admin_files" })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120)
    const filename = `${Date.now()}-${safeName}`

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.type,
      metadata: { originalName: file.name, size: file.size, uploadedAt: new Date().toISOString() },
    })
    uploadStream.end(buffer)

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("finish", resolve)
      uploadStream.on("error", reject)
    })

    const fileId = String(uploadStream.id)
    const url = `/api/files/${fileId}`
    return NextResponse.json({ ok: true, url, fileId, name: file.name, size: file.size })
  } catch (err) {
    console.error("Admin file upload error:", err)
    return NextResponse.json({ error: "Upload failed", detail: String(err) }, { status: 500 })
  }
}
