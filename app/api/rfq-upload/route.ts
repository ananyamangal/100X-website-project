import { NextRequest, NextResponse } from "next/server"

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

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhbvzugv6"
const CLOUDINARY_PRESET = "product_uploads"

function extOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
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

    // Upload to Cloudinary (server-side) — raw for documents, image for photos
    const resourceType = file.type.startsWith("image/") ? "image" : "raw"
    const fd = new FormData()
    fd.append("file", file)
    fd.append("upload_preset", CLOUDINARY_PRESET)

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`,
      { method: "POST", body: fd },
    )
    const cloudData = await cloudRes.json()
    if (!cloudData.secure_url) {
      console.error("Cloudinary upload failed:", cloudData.error)
      return NextResponse.json({ error: cloudData.error?.message || "Upload failed" }, { status: 500 })
    }

    return NextResponse.json({
      url: cloudData.secure_url as string,
      name: file.name,
      size: file.size,
    })
  } catch (err) {
    console.error("RFQ upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
