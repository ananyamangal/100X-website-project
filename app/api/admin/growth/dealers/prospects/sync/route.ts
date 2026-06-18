/**
 * Dealer Prospect Sync Engine
 * POST /api/admin/growth/dealers/prospects/sync
 *
 * Sources (in priority order):
 *   1. fogging_sellers   — active GeM fogging market sellers (email + phone + GST)
 *   2. seller_profiles   — enriched profiles where supplies_fogging_products=true
 *   3. submissions       — dealerInquiry=true or dealerScore>=7
 *   4. brochure_leads    — brochure downloads (warm B2B intent)
 *   5. rfq_popup_leads   — RFQ form submissions (non-test)
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const COLL = "dealer_prospects"

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  if (!raw) return ""
  const digits = String(raw).replace(/\D/g, "")
  if (digits.length === 10)                              return digits
  if (digits.startsWith("91") && digits.length === 12)  return digits.slice(2)
  if (digits.startsWith("0")  && digits.length === 11)  return digits.slice(1)
  if (digits.length > 10)                               return digits.slice(-10)
  return digits.length >= 7 ? digits : ""
}

function calcScore(email: string, mobile: string, gst: string, city: string, contact_person: string): number {
  return (email  ? 30 : 0) +
         (mobile ? 30 : 0) +
         (gst    ? 20 : 0) +
         (city   ? 10 : 0) +
         (contact_person ? 10 : 0)
}

function dedupKey(email: string, mobile: string, gst: string, name: string, city: string): string {
  if (email)  return `email:${email}`
  if (mobile) return `phone:${mobile}`
  if (gst)    return `gst:${gst}`
  return `name:${name.toLowerCase()}::${city.toLowerCase()}`
}

function extractCityFromAddress(addr: string): string {
  if (!addr) return ""
  const parts = addr.split(",").map(p => p.trim()).filter(Boolean)
  // Walk backwards, skip "STATE-PINCODE" pattern, return first plausible city
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    if (/^[A-Z\s]+-\d{3,}$/.test(p)) continue  // STATE-110020 — skip
    if (p.length < 3 || /^\d+$/.test(p)) continue
    return p
  }
  return ""
}

function extractFromRfqAnswers(answers: Record<string, unknown>): { email: string; phone: string; name: string } {
  let email = "", phone = "", name = ""
  for (const val of Object.values(answers)) {
    const s = String(val ?? "").trim()
    if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
      email = s.toLowerCase()
    } else if (!phone && /^\d{10}$/.test(s.replace(/\D/g, ""))) {
      phone = s
    } else if (!name && s.length >= 3 && s.length <= 60 && /^[a-zA-Z\s'.]+$/.test(s)) {
      name = s
    }
  }
  return { email, phone, name }
}

type ProspectDoc = {
  dealer_name:      string
  contact_person:   string
  mobile:           string
  email:            string
  city:             string
  state:            string
  gst:              string
  source:           string
  source_ref_id:    string
  dealer_score:     number
  status:           string
  needs_enrichment: boolean
  dedup_key:        string
  notes:            string
  created_at:       string
  updated_at:       string
  gem_gmv?:         number
  gem_contracts?:   number
  is_100x_dealer?:  boolean
  competes_with_100x?: boolean
  seller_type?:     "dealer" | "oem" | "unknown"
  oem_brand?:       string
  first_seen?:      string | null
  last_seen?:       string | null
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db  = (await clientPromise).db()
  const now = new Date().toISOString()

  const results: Record<string, { processed: number; inserted: number; updated: number }> = {}
  let totalInserted = 0
  let totalUpdated  = 0

  async function bulkUpsert(prospects: ProspectDoc[], sourceName: string) {
    if (!prospects.length) { results[sourceName] = { processed: 0, inserted: 0, updated: 0 }; return }
    let ins = 0, upd = 0
    // Process in batches of 500
    for (let i = 0; i < prospects.length; i += 500) {
      const batch = prospects.slice(i, i + 500)
      const ops = batch.map(p => ({
        updateOne: {
          filter: { dedup_key: p.dedup_key },
          update: {
            $setOnInsert: {
              dedup_key:      p.dedup_key,
              source:         p.source,
              source_ref_id:  p.source_ref_id,
              status:         "new",
              created_at:     now,
            },
            $set: {
              dealer_name:      p.dealer_name,
              contact_person:   p.contact_person,
              mobile:           p.mobile,
              email:            p.email,
              city:             p.city,
              state:            p.state,
              gst:              p.gst,
              dealer_score:     p.dealer_score,
              needs_enrichment: p.needs_enrichment,
              notes:            p.notes,
              updated_at:       now,
              ...(p.gem_gmv            !== undefined ? { gem_gmv:            p.gem_gmv            } : {}),
              ...(p.gem_contracts      !== undefined ? { gem_contracts:      p.gem_contracts      } : {}),
              ...(p.is_100x_dealer     !== undefined ? { is_100x_dealer:     p.is_100x_dealer     } : {}),
              ...(p.competes_with_100x !== undefined ? { competes_with_100x: p.competes_with_100x } : {}),
              ...(p.seller_type        !== undefined ? { seller_type:        p.seller_type        } : {}),
              ...(p.oem_brand          !== undefined ? { oem_brand:          p.oem_brand          } : {}),
              ...(p.first_seen         !== undefined ? { first_seen:         p.first_seen         } : {}),
              ...(p.last_seen          !== undefined ? { last_seen:          p.last_seen          } : {}),
            },
          },
          upsert: true,
        },
      }))
      const res = await db.collection(COLL).bulkWrite(ops, { ordered: false })
      ins += res.upsertedCount
      upd += res.modifiedCount
    }
    results[sourceName]  = { processed: prospects.length, inserted: ins, updated: upd }
    totalInserted += ins
    totalUpdated  += upd
  }

  // ── Source 1: fogging_sellers ─────────────────────────────────────────────
  try {
    const sellers = await db.collection("fogging_sellers").find({}).limit(2000).toArray()
    const prospects = sellers.map(s => {
      const email  = String(s.seller_email  || "").toLowerCase().trim()
      const mobile = normalizePhone(String(s.seller_phone || ""))
      const gst    = String(s.seller_gst    || "").trim().toUpperCase()
      const name   = String(s.seller_display_name || s.seller_name_raw || "")
      const state  = String(s.seller_state  || "")
      const city   = extractCityFromAddress(String(s.seller_address || ""))
      const score  = calcScore(email, mobile, gst, city, "")
      const dk     = dedupKey(email, mobile, gst, name, city)
      return {
        dealer_name:      name,
        contact_person:   "",
        mobile,
        email,
        city,
        state,
        gst,
        source:           "gem_seller",
        source_ref_id:    String(s._id),
        dealer_score:     score,
        status:           "new",
        needs_enrichment: !email || !mobile,
        dedup_key:        dk,
        notes:            `GST: ${gst} | GeM GMV: ₹${Math.round((s.total_gmv as number || 0) / 100000)}L | Contracts: ${s.total_contracts || 0}`,
        gem_gmv:          s.total_gmv as number || 0,
        gem_contracts:    s.total_contracts as number || 0,
        is_100x_dealer:   s.is_100x_dealer as boolean || false,
        competes_with_100x: !(s.is_100x_dealer as boolean),
        created_at:       now,
        updated_at:       now,
      } satisfies ProspectDoc
    })
    await bulkUpsert(prospects, "fogging_sellers")
  } catch (e) { results["fogging_sellers"] = { processed: 0, inserted: 0, updated: 0 }; console.error("fogging_sellers sync:", e) }

  // ── Source 2: seller_profiles (fogging-related only) ──────────────────────
  try {
    const profiles = await db.collection("seller_profiles")
      .find({
        supplies_fogging_products: true,
        seller_slug:               { $ne: "__meta__" },
        seller_name:               { $exists: true, $ne: null },
      })
      .limit(2000)
      .toArray()
    const prospects = profiles.map(s => {
      const gst   = String(s.seller_gstin || "").trim().toUpperCase()
      const name  = String(s.seller_name  || "")
      const state = String(s.seller_state || (s.seller_gstin_states as string[] || [])[0] || "")
      const city  = extractCityFromAddress(String(s.seller_address || ""))
      const score = calcScore("", "", gst, city, "")
      const dk    = dedupKey("", "", gst, name, city)
      return {
        dealer_name:      name,
        contact_person:   "",
        mobile:           "",
        email:            "",
        city,
        state,
        gst,
        source:           "gem_seller",
        source_ref_id:    String(s._id),
        dealer_score:     score,
        status:           "new",
        needs_enrichment: true,
        dedup_key:        dk,
        notes:            `GST: ${gst} | Seller profile | Fogging supplier`,
        competes_with_100x: !(s.is_100x_supplier as boolean),
        created_at:       now,
        updated_at:       now,
      } satisfies ProspectDoc
    })
    await bulkUpsert(prospects, "seller_profiles")
  } catch (e) { results["seller_profiles"] = { processed: 0, inserted: 0, updated: 0 }; console.error("seller_profiles sync:", e) }

  // ── Source 3: submissions (dealer applications) ───────────────────────────
  try {
    const subs = await db.collection("submissions")
      .find({
        $or: [{ dealerInquiry: true }, { dealerScore: { $gte: 7 } }],
        _test: { $ne: true },
      })
      .limit(500)
      .toArray()
    const prospects = subs.map(s => {
      const email  = String(s.email || "").toLowerCase().trim()
      const mobile = normalizePhone(String(s.phone || ""))
      const name   = String(s.name  || "")
      const score  = calcScore(email, mobile, "", "", name)
      const dk     = dedupKey(email, mobile, "", name, "")
      return {
        dealer_name:      String(s.organization || s.company || ""),
        contact_person:   name,
        mobile,
        email,
        city:             "",
        state:            String(s.state || ""),
        gst:              "",
        source:           "website_lead",
        source_ref_id:    String(s._id),
        dealer_score:     score,
        status:           "new",
        needs_enrichment: !email || !mobile,
        dedup_key:        dk,
        notes:            `Dealer inquiry | score=${s.dealerScore} | ${s.leadType || ""}`,
        created_at:       now,
        updated_at:       now,
      } satisfies ProspectDoc
    })
    await bulkUpsert(prospects, "submissions")
  } catch (e) { results["submissions"] = { processed: 0, inserted: 0, updated: 0 }; console.error("submissions sync:", e) }

  // ── Source 4: brochure_leads ──────────────────────────────────────────────
  try {
    const leads = await db.collection("brochure_leads").find({}).limit(500).toArray()
    const prospects = leads.map(l => {
      const email  = String(l.email || "").toLowerCase().trim()
      const mobile = normalizePhone(String(l.phone || ""))
      const name   = String(l.name  || "")
      const state  = String(l.state || "")
      const score  = calcScore(email, mobile, "", "", name)
      const dk     = dedupKey(email, mobile, "", name, "")
      return {
        dealer_name:      String(l.organization || l.company || ""),
        contact_person:   name,
        mobile,
        email,
        city:             "",
        state,
        gst:              "",
        source:           "website_lead",
        source_ref_id:    String(l._id),
        dealer_score:     score,
        status:           "new",
        needs_enrichment: !email || !mobile,
        dedup_key:        dk,
        notes:            `Brochure download | ${l.brochureType || ""} | ${l.productName || ""}`,
        created_at:       now,
        updated_at:       now,
      } satisfies ProspectDoc
    })
    await bulkUpsert(prospects, "brochure_leads")
  } catch (e) { results["brochure_leads"] = { processed: 0, inserted: 0, updated: 0 }; console.error("brochure_leads sync:", e) }

  // ── Source 5: rfq_popup_leads (non-test, with contact data) ──────────────
  try {
    const rfqs = await db.collection("rfq_popup_leads")
      .find({ _test: { $ne: true } })
      .limit(500)
      .toArray()
    const prospects = rfqs
      .map(r => {
        const answers = (r.answers || {}) as Record<string, unknown>
        const { email, phone, name } = extractFromRfqAnswers(answers)
        const mobile = normalizePhone(phone)
        if (!email && !mobile) return null
        const score = calcScore(email, mobile, "", "", name)
        const dk    = dedupKey(email, mobile, "", name, "")
        return {
          dealer_name:      "",
          contact_person:   name,
          mobile,
          email,
          city:             "",
          state:            "",
          gst:              "",
          source:           "rfq",
          source_ref_id:    String(r._id),
          dealer_score:     score,
          status:           "new",
          needs_enrichment: !email || !mobile,
          dedup_key:        dk,
          notes:            `RFQ submission | ${r.pagePath || ""}`,
          created_at:       now,
          updated_at:       now,
        } satisfies ProspectDoc
      })
      .filter((p): p is ProspectDoc => p !== null)
    await bulkUpsert(prospects, "rfq_popup_leads")
  } catch (e) { results["rfq_popup_leads"] = { processed: 0, inserted: 0, updated: 0 }; console.error("rfq_popup_leads sync:", e) }

  // ── Source 6: gem_contracts — selling_as reseller classification ─────────
  let oemSkipped     = 0
  let resellerAdded  = 0
  const stateCount: Record<string, number> = {}

  try {
    const RESELLER_RE = /\bReseller\b/i        // catches "Reseller" and "OEM verified Reseller"
    const OEM_ONLY_RE = /^OEM(\s+Item)?$/i     // catches "OEM" and "OEM Item" (not Reseller)

    const gemResellers = await db.collection("gem_contracts").aggregate([
      { $match: { selling_as: { $exists: true, $nin: [null, ""] } } },
      {
        $group: {
          _id: {
            $ifNull: [
              "$seller_gst",
              { $concat: ["noGst::", { $ifNull: ["$seller_name_canonical", { $ifNull: ["$seller_name", "unknown"] }] }] },
            ],
          },
          seller_name:    { $first: "$seller_name" },
          seller_email:   { $first: "$seller_email" },
          seller_phone:   { $first: "$seller_phone" },
          seller_state:   { $first: "$seller_state" },
          seller_address: { $first: "$seller_address" },
          oem_name:       { $first: "$oem_name" },
          selling_as:     { $first: "$selling_as" },
          contracts_won:  { $sum: 1 },
          total_value:    { $sum: "$contract_value_pdf" },
          first_seen:     { $min: "$contract_date" },
          last_seen:      { $max: "$contract_date" },
        },
      },
    ], { allowDiskUse: true }).toArray()

    const prospects: ProspectDoc[] = []

    for (const c of gemResellers) {
      const sellingAs = String(c.selling_as || "")

      if (RESELLER_RE.test(sellingAs)) {
        // Reseller or OEM verified Reseller → dealer prospect
        const email  = String(c.seller_email  || "").toLowerCase().trim()
        const mobile = normalizePhone(String(c.seller_phone || ""))
        const gst    = String(c._id || "").replace(/^noGst::/, "").trim().toUpperCase()
        const name   = String(c.seller_name   || "")
        const state  = String(c.seller_state  || "")
        const city   = extractCityFromAddress(String(c.seller_address || ""))
        const score  = calcScore(email, mobile, gst.startsWith("noGst") ? "" : gst, city, "")
        const dk     = dedupKey(email, mobile, gst.startsWith("noGst") ? "" : gst, name, city)

        if (state) stateCount[state] = (stateCount[state] || 0) + 1
        resellerAdded++

        prospects.push({
          dealer_name:      name,
          contact_person:   "",
          mobile,
          email,
          city,
          state,
          gst:              gst.startsWith("noGst") ? "" : gst,
          source:           "gem_contract_reseller",
          source_ref_id:    String(c._id),
          dealer_score:     score,
          status:           "new",
          needs_enrichment: !email || !mobile,
          dedup_key:        dk,
          notes:            `GeM Reseller | Selling As: ${sellingAs} | OEM: ${c.oem_name || "?"} | Contracts: ${c.contracts_won}`,
          gem_gmv:          Number(c.total_value)   || 0,
          gem_contracts:    Number(c.contracts_won) || 0,
          seller_type:      "dealer",
          oem_brand:        String(c.oem_name || ""),
          first_seen:       c.first_seen ? String(c.first_seen) : null,
          last_seen:        c.last_seen  ? String(c.last_seen)  : null,
          is_100x_dealer:   false,
          competes_with_100x: true,
          created_at:       now,
          updated_at:       now,
        })
      } else if (OEM_ONLY_RE.test(sellingAs)) {
        oemSkipped++
      }
      // else: unknown selling_as value — skip silently
    }

    await bulkUpsert(prospects, "gem_contract_resellers")
  } catch (e) {
    results["gem_contract_resellers"] = { processed: 0, inserted: 0, updated: 0 }
    console.error("gem_contract_resellers sync:", e)
  }

  // ── Top states by reseller count ──────────────────────────────────────────
  const topStatesByReseller = Object.entries(stateCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([state, count]) => ({ state, count }))

  // ── Log ───────────────────────────────────────────────────────────────────
  await db.collection("growth_os_logs").insertOne({
    ts:            now,
    agent:         "dealer-prospect-engine",
    action:        "sync_completed",
    totalInserted,
    totalUpdated,
    bySource:      results,
    oemSkipped,
    resellerAdded,
    topStatesByReseller,
    level:         "success",
    module:        "dealers",
  })

  return NextResponse.json({
    ok:                 true,
    totalInserted,
    totalUpdated,
    bySource:           results,
    oemSkipped,
    resellerAdded,
    topStatesByReseller,
    syncedAt:           now,
  })
}
