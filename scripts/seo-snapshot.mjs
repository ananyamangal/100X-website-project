#!/usr/bin/env node
/**
 * SEO regression snapshot tool.
 *
 * Usage:
 *   node scripts/seo-snapshot.mjs snapshot --base http://localhost:3100 --out seo-snapshot-before.json
 *   node scripts/seo-snapshot.mjs diff seo-snapshot-before.json seo-snapshot-after.json
 *
 * `snapshot` mode requires a running `next start` at --base. It reads every
 * <loc> from /sitemap.xml, adds the extra URLs below (paths only — the host
 * from --base is always used, so this works against localhost or prod), and
 * for each one records status, redirect chain, canonical, robots meta,
 * hreflang set, title, meta description, H1, H2 count, internal link count,
 * and a stable hash of every JSON-LD block grouped by @type.
 *
 * `diff` mode prints every field that differs between two snapshot files,
 * plus URLs present in only one of them.
 */
import { createHash } from "node:crypto"
import { writeFileSync, readFileSync } from "node:fs"

// Paths named explicitly in the Sept-2026 fix prompt (Tasks 1, 3, 4, 5) that
// may not already be discoverable purely from the sitemap (e.g. unreviewed
// locale URLs are intentionally excluded from the sitemap).
const EXTRA_PATHS = [
  "/",
  "/blog",
  "/id/fogging-machine-supplier-in-uttar-pradesh",
  "/id/fogging-machine-supplier-in-bihar",
  "/id/thermal-vs-cold-fogging-machine",
  "/stainless-steel-tank-thermal-fogger",
  "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  "/blog/audit-test-f71082",
  "/case-studies",
  "/is-14855-fogging-machine",
  "/spare-parts/thermal-cold-fogging-machine-100xtfs50/fuel-tank-18l-with-fittings",
  "/spare-parts/thermal-cold-fogging-machine-100xtfs50/fuel-tank-cap-with-o-ring",
  "/fogging-machine-government-procurement",
  "/fogging-machine-for-nagar-panchayat",
  "/products",
  "/thermal-and-cold-fogging-machine-100xtfs50",
  "/vehicle-mounted-fogging-machine",
  "/gem-approved-fogging-machine-oem",
  "/nhm-fogging-machine",
  "/contact-us",
]

const CONCURRENCY = 8
const MAX_REDIRECT_HOPS = 6

function sha256(input) {
  return createHash("sha256").update(input).digest("hex").slice(0, 16)
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function extractAll(re, html) {
  const out = []
  let m
  const r = new RegExp(re, "gis")
  while ((m = r.exec(html))) out.push(m)
  return out
}

function parsePage(html, baseOrigin) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? null
  const metaDesc =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ??
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html)?.[1] ??
    null
  const canonical =
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i.exec(html)?.[1] ?? null
  const robots =
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? null
  const hreflangs = extractAll(
    String.raw`<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']*)["'][^>]+href=["']([^"']*)["']`,
    html,
  )
    .map((m) => `${m[1]}=>${m[2]}`)
    .sort()
  // Some pages emit href before hreflang attr order-wise — capture that variant too.
  const hreflangsAlt = extractAll(
    String.raw`<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']*)["'][^>]+hreflang=["']([^"']*)["']`,
    html,
  ).map((m) => `${m[2]}=>${m[1]}`)
  const hreflangSet = Array.from(new Set([...hreflangs, ...hreflangsAlt])).sort()

  const h1s = extractAll(String.raw`<h1[^>]*>([\s\S]*?)<\/h1>`, html).map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim(),
  )
  const h2Count = extractAll(String.raw`<h2[^>]*>`, html).length

  const internalLinks = extractAll(String.raw`<a\s[^>]*href=["']([^"']+)["']`, html)
    .map((m) => m[1])
    .filter((href) => href.startsWith("/") || href.startsWith(baseOrigin))
  const internalLinkCount = internalLinks.length

  const jsonLdBlocks = extractAll(
    String.raw`<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>`,
    html,
  ).map((m) => m[1].trim())

  const byType = {}
  for (const raw of jsonLdBlocks) {
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      byType["__unparsable__"] = byType["__unparsable__"] || []
      byType["__unparsable__"].push(sha256(raw))
      continue
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed]
    for (const node of nodes) {
      const type = Array.isArray(node?.["@type"])
        ? node["@type"].join("+")
        : node?.["@type"] || "Unknown"
      byType[type] = byType[type] || []
      byType[type].push(sha256(stableStringify(node)))
    }
  }
  for (const type of Object.keys(byType)) byType[type].sort()

  return {
    title,
    metaDescription: metaDesc,
    canonical,
    robots,
    hreflang: hreflangSet,
    h1s,
    h2Count,
    internalLinkCount,
    jsonLdByType: byType,
  }
}

