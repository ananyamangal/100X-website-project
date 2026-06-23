import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const docs = await db.collection("media_assets").find({}).sort({ uploadedAt: -1 }).toArray()
    return NextResponse.json(docs.map(d => ({ ...d, _id: String(d._id) })))
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, publicId, altText, tags, source } = body
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })

    const client = await clientPromise
    const db = client.db()

    // Generate Cloudinary transform URLs if it's a Cloudinary asset
    const isCloudinary = typeof url === "string" && url.includes("res.cloudinary.com")
    const baseUrl = isCloudinary ? url.replace(/\/upload\//, "/upload/") : url
    const makeTransform = (t: string) =>
      isCloudinary ? url.replace(/\/upload\//, `/upload/${t}/`) : url

    const asset = {
      url,
      publicId: publicId || null,
      altText: altText || "",
      tags: Array.isArray(tags) ? tags : [],
      source: source || "direct-upload",
      category: "uploads",
      thumbnailUrl: makeTransform("w_300,h_300,c_fill,q_auto"),
      webpUrl: makeTransform("f_webp,q_auto"),
      optimizedUrl: makeTransform("q_auto,f_auto"),
      usedIn: [] as string[],
      uploadedAt: new Date(),
    }

    const result = await db.collection("media_assets").insertOne(asset)
    return NextResponse.json({ ...asset, _id: String(result.insertedId) })
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
