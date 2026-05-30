import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"

const BRAND = "100X Circle"
const GOOGLE_PRODUCT_CATEGORY = "Hardware > Sprayers"

const HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
}

function parseLowPrice(raw: string | undefined): string | null {
  if (!raw) return null
  const nums = raw.replace(/[₹,\s]/g, "").match(/\d+/g)
  if (!nums || nums.length === 0) return null
  const low = parseInt(nums[0], 10)
  if (isNaN(low) || low <= 0) return null
  return low.toFixed(2)
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function productToItem(p: Record<string, unknown>, id: string): string {
  const name = esc(String(p.name ?? "Product"))
  const rawDesc = stripHtml(String(p.shortDescription ?? p.detailedDescription ?? ""))
  const desc = esc(rawDesc.slice(0, 5000) || `${name} — thermal fogging machine by 100X Circle Pvt Ltd`)
  const link = `${SITE_URL}/products/${id}`
  const imageUrls = Array.isArray(p.imageUrls) ? (p.imageUrls as string[]) : []
  const image = imageUrls.find((u) => typeof u === "string" && u.startsWith("http")) || `${SITE_URL}/logo-main.png`
  const availability = p.inStock !== false ? "in_stock" : "out_of_stock"
  const price = parseLowPrice(String(p.priceRange ?? ""))
  const category = esc(String(p.category ?? GOOGLE_PRODUCT_CATEGORY))
  const sku = String(p.sku ?? id)
  const features: string[] = Array.isArray(p.features) ? (p.features as string[]) : []
  const badges: string[] = Array.isArray(p.badges) ? (p.badges as string[]) : []
  const allBadges = [...badges, "ISO 9001:2015", "GeM Eligible", "Made in India"]
  const keywords = [name, BRAND, category, "thermal fogging machine", "India"].join(", ")

  return `  <item>
    <g:id>${esc(id)}</g:id>
    <g:title>${name}</g:title>
    <g:description>${desc}</g:description>
    <g:link>${link}</g:link>
    <g:image_link>${esc(image)}</g:image_link>
    <g:availability>${availability}</g:availability>
    <g:condition>new</g:condition>
    ${price ? `<g:price>${price} INR</g:price>` : ""}
    <g:brand>${esc(BRAND)}</g:brand>
    <g:mpn>${esc(sku)}</g:mpn>
    <g:google_product_category>${esc(GOOGLE_PRODUCT_CATEGORY)}</g:google_product_category>
    <g:product_type>${esc(category)}</g:product_type>
    <g:shipping>
      <g:country>IN</g:country>
      <g:service>Standard</g:service>
      <g:price>0 INR</g:price>
    </g:shipping>
    <g:identifier_exists>yes</g:identifier_exists>
    <g:material>Metal</g:material>
    <g:country_of_origin>IN</g:country_of_origin>
    ${features.slice(0, 3).map((f) => `<g:feature>${esc(String(f))}</g:feature>`).join("\n    ")}
    ${allBadges.slice(0, 5).map((b) => `<g:custom_label_0>${esc(String(b))}</g:custom_label_0>`).join("\n    ")}
    <g:custom_label_1>${esc(keywords)}</g:custom_label_1>
    <g:ads_redirect>${link}</g:ads_redirect>
  </item>`
}

export const dynamic = "force-dynamic"

export async function GET() {
  let products: Array<{ id: string; data: Record<string, unknown> }> = []

  try {
    const client = await clientPromise
    const db = client.db()
    const raw = await db.collection("products").find({}).sort({ order: 1, createdAt: -1 }).toArray()

    products = raw
      .filter((p) => {
        const name = String(p.name ?? "")
        // Filter obviously non-fogging products (e.g., Baggage Trolleys)
        const lower = name.toLowerCase()
        if (lower.includes("trolley") || lower.includes("baggage") || lower.includes("stainless steel trolley")) return false
        return true
      })
      .map((p) => {
        const raw = p as Record<string, unknown>
        let imageUrls: string[] = []
        if (Array.isArray(raw.imageUrls)) {
          imageUrls = (raw.imageUrls as string[]).filter((u) => typeof u === "string")
        } else if (typeof raw.imageUrl === "string") {
          imageUrls = [raw.imageUrl]
        }
        return { id: String(p._id), data: { ...raw, imageUrls } }
      })
  } catch {
    // Return empty feed on DB error
  }

  const now = new Date().toUTCString()
  const items = products.map((p) => productToItem(p.data, p.id)).join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>100X Circle — Thermal Fogging Machine Product Feed</title>
    <link>${SITE_URL}/products</link>
    <description>Product catalog for 100X Circle Pvt Ltd — Indian OEM manufacturer of thermal fogging machines. GeM listed, ISO 9001 certified.</description>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new NextResponse(xml, { headers: HEADERS })
}
