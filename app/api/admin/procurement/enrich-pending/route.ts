// POST /api/admin/procurement/enrich-pending
// Finds gem_contracts where detail_scraped != true (or key fields are null),
// then re-triggers the harvest scan for their page_id ranges.
// Requires: procurement.batch_collect.run

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { verifyAndConsumeToken } from "@/lib/gem/approval"

export const maxDuration = 120

const BATCH_SIZE   = 200  // IDs per re-scan batch
const MAX_BATCHES  = 3    // Max batches per single API call (keeps response time <90s)

const SCRAPE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
}

async function fetchAndParse(pageId: number): Promise<Record<string, unknown> | null> {
  try {
    const url = `https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/${pageId}`
    const res = await fetch(url, {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const html = await res.text()
    if (html.length < 500) return null

    // Extract key fields from HTML
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")

    function first(...patterns: RegExp[]): string | null {
      for (const p of patterns) {
        const m = text.match(p)
        if (m?.[1]?.trim()) return m[1].trim()
      }
      return null
    }

    const gemc_no          = first(/GEMC-\d{12}/, /Contract\s+No[.:\s]+([A-Z0-9/-]+)/i) ?? null
    const seller_name      = first(/Seller\s+Name[:\s]+([A-Za-z0-9\s,.\-&/]+?)(?:GSTIN|Email|Address)/i) ?? null
    const dept_name        = first(/Department[:\s]+([^|]+?)(?:Ministry|State|Buyer)/i) ?? null
    const ministry         = first(/Ministry[:\s]+([^|]+?)(?:Department|State|Buyer)/i) ?? null
    const product_name     = first(/Product\s+Name[:\s]+([^\n|]+)/i) ?? null
    const seller_state     = first(/Seller\s+State[:\s]+([A-Za-z\s]+?)(?:GSTIN|Pincode|\d{6})/i) ?? null
    const seller_gst       = text.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/)?.[1] ?? null
    const valueMatch       = text.match(/Contract\s+Value[:\s]+₹?\s*([\d,]+)/i)
    const contract_value_num = valueMatch ? Number(valueMatch[1].replace(/,/g, "")) || null : null
    const buyer_name       = first(/Buyer\s+Name[:\s]+([^|]+?)(?:Department|State|Pincode)/i) ?? null

    if (!gemc_no && !seller_name && !product_name) return null

    return {
      detail_scraped:     true,
      seller_name_canonical: seller_name?.toUpperCase().trim() ?? null,
      dept_name:          dept_name?.trim() ?? null,
      ministry:           ministry?.trim() ?? null,
      product_name:       product_name?.trim() ?? null,
      seller_state:       seller_state?.trim() ?? null,
      seller_gst:         seller_gst ?? null,
      contract_value_num: contract_value_num,
      buyer_name:         buyer_name?.trim() ?? null,
      gemc_no:            gemc_no ?? null,
      enriched_at:        new Date(),
      extraction_confidence: (seller_name && product_name && dept_name) ? 0.85 : 0.5,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "procurement.view")
  if (!("user" in auth)) return auth

  const db = (await clientPromise).db()
  const pending = await db.collection("gem_contracts")
    .countDocuments({ detail_scraped: { $ne: true } })
  const sample = await db.collection("gem_contracts")
    .find({ detail_scraped: { $ne: true } })
    .sort({ first_seen: -1 })
    .limit(5)
    .project({ _id: 1, page_id: 1, gemc_no: 1, first_seen: 1 })
    .toArray()

  return NextResponse.json({
    pending,
    batchSize:  BATCH_SIZE,
    maxBatches: MAX_BATCHES,
    estimated_runs: Math.ceil(pending / BATCH_SIZE),
    sample,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "procurement.batch_collect.run")
  if (!("user" in auth)) return auth

  const body = await request.json().catch(() => ({}))
  const { dryRun = false, maxItems = BATCH_SIZE * MAX_BATCHES, approval_token } = body

  // Approval gate: dryRun is read-only, execution requires a valid approval token
  if (!dryRun) {
    if (!approval_token) {
      await writeAuditLog(auth.user, "enrichment_unauthenticated", "enrich_pending", {
        reason: "missing_approval_token",
      }, request)
      return NextResponse.json(
        { error: "Approval required. Issue an approval token before running enrichment.", code: "APPROVAL_REQUIRED" },
        { status: 403 }
      )
    }

    const approval = await verifyAndConsumeToken(
      approval_token,
      auth.user.sub,
      "enrich_pending",
      "/api/admin/procurement/enrich-pending"
    )
    if (!approval) {
      await writeAuditLog(auth.user, "enrichment_unauthenticated", "enrich_pending", {
        reason: "invalid_expired_or_consumed_token",
        token_id: approval_token,
      }, request)
      return NextResponse.json(
        { error: "Approval token invalid, expired, or already used.", code: "APPROVAL_INVALID" },
        { status: 403 }
      )
    }

    await writeAuditLog(auth.user, "enrichment_start", "enrich_pending", {
      approval_token_id: approval.token_id,
      maxItems,
    }, request)
  }

  const db = (await clientPromise).db()

  // Find pending contracts with page_id
  const pending = await db.collection("gem_contracts")
    .find({
      detail_scraped: { $ne: true },
      page_id:        { $exists: true, $ne: null },
    })
    .sort({ first_seen: -1 })
    .limit(Math.min(maxItems, BATCH_SIZE * MAX_BATCHES))
    .project({ _id: 1, page_id: 1, gemc_no: 1 })
    .toArray()

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, enriched: 0, failed: 0, message: "No pending contracts found" })
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      pending: pending.length,
      sampleIds: pending.slice(0, 10).map(p => p.page_id),
    })
  }

  let enriched = 0
  let failed   = 0
  const errors: string[] = []

  for (const doc of pending) {
    const pageId = doc.page_id as number
    if (!pageId) { failed++; continue }

    const enriched_data = await fetchAndParse(pageId)
    if (!enriched_data) {
      failed++
      await db.collection("gem_contracts").updateOne(
        { _id: doc._id },
        { $set: { detail_scraped: false, enrichment_error: "fetch_failed", enriched_at: new Date() } }
      )
      errors.push(`page_id=${pageId}: fetch failed`)
      continue
    }

    await db.collection("gem_contracts").updateOne(
      { _id: doc._id },
      { $set: enriched_data }
    )
    enriched++
  }

  await writeAuditLog(auth.user, "enrichment_complete", "enrich_pending", {
    total: pending.length,
    enriched,
    failed,
  }, request)

  return NextResponse.json({
    ok:       true,
    total:    pending.length,
    enriched,
    failed,
    errors:   errors.slice(0, 20),
    message:  `Enriched ${enriched}/${pending.length} contracts`,
  })
}
