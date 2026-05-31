import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let objectId: ObjectId
    try {
      objectId = new ObjectId(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: "rfq_attachments" })

    // Find file metadata
    const files = await db
      .collection("rfq_attachments.files")
      .find({ _id: objectId })
      .limit(1)
      .toArray()

    if (!files.length) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileDoc = files[0]
    const contentType = (fileDoc.contentType as string) || "application/octet-stream"
    const filename = (fileDoc.filename as string) || "attachment"

    // Stream file from GridFS
    const downloadStream = bucket.openDownloadStream(objectId)
    const chunks: Buffer[] = []

    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk))
      downloadStream.on("end", resolve)
      downloadStream.on("error", reject)
    })

    const body = Buffer.concat(chunks)
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(body.length),
        "Cache-Control": "private, max-age=86400",
      },
    })
  } catch (err) {
    console.error("Attachment serve error:", err)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}
