import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"])

function sanitiseName(name: string): string {
  // Strip path separators, restrict to filename-safe characters.
  const base = path.basename(name)
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-")
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

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.has(ext) && !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported format. Use PDF, DOC, DOCX, XLS, or XLSX." },
        { status: 415 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeName = `${Date.now()}-${sanitiseName(file.name)}`
    const folder = path.join(process.cwd(), "public", "rfq-uploads")
    await mkdir(folder, { recursive: true })
    const filePath = path.join(folder, safeName)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      url: `/rfq-uploads/${safeName}`,
      name: file.name,
      size: file.size,
    })
  } catch (err) {
    console.error("RFQ upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
