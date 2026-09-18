import { NextRequest, NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import clientPromise from "@/lib/mongodb"
import { LAYOUT_DATA_TAG } from "@/lib/layoutData"
import { normalizeSocialLinks } from "@/lib/socialLinks"

export async function GET() {
  const client = await clientPromise
  const doc = await client.db().collection("site_settings").findOne({ key: "main" })
  if (!doc) return NextResponse.json({ key: "main" })
  // Normalize on read too, so documents saved with the legacy flag names
  // (header/footer/contact/products) load into the form with their boxes ticked.
  return NextResponse.json({
    ...JSON.parse(JSON.stringify(doc)),
    ...(doc.social ? { social: normalizeSocialLinks(doc.social) } : {}),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const client = await clientPromise
  // Drop `_id`: the admin form loads the GET response (which includes it)
  // straight into its state and re-POSTs the whole thing, but MongoDB
  // rejects replaceOne() writes that alter the immutable `_id` field —
  // without stripping it here, every save throws and the client (which
  // doesn't check response.ok) shows a false "Saved!".
  const { _id, ...rest } = body
  // Normalize `social` against the canonical per-platform schema (url +
  // showInHeader/showInFooter/showOnContactPage/showOnProductPages) so the
  // stored document always matches what every public renderer expects,
  // regardless of which field names the calling client used.
  const update = {
    ...rest,
    ...(body.social ? { social: normalizeSocialLinks(body.social) } : {}),
    key: "main",
    updatedAt: new Date().toISOString(),
  }
  try {
    await client.db().collection("site_settings").replaceOne(
      { key: "main" },
      update,
      { upsert: true }
    )
  } catch (err) {
    console.error("[api/admin/site-settings] save failed:", err)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
  // The root layout bakes social links into the header, footer and
  // Organization JSON-LD of every static/ISR page, so a save has to
  // invalidate the whole tree for "Save All" to reach the live site.
  revalidateTag(LAYOUT_DATA_TAG)
  revalidatePath("/", "layout")
  revalidatePath("/api/site-settings")
  return NextResponse.json({ success: true })
}