// Dev-mode SSR compiles routes on demand, so a cold first hit can be slow —
// but a request that never returns must not stall the whole run.
const FETCH_TIMEOUT_MS = 120_000
// After this many connection-level failures in a row the server is assumed
// dead: stop early (remaining paths stay "pending") so the caller can restart
// it and resume with --retry-errors instead of waiting out every retry.
const MAX_CONSECUTIVE_FAILURES = 6
const PENDING = "pending"

async function followRedirects(url) {
  const chain = []
  let current = url
  for (let i = 0; i < MAX_REDIRECT_HOPS; i++) {
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    chain.push({ url: current, status: res.status })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      if (!loc) break
      current = new URL(loc, current).toString()
      continue
    }
    return { chain, finalUrl: current, finalStatus: res.status }
  }
  return { chain, finalUrl: current, finalStatus: chain[chain.length - 1]?.status ?? 0 }
}

async function snapshotOne(baseUrl, path) {
  let last
  for (let attempt = 0; attempt < 3; attempt++) {
    last = await snapshotOnce(baseUrl, path)
    if (!last.error) return last
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
  return last
}

async function snapshotOnce(baseUrl, path) {
  const url = new URL(path, baseUrl).toString()
  const origin = new URL(baseUrl).origin
  try {
    const { chain, finalUrl, finalStatus } = await followRedirects(url)
    let page = null
    if (finalStatus === 200) {
      const res = await fetch(finalUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      const html = await res.text()
      page = parsePage(html, origin)
    }
    return {
      path,
      status: chain[0].status,
      redirectChain: chain.map((c) => `${c.status} ${c.url}`),
      finalUrl: finalUrl.replace(origin, ""),
      finalStatus,
      ...page,
    }
  } catch (err) {
    return { path, error: String(err?.message || err) }
  }
}

async function pool(items, worker, concurrency) {
  const results = new Array(items.length)
  let idx = 0
  async function run() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run))
  return results
}

async function getSitemapPaths(baseUrl) {
  const res = await fetch(new URL("/sitemap.xml", baseUrl).toString())
  if (!res.ok) return []
  const xml = await res.text()
  const locs = extractAll(String.raw`<loc>([^<]+)<\/loc>`, xml).map((m) => m[1])
  return locs.map((l) => {
    try {
      return new URL(l).pathname
    } catch {
      return l
    }
  })
}

async function cmdSnapshot(args) {
  const base = args["--base"] || "http://localhost:3100"
  const out = args["--out"] || "seo-snapshot.json"
  console.log(`[seo-snapshot] base=${base}`)

  // --retry-errors <file>: re-fetch only the paths that errored in an
  // existing snapshot (e.g. the server fell over mid-run) and merge in place.
  let byPath = {}
  let allPaths
  if (args["--retry-errors"]) {
    byPath = JSON.parse(readFileSync(args["--retry-errors"], "utf8")).pages
    allPaths = Object.values(byPath).filter((p) => p.error).map((p) => p.path)
    console.log(`[seo-snapshot] retrying ${allPaths.length} errored/pending paths`)
  } else if (args["--paths"]) {
    // --paths /a,/b: targeted run for a quick per-task check (no sitemap crawl).
    allPaths = args["--paths"].split(",").map((p) => p.trim()).filter(Boolean)
    console.log(`[seo-snapshot] ${allPaths.length} explicit paths`)
  } else {
    const sitemapPaths = await getSitemapPaths(base)
    allPaths = Array.from(new Set([...sitemapPaths, ...EXTRA_PATHS]))
    console.log(`[seo-snapshot] ${sitemapPaths.length} sitemap URLs + extras => ${allPaths.length} total`)
  }

  // Every path is recorded up front as "pending" and the file is flushed as
  // results land, so a crashed run (server or this script) is resumable with
  // --retry-errors rather than starting over.
  for (const p of allPaths) if (!byPath[p] || byPath[p].error) byPath[p] = { path: p, error: PENDING }
  const flush = () =>
    writeFileSync(out, JSON.stringify({ base, generatedAt: new Date().toISOString(), pages: byPath }, null, 2))
  flush()

  const concurrency = Number(args["--concurrency"]) || CONCURRENCY
  let consecutiveFailures = 0
  let done = 0
  let aborted = false
  await pool(
    allPaths,
    async (p) => {
      if (aborted) return
      const r = await snapshotOne(base, p)
      byPath[p] = r
      consecutiveFailures = r.error ? consecutiveFailures + 1 : 0
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !aborted) {
        aborted = true
        console.log(`[seo-snapshot] ${consecutiveFailures} consecutive failures — server looks down, stopping early`)
      }
      if (++done % 10 === 0) {
        flush()
        console.log(`[seo-snapshot] ${done}/${allPaths.length}`)
      }
    },
    concurrency,
  )
  flush()
  const stillFailing = Object.values(byPath).filter((p) => p.error).length
  console.log(`[seo-snapshot] ${stillFailing} paths still erroring/pending`)
  console.log(`[seo-snapshot] wrote ${out} (${Object.keys(byPath).length} pages)`)
  if (aborted) process.exitCode = 2
}

