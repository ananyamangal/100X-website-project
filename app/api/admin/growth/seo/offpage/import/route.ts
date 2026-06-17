import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim())
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,))/g) ?? line.split(",")
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").replace(/^"|"$/g, "").trim() })
    return row
  })
}

function extractDomain(url: string): string {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "") }
  catch { return url }
}

function extractPath(url: string): string {
  try { const u = new URL(url.startsWith("http") ? url : `https://${url}`); return u.pathname || "/" }
  catch { return "/" }
}

// ─── Format adapters ─────────────────────────────────────────────────────────

interface NormBacklink {
  url: string; domain: string; anchor_text: string
  target_page: string; domain_authority: number; is_dofollow: boolean
}

function fromAhrefs(rows: Record<string, string>[]): NormBacklink[] {
  return rows.map(r => ({
    url: r["URL From"] || r["url_from"] || "",
    domain: r["Domain From"] || r["domain_from"] || extractDomain(r["URL From"] || ""),
    anchor_text: r["Anchor"] || r["anchor_text"] || "",
    target_page: extractPath(r["URL To"] || r["url_to"] || "/"),
    domain_authority: Number(r["Domain Rating"] || r["domain_rating"] || 0),
    is_dofollow: !["nofollow", "ugc", "sponsored"].includes((r["Type"] || "dofollow").toLowerCase()),
  }))
}

function fromSEMrush(rows: Record<string, string>[]): NormBacklink[] {
  return rows.map(r => ({
    url: r["Source URL"] || r["source_url"] || "",
    domain: r["Source Domain"] || r["source_domain"] || extractDomain(r["Source URL"] || ""),
    anchor_text: r["Anchor Text"] || r["anchor_text"] || "",
    target_page: extractPath(r["Target URL"] || r["target_url"] || "/"),
    domain_authority: Number(r["Authority Score"] || r["authority_score"] || 0),
    is_dofollow: (r["Link type"] || r["link_type"] || "dofollow").toLowerCase() === "dofollow",
  }))
}

function fromMoz(rows: Record<string, string>[]): NormBacklink[] {
  return rows.map(r => ({
    url: r["Source URL"] || r["source_url"] || "",
    domain: extractDomain(r["Source URL"] || r["source_url"] || ""),
    anchor_text: r["Anchor Text"] || r["anchor_text"] || "",
    target_page: extractPath(r["Target URL"] || r["target_url"] || "/"),
    domain_authority: Number(r["Domain Authority"] || r["domain_authority"] || r["DA"] || 0),
    is_dofollow: (r["Link Type"] || r["link_type"] || "dofollow").toLowerCase() !== "nofollow",
  }))
}

function fromGeneric(rows: Record<string, string>[]): NormBacklink[] {
  return rows.map(r => ({
    url: r["url"] || r["URL"] || r["backlink_url"] || "",
    domain: r["domain"] || r["Domain"] || extractDomain(r["url"] || r["URL"] || ""),
    anchor_text: r["anchor_text"] || r["Anchor Text"] || r["anchor"] || "",
    target_page: r["target_page"] || r["Target URL"] || r["target_url"] || "/",
    domain_authority: Number(r["domain_authority"] || r["DA"] || r["authority"] || 0),
    is_dofollow: !["false", "0", "no", "nofollow"].includes((r["is_dofollow"] || "true").toLowerCase()),
  }))
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const source: string = body.source || "generic"
  const csvText: string = body.csv || ""
  const records: NormBacklink[] = body.records || []

  let normalized: NormBacklink[] = records

  if (csvText) {
    const rows = parseCSV(csvText)
    if (source === "ahrefs")  normalized = fromAhrefs(rows)
    else if (source === "semrush") normalized = fromSEMrush(rows)
    else if (source === "moz")     normalized = fromMoz(rows)
    else                           normalized = fromGeneric(rows)
  }

  const valid = normalized.filter(r => r.url && r.domain)
  if (!valid.length) return NextResponse.json({ error: "No valid records parsed" }, { status: 400 })

  const db = (await clientPromise).db()
  const coll = db.collection("seo_backlinks")
  const log  = db.collection("seo_offpage_audit_log")
  const now  = new Date().toISOString()

  let imported = 0; let skipped = 0

  for (const bl of valid) {
    if (!bl.url || !bl.domain) { skipped++; continue }

    const existing = await coll.findOne({ domain: bl.domain, target_page: bl.target_page })
    if (existing) { skipped++; continue }

    await coll.insertOne({
      url:              bl.url,
      domain:           bl.domain,
      anchor_text:      bl.anchor_text,
      target_page:      bl.target_page || "/",
      status:           "detected",
      source_type:      `import_${source}`,
      domain_authority: bl.domain_authority,
      spam_score:       0,
      is_dofollow:      bl.is_dofollow,
      backlink_count:   1,
      referring_domains: 0,
      traffic_impact:   null,
      ranking_impact:   null,
      revenue_impact:   null,
      notes:            `Imported from ${source}`,
      tags:             ["imported"],
      detected_at:      now,
      acquired_at:      null,
      verified_at:      null,
      created_at:       now,
      updated_at:       now,
    })
    imported++
  }

  await log.insertOne({
    collection: "seo_backlinks", action: "bulk_import",
    detail: `Imported ${imported} backlinks from ${source} (${skipped} skipped as duplicates)`,
    created_at: now,
  })

  return NextResponse.json({ ok: true, imported, skipped, total: valid.length, source })
}
