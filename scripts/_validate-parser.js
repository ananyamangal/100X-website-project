"use strict"
/**
 * _validate-parser.js
 * Finds the BidPlus page IDs for known fogging bid numbers via binary search,
 * fetches their pages, and runs them through the full parser pipeline.
 * Reports raw extracted text, field extraction, and classification result.
 */

const https = require("https")
const http  = require("http")

const DETAIL_BASE = "https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/"

const TARGET_BIDS = [
  "GEM/2026/B/7541840",
  "GEM/2026/B/7555803",
  "GEM/2026/B/7568082",
]

// ─── HTTP fetch ───────────────────────────────────────────────────────────────

function fetchPage(id) {
  return new Promise((resolve) => {
    const url = `${DETAIL_BASE}${id}`
    const mod = https
    const options = {
      timeout: 12000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://bidplus.gem.gov.in/all-bids",
      }
    }
    const req = mod.get(url, options, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null) }
      const chunks = []
      res.on("data", c => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      res.on("error", () => resolve(null))
    })
    req.on("error", () => resolve(null))
    req.on("timeout", () => { req.destroy(); resolve(null) })
  })
}

// ─── HTML → text ──────────────────────────────────────────────────────────────

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|td|th|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

// ─── Fogging classifier (same as gem-harvest.js) ──────────────────────────────

const KEYWORDS = ["fogging", "fogger", "fog machine", "thermal fog", "cold fog"]
const SELLER_LINE_RE = /[^\n]*\b(?:PRIVATE\s+LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LLP|ENTERPRISES|INDUSTRIES|TRADERS|AGENCIES|ELECTRICALS?|SOLUTIONS?|SYSTEMS?|CORPORATION|CORP\.?)\b[^\n]*/gi

function isFogging(text) {
  if (!KEYWORDS.some(k => text.toLowerCase().includes(k))) return false
  const stripped = text.replace(SELLER_LINE_RE, " ")
  return KEYWORDS.some(k => stripped.toLowerCase().includes(k))
}

function keywordHits(text) {
  const lower = text.toLowerCase()
  const hits = KEYWORDS.filter(k => lower.includes(k))
  const stripped = text.replace(SELLER_LINE_RE, " ").toLowerCase()
  const hitsAfterStrip = KEYWORDS.filter(k => stripped.includes(k))
  return { before: hits, afterSellerStrip: hitsAfterStrip }
}

// ─── Parser (same as gem-harvest.js) ─────────────────────────────────────────

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand",
  "Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a,b) => b.length - a.length)

function first(t, ...ps) {
  for (const p of ps) { const m = t.match(p); if (m?.[1]?.trim()) return m[1].trim() }
  return null
}
function cleanMoney(s) {
  const n = Number(String(s).replace(/[₹,\s]/g,"").replace(/\.\d+$/,""))
  return isNaN(n) || n <= 0 ? null : n
}
function normDate(s) {
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : s
}

