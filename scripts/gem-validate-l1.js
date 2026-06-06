"use strict";
/**
 * gem-validate-l1.js
 *
 * P0 Data Integrity Validation
 * Fetches a sample of bids from gem_awarded_bids, re-extracts L1/L2/L3 with
 * a FIXED parser (reads Financial Evaluation section only), then compares
 * stored values against correctly extracted values.
 *
 * Usage:
 *   node scripts/gem-validate-l1.js [--limit N] [--variant VARIANT] [--repair]
 *
 * Options:
 *   --limit N      Validate N bids (default: 100)
 *   --variant V    Filter by variant (D-PMA-Awarded, C-RA-Awarded, A-ProductTable)
 *   --repair       Actually update the DB with corrected values (default: dry-run)
 *
 * Output:
 *   Accuracy report printed to stdout.
 *   Full diff written to audit/l1-validation-YYYY-MM-DD.json
 */

const https = require("https")
const http  = require("http")
const fs    = require("fs")
const path  = require("path")
const { MongoClient } = require("mongodb")

// ─── Env ─────────────────────────────────────────────────────────────────────

let MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  const envPath = path.join(__dirname, "..", ".env.local")
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...v] = line.split("=")
    if (k?.trim() === "MONGODB_URI") { MONGODB_URI = v.join("=").trim(); break }
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2)
const LIMIT    = parseInt(args[args.indexOf("--limit") + 1] || "100")
const VARIANT  = args[args.indexOf("--variant") + 1] || null
const REPAIR   = args.includes("--repair")
const DELAY_MS = 600  // ms between fetches

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function fetchPage(url, depth = 0) {
  if (depth > 5) return Promise.reject(new Error("too many redirects"))
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http
    const req = lib.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml;q=0.9",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://bidplus.gem.gov.in/all-bids",
      }
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).toString()
        res.resume()
        return resolve(fetchPage(loc, depth + 1))
      }
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

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Parser helpers ───────────────────────────────────────────────────────────

const STATUS_WORDS = new Set(["qualified","disqualified","not evaluated","under pma","mse","mii","startup"])
function isStatusWord(s) {
  const l = (s || "").toLowerCase().trim()
  return STATUS_WORDS.has(l) || l.length < 3
}