function diffPages(before, after, path) {
  const diffs = []
  const fields = [
    "status",
    "finalUrl",
    "finalStatus",
    "title",
    "metaDescription",
    "canonical",
    "robots",
  ]
  for (const f of fields) {
    if (JSON.stringify(before?.[f]) !== JSON.stringify(after?.[f])) {
      diffs.push({ field: f, before: before?.[f], after: after?.[f] })
    }
  }
  if (JSON.stringify(before?.hreflang) !== JSON.stringify(after?.hreflang)) {
    diffs.push({ field: "hreflang", before: before?.hreflang, after: after?.hreflang })
  }
  if (JSON.stringify(before?.h1s) !== JSON.stringify(after?.h1s)) {
    diffs.push({ field: "h1s", before: before?.h1s, after: after?.h1s })
  }
  if (before?.h2Count !== after?.h2Count) {
    diffs.push({ field: "h2Count", before: before?.h2Count, after: after?.h2Count })
  }
  if (before?.internalLinkCount !== after?.internalLinkCount) {
    diffs.push({
      field: "internalLinkCount",
      before: before?.internalLinkCount,
      after: after?.internalLinkCount,
    })
  }
  const beforeTypes = new Set(Object.keys(before?.jsonLdByType || {}))
  const afterTypes = new Set(Object.keys(after?.jsonLdByType || {}))
  const allTypes = new Set([...beforeTypes, ...afterTypes])
  for (const t of allTypes) {
    const b = JSON.stringify(before?.jsonLdByType?.[t] || null)
    const a = JSON.stringify(after?.jsonLdByType?.[t] || null)
    if (b !== a) {
      diffs.push({ field: `jsonLd:${t}`, before: before?.jsonLdByType?.[t] || null, after: after?.jsonLdByType?.[t] || null })
    }
  }
  return diffs
}

function cmdDiff(args, positional) {
  const [beforeFile, afterFile] = positional
  if (!beforeFile || !afterFile) {
    console.error("Usage: node scripts/seo-snapshot.mjs diff <before.json> <after.json>")
    process.exit(1)
  }
  const before = JSON.parse(readFileSync(beforeFile, "utf8"))
  const after = JSON.parse(readFileSync(afterFile, "utf8"))
  const beforePaths = new Set(Object.keys(before.pages))
  const afterPaths = new Set(Object.keys(after.pages))

  const onlyBefore = [...beforePaths].filter((p) => !afterPaths.has(p))
  const onlyAfter = [...afterPaths].filter((p) => !beforePaths.has(p))
  const shared = [...beforePaths].filter((p) => afterPaths.has(p))

  const report = { onlyInBefore: onlyBefore, onlyInAfter: onlyAfter, changed: {} }
  for (const p of shared) {
    const d = diffPages(before.pages[p], after.pages[p], p)
    if (d.length) report.changed[p] = d
  }

  console.log(JSON.stringify(report, null, 2))
  const changedCount = Object.keys(report.changed).length
  console.log(
    `\n[seo-snapshot diff] onlyInBefore=${onlyBefore.length} onlyInAfter=${onlyAfter.length} changedPages=${changedCount}`,
  )
}

function parseArgs(argv) {
  const args = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i]] = argv[i + 1]
      i++
    } else {
      positional.push(argv[i])
    }
  }
  return { args, positional }
}

const [, , mode, ...rest] = process.argv
const { args, positional } = parseArgs(rest)

if (mode === "snapshot") {
  await cmdSnapshot(args)
} else if (mode === "diff") {
  cmdDiff(args, positional)
} else {
  console.error("Usage:\n  node scripts/seo-snapshot.mjs snapshot --base <url> --out <file>\n  node scripts/seo-snapshot.mjs diff <before.json> <after.json>")
  process.exit(1)
}
