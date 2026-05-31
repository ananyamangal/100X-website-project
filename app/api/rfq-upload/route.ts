import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export const dynamic = "force-dynamic"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/jpg",
  "image/png",
])

const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"])

function extOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file received" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 })
    }

    const ext = extOf(file.name)
    if (!ALLOWED_EXT.has(ext) && !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported format. Use PDF, DOC, DOCX, XLS, XLSX, JPG, or PNG." },
        { status: 415 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const client = await clientPromise
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: "rfq_attachments" })

    const filename = `${Date.now()}-${safeName(file.name)}`
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.type || "application/octet-stream",
      metadata: {
        originalName: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    })
    uploadStream.end(buffer)

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("finish", resolve)
      uploadStream.on("error", reject)
    })

    const fileId = String(uploadStream.id)
    // Public URL served by our own endpoint — no Cloudinary dependency
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://100-x-website-project.vercel.app"
    const url = `${baseUrl}/api/rfq-attachments/${fileId}`

    return NextResponse.json({ url, name: file.name, size: file.size })
  } catch (err) {
    console.error("RFQ upload failed:", err)
    return NextResponse.json({ error: "Upload failed", detail: String(err) }, { status: 500 })
  }
}