function canonicalize(name) {
  if (!name) return null
  return name
    .toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * FIXED version: slices HTML at "FINANCIAL EVALUATION" before parsing rows.
 * This prevents Technical Evaluation rank numbers from overriding Financial Evaluation.
 */
function extractRankedBiddersFixed(html) {
  // Only parse from Financial Evaluation section if it exists
  const finIdx = html.indexOf("FINANCIAL EVALUATION")
  const htmlToUse = finIdx > -1 ? html.slice(finIdx) : html

  const rankMap = {}
  const rowPat  = /<tr[^>]*>\s*<td[^>]*class="productDtl"[^>]*>(\d+)<\/td>([\s\S]*?)<\/tr>/gi
  let m
  while ((m = rowPat.exec(htmlToUse)) !== null) {
    const rank = parseInt(m[1])
    if (rankMap[rank]) continue
    const cell  = m[2]
    const clean = cell.replace(/<span[^>]+class="[^"]*label[^"]*"[^>]*>[^<]*<\/span>/gi, "")
    const rawName =
      clean.match(/<span[^>]*class="cid"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim() ||
      clean.match(/<span[^>]*style="[^"]*font-size:\s*12px[^"]*"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim()
    if (!rawName || isStatusWord(rawName)) continue
    const name  = rawName.replace(/\s+/g, " ").slice(0, 80).trim()
    const price =
      clean.match(/<span[^>]*class="bid_price"[^>]*>\s*([\d,]+\.\d{2})/i)?.[1] ||
      clean.match(/([\d]{4,}[,\d]*\.\d{2})/)?.[1] || null
    rankMap[rank] = { name, price }
  }
  return rankMap
}

/**
 * BUGGY version (current): reads all productDtl rows in document order.
 * Technical Evaluation rows come first — their ranks fill the map.
 */
function extractRankedBiddersBuggy(html) {
  const rankMap = {}
  const rowPat  = /<tr[^>]*>\s*<td[^>]*class="productDtl"[^>]*>(\d+)<\/td>([\s\S]*?)<\/tr>/gi
  let m
  while ((m = rowPat.exec(html)) !== null) {
    const rank = parseInt(m[1])
    if (rankMap[rank]) continue
    const cell  = m[2]
    const clean = cell.replace(/<span[^>]+class="[^"]*label[^"]*"[^>]*>[^<]*<\/span>/gi, "")
    const rawName =
      clean.match(/<span[^>]*class="cid"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim() ||
      clean.match(/<span[^>]*style="[^"]*font-size:\s*12px[^"]*"[^>]*>\s*([^\n<]{2,})/i)?.[1]?.trim()
    if (!rawName || isStatusWord(rawName)) continue
    const name  = rawName.replace(/\s+/g, " ").slice(0, 80).trim()
    const price =
      clean.match(/<span[^>]*class="bid_price"[^>]*>\s*([\d,]+\.\d{2})/i)?.[1] ||
      clean.match(/([\d]{4,}[,\d]*\.\d{2})/)?.[1] || null
    rankMap[rank] = { name, price }
  }
  return rankMap
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db  = client.db()
  const col = db.collection("gem_awarded_bids")

  const query = VARIANT ? { variant: VARIANT } : {}
  const allBids = await col.find(query, {
    projection: { bid_number: 1, page_id: 1, variant: 1, l1_name: 1, l2_name: 1, l3_name: 1 },
    sort: { variant: 1 }   // D-PMA first
  }).limit(LIMIT).toArray()

  console.log(`\n${"═".repeat(65)}`)
  console.log(` GeM L1/L2/L3 Parser Validation`)
  console.log(`${"═".repeat(65)}`)
  console.log(` Bids to validate: ${allBids.length}`)
  console.log(` Variant filter:   ${VARIANT || "all"}`)
  console.log(` Mode:             ${REPAIR ? "REPAIR (will update DB)" : "DRY RUN"}`)
  console.log(`${"═".repeat(65)}\n`)

  const results = []
  let correct = 0, mismatch_l1 = 0, empty_fix = 0, fetch_fail = 0

  for (let i = 0; i < allBids.length; i++) {
    const bid  = allBids[i]
    const url  = `https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/${bid.page_id}`
    process.stdout.write(`  [${String(i+1).padStart(3)}/${allBids.length}] ${bid.bid_number.slice(-12).padEnd(12)} ${bid.variant || "?"} `)

    const html = await fetchPage(url)
    if (!html) {
      process.stdout.write("FETCH FAIL\n")
      fetch_fail++
      results.push({ bid_number: bid.bid_number, variant: bid.variant, status: "fetch_fail" })
      await delay(DELAY_MS)
      continue
    }

    const fixedMap = extractRankedBiddersFixed(html)
    const buggyMap = extractRankedBiddersBuggy(html)

    const fixedL1 = fixedMap[1]?.name || null
    const fixedL2 = fixedMap[2]?.name || null
    const fixedL3 = fixedMap[3]?.name || null
    const buggyL1 = buggyMap[1]?.name || null

    const storedL1  = bid.l1_name || null
    const storedC   = canonicalize(storedL1)
    const fixedC    = canonicalize(fixedL1)
    const buggyC    = canonicalize(buggyL1)

    const l1_changed = fixedC !== storedC
    const buggy_correct = buggyC === storedC  // confirms DB was written by buggy parser

    let status
    if (!fixedL1) {
      status = "fix_empty"
      empty_fix++
    } else if (!l1_changed) {
      status = "correct"
      correct++
    } else {
      status = "mismatch"
      mismatch_l1++
    }

    process.stdout.write(`${status} | stored="${(storedL1 || "").slice(0,25)}" fix="${(fixedL1||"").slice(0,25)}"\n`)

    results.push({
      bid_number: bid.bid_number,
      page_id:    bid.page_id,
      variant:    bid.variant,
      status,
      stored_l1:  storedL1,
      stored_l2:  bid.l2_name || null,
      stored_l3:  bid.l3_name || null,
      fixed_l1:   fixedL1,
      fixed_l2:   fixedL2,
      fixed_l3:   fixedL3,
      buggy_l1:   buggyL1,
      buggy_matched_stored: buggy_correct,
    })

    if (REPAIR && status === "mismatch" && fixedL1) {
      await col.updateOne(
        { bid_number: bid.bid_number },
        { $set: {
          l1_name: fixedL1,
          l2_name: fixedL2 || null,
          l3_name: fixedL3 || null,
          l1_repaired_at: new Date(),
          l1_was: storedL1,
        }}
      )
    }

    await delay(DELAY_MS)
  }

  // ─── Summary ────────────────────────────────────────────────────────────────

  const total = allBids.length
  const accuracy_before = ((correct + empty_fix) / total * 100).toFixed(1)
  const accuracy_after  = ((correct + empty_fix + mismatch_l1) / total * 100).toFixed(1)

  console.log(`\n${"═".repeat(65)}`)
  console.log(` AUDIT REPORT`)
  console.log(`${"═".repeat(65)}`)
  console.log(` Total validated:      ${total}`)
  console.log(` Correct (unchanged):  ${correct}       (${(correct/total*100).toFixed(1)}%)`)
  console.log(` L1 mismatch (wrong):  ${mismatch_l1}      (${(mismatch_l1/total*100).toFixed(1)}%)`)
  console.log(` Fix returned empty:   ${empty_fix}      (${(empty_fix/total*100).toFixed(1)}%)`)
  console.log(` Fetch failures:       ${fetch_fail}`)
  console.log(``)
  console.log(` Accuracy BEFORE fix:  ${accuracy_before}%`)
  console.log(` Accuracy AFTER fix:   ${accuracy_after}%  (if fix_empty are actually correct)`)
  console.log(`${"═".repeat(65)}`)

  // Mismatches detail
  const mismatches = results.filter(r => r.status === "mismatch")
  if (mismatches.length > 0) {
    console.log(`\n Top mismatches (stored wrong L1 → corrected):`)
    for (const r of mismatches.slice(0, 20)) {
      console.log(`  ${r.bid_number}  [${r.variant}]`)
      console.log(`    stored:  ${r.stored_l1 || "(empty)"}`)
      console.log(`    correct: ${r.fixed_l1}`)
    }
  }

  // Write full JSON audit
  const auditDir  = path.join(__dirname, "..", "audit")
  const today     = new Date().toISOString().slice(0, 10)
  const auditFile = path.join(auditDir, `l1-validation-${today}.json`)
  if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true })
  fs.writeFileSync(auditFile, JSON.stringify({
    run_at: new Date().toISOString(),
    mode: REPAIR ? "repair" : "dry_run",
    limit: LIMIT,
    variant_filter: VARIANT,
    summary: { total, correct, mismatch_l1, empty_fix, fetch_fail, accuracy_before, accuracy_after },
    results,
  }, null, 2))
  console.log(`\n Full audit saved to: ${auditFile}`)

  await client.close()
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1) })