function parseBid(text, numericId) {
  const bidMatch = text.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)
  if (!bidMatch) return null
  const bid_number = bidMatch[1].toUpperCase()

  let state = ""
  for (const s of STATES) { if (new RegExp(`\\b${s}\\b`,"i").test(text)) { state = s; break } }

  const dept = (first(text,
    /(?:Buyer(?:\s+Name)?|Organisation\s+Name|Consignee\s+Org)\s*[:\-]\s*([^\n]+)/i,
    /(?:Department)\s*[:\-]\s*([^\n]+)/i,
  ) || "").replace(/\s+/g," ").trim()

  const COMPANY_RE = /\b(?:PRIVATE\s+LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LLP|ENTERPRISES|INDUSTRIES|TRADERS|AGENCIES)\b/i
  const productLine = (() => {
    const labeled = first(text,
      /(?:Item(?:\s+Description)?|Product(?:\s+(?:Description|Name))?)\s*[:\-]\s*([^\n]{3,80})/i,
      /(?:Item|Product)\s*[:\-]\s*([^\n]{3,80})/i,
    )
    if (labeled && !COMPANY_RE.test(labeled)) return labeled.trim()
    const kw = first(text,
      /(Fogging Machine[^\n]{0,80})/i,
      /((?:Thermal\s+)?Fogger[^\n]{0,60})/i,
    )
    if (kw && !COMPANY_RE.test(kw)) return kw.trim()
    return ""
  })()

  const cat = (() => {
    const l = (productLine || text).toLowerCase()
    if (/vehicle.{0,20}fog|truck.{0,20}fog/.test(l)) return "vehicle_fogger"
    if (/mini.{0,10}fog/.test(l)) return "mini_fogger"
    return "thermal_fogger"
  })()

  const qty = text.match(/(\d+)\s*(?:Nos?|nos?|Units?)\b/)?.[1]
  const DR  = "(?:(?:\\d{1,2})[-\\/](?:\\d{1,2})[-\\/](?:\\d{4}))"
  const pd  = first(text, new RegExp(`(?:Bid\\s*(?:Publish|Start)\\s*Date)[:\\-\\s]+(${DR})`,"i"))
  const ed  = first(text, new RegExp(`(?:Bid\\s*(?:End|Close)\\s*Date)[:\\-\\s]+(${DR})`,"i"))
  const ad  = first(text, new RegExp(`(?:Award\\s*Date|RA\\s*Concluded)[:\\-\\s]+(${DR})`,"i"))
  const status = (() => {
    if (/L[-\s]?1\s*(Bidder|Firm)/i.test(text)) return "awarded"
    const s = (first(text,/(?:Bid\s*Status)\s*[:\-]\s*([^\n,]{1,30})/i)||"").toLowerCase()
    if (/award|conclud/.test(s)) return "awarded"
    if (/financial/.test(s)) return "financial_eval"
    if (/technical/.test(s)) return "technical_eval"
    if (/cancel/.test(s)) return "cancelled"
    return "published"
  })()
  const l1n = (first(text, /L[-\s]?1\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i)||"").replace(/\s+/g," ")
  const l1p = (() => { const v = first(text, /L[-\s]?1[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l2n = (first(text, /L[-\s]?2\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i)||"").replace(/\s+/g," ")
  const l2p = (() => { const v = first(text, /L[-\s]?2[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l3n = (first(text, /L[-\s]?3\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i)||"").replace(/\s+/g," ")
  const l3p = (() => { const v = first(text, /L[-\s]?3[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const bdr = first(text, /(?:Total\s*(?:No\.?\s*of\s*)?Bidders?)[:\-\s]+(\d+)/i)
  const est = (() => { const m = text.match(/(?:Total\s*Estimated|Consignee\s*Estimated)[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i); return m ? cleanMoney(m[1]) : null })()

  return {
    bid_number, department_name: dept, state,
    product_category: cat, product_name_raw: productLine,
    quantity: qty ? parseInt(qty) : null, estimated_value_inr: est,
    current_status: status,
    publish_date: pd ? normDate(pd) : null,
    bid_end_date:  ed ? normDate(ed) : null,
    award_date:    ad ? normDate(ad) : null,
    l1_dealer_name: l1n, l1_price_inr: l1p,
    l2_dealer_name: l2n, l2_price_inr: l2p,
    l3_dealer_name: l3n, l3_price_inr: l3p,
    total_bidders_count: bdr ? parseInt(bdr) : null,
  }
}

// ─── Binary search for a known bid number ────────────────────────────────────
// Uses the offset relationship: pageId ≈ bidSeq + 1,776,000-1,797,000
// Calibration points (Apr 2026 offset=1,776,278; May-Jun 2026 offset=1,796,745)

async function findBidPageId(targetBidNum) {
  const parts = targetBidNum.split("/")
  const targetType = parts[2]  // "B" or "R"
  const targetSeq  = parseInt(parts[3])

  // Calibration: B-type only (R-type bids have a completely different seq number series)
  const CAL_A = { seq: 7_423_722, pageId: 9_200_000 }  // Apr 8, 2026  GEM/2026/B/7423722
  const CAL_B = { seq: 7_603_255, pageId: 9_400_000 }  // May-Jun 2026 GEM/2026/B/7603255
  const frac = Math.max(0, Math.min(1, (targetSeq - CAL_A.seq) / (CAL_B.seq - CAL_A.seq)))
  const estOffset = CAL_A.pageId - CAL_A.seq + frac * ((CAL_B.pageId - CAL_B.seq) - (CAL_A.pageId - CAL_A.seq))
  const estPageId = Math.round(targetSeq + estOffset)

  // Direct probe: the estimate should be within ~500 IDs (verified by probe points).
  // Use binary search but ONLY use pages whose bid type matches target type for comparison.
  let lo = estPageId - 1500
  let hi = estPageId + 500
  let attempts = 0
  let lastB = null  // track last valid B-type page found

  while (lo <= hi && attempts < 120) {
    attempts++
    const mid = Math.floor((lo + hi) / 2)
    const html = await fetchPage(mid)
    if (!html || html.length < 200) { lo = mid + 1; continue }

    const m = html.match(/\b(GEM\/\d{4}\/([A-Z]+)\/(\d+))\b/i)
    if (!m) { lo = mid + 1; continue }

    const foundFull = m[1].toUpperCase()
    const foundType = m[2].toUpperCase()
    const foundSeq  = parseInt(m[3])

    if (foundFull === targetBidNum.toUpperCase()) return { pageId: mid, html, attempts }

    // Only use same-type pages for directional navigation
    if (foundType !== targetType) {
      // R-type page in a B-type search — skip directionally but record for context
      lo = mid + 1
      continue
    }

    lastB = { pageId: mid, seq: foundSeq }
    if (foundSeq < targetSeq) lo = mid + 1
    else hi = mid - 1
  }

  // Fallback: linear scan ±600 from estimate
  for (let id = estPageId - 600; id <= estPageId + 200; id++) {
    attempts++
    const html = await fetchPage(id)
    if (!html) continue
    const m = html.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)
    if (!m) continue
    if (m[1].toUpperCase() === targetBidNum.toUpperCase()) return { pageId: id, html, attempts }
  }

  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  const LINE = "═".repeat(70)
  console.log(`\n${LINE}`)
  console.log(` GeM Parser Validation — Known Fogging Bids`)
  console.log(` Testing: ${TARGET_BIDS.join(", ")}`)
  console.log(`${LINE}\n`)

  for (const bidNum of TARGET_BIDS) {
    console.log(`\n${"─".repeat(70)}`)
    console.log(` Searching for: ${bidNum}`)

    const result = await findBidPageId(bidNum)

    if (!result) {
      console.log(` ✗ NOT FOUND (bid may be in different ID range or page structure changed)`)
      continue
    }

    const { pageId, html, attempts } = result
    console.log(` ✓ Found at page ID: ${pageId.toLocaleString()} (${attempts} fetch attempts)`)

    const text = htmlToText(html)

    // ── Keyword analysis ─────────────────────────────────────────────────────
    const kw = keywordHits(text)
    const classified = isFogging(text)

    console.log(`\n ── Keyword Analysis ──`)
    console.log(`   Keywords found (raw):         ${kw.before.length > 0 ? kw.before.join(", ") : "NONE"}`)
    console.log(`   Keywords after seller strip:  ${kw.afterSellerStrip.length > 0 ? kw.afterSellerStrip.join(", ") : "NONE"}`)
    console.log(`   isFogging() result:           ${classified ? "✓ FOGGING BID" : "✗ NOT classified as fogging"}`)

    // ── Parsed fields ────────────────────────────────────────────────────────
    const parsed = parseBid(text, String(pageId))
    if (parsed) {
      console.log(`\n ── Parsed Fields ──`)
      console.log(`   bid_number:           ${parsed.bid_number}`)
      console.log(`   product_name_raw:     ${parsed.product_name_raw || "(empty)"}`)
      console.log(`   product_category:     ${parsed.product_category}`)
      console.log(`   department_name:      ${parsed.department_name || "(empty)"}`)
      console.log(`   state:                ${parsed.state || "(empty)"}`)
      console.log(`   quantity:             ${parsed.quantity ?? "(null)"}`)
      console.log(`   estimated_value_inr:  ${parsed.estimated_value_inr?.toLocaleString("en-IN") ?? "(null)"}`)
      console.log(`   current_status:       ${parsed.current_status}`)
      console.log(`   publish_date:         ${parsed.publish_date ?? "(null)"}`)
      console.log(`   bid_end_date:         ${parsed.bid_end_date ?? "(null)"}`)
      console.log(`   l1_dealer_name:       ${parsed.l1_dealer_name || "(empty)"}`)
      console.log(`   l1_price_inr:         ${parsed.l1_price_inr?.toLocaleString("en-IN") ?? "(null)"}`)
      console.log(`   l2_dealer_name:       ${parsed.l2_dealer_name || "(empty)"}`)
      console.log(`   l3_dealer_name:       ${parsed.l3_dealer_name || "(empty)"}`)
      console.log(`   total_bidders_count:  ${parsed.total_bidders_count ?? "(null)"}`)
    } else {
      console.log(`\n ── Parser returned null (bid number regex may not have matched) ──`)
    }

    // ── Relevant raw text lines (fogging context) ─────────────────────────────
    const relevantLines = text.split("\n")
      .map(l => l.trim()).filter(Boolean)
      .filter(l => KEYWORDS.some(k => l.toLowerCase().includes(k)) ||
                   /item|product|category|item desc/i.test(l))
      .slice(0, 20)

    console.log(`\n ── Raw Text Lines Containing Keywords or Item Labels (first 20) ──`)
    if (relevantLines.length === 0) {
      console.log(`   (no lines found — keyword may only appear in stripped seller lines)`)
    } else {
      relevantLines.forEach(l => console.log(`   ${l.slice(0, 120)}`))
    }
  }

  console.log(`\n${LINE}`)
  console.log(` Validation complete.`)
  console.log(`${LINE}\n`)
})()
