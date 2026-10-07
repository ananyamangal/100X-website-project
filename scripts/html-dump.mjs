#!/usr/bin/env node
/**
 * Dumps raw HTML + response headers for a fixed sample of public URLs so two
 * builds can be compared byte-for-byte and DOM-for-DOM.
 *
 * Usage:
 *   node scripts/html-dump.mjs dump --base http://localhost:3100 --out reports/x/html-before
 *   node scripts/html-dump.mjs compare reports/x/html-before reports/x/html-after
 *
 * `dump` reads /sitemap.xml from --base, picks the first two URLs under each
 * dynamic prefix (blog, knowledge, case-studies, spare-parts, compare,
 * products) and adds the fixed list below. Redirect probes are fetched with
 * redirect:"manual" so the status + Location header are recorded as-is.
 *
 * `compare` reports, per URL: status/location/x-robots-tag differences, any
 * difference in the <head> tag set (title, meta, link, JSON-LD), any
 * difference in visible body text, and whether the raw bytes are identical.
 * Cache-Control and streaming markers are reported separately because they
 * are expected to change when a page moves from dynamic to ISR.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"

const FIXED = [
  "/",
  "/about",
  "/contact-us",
  "/products",
  "/blog",
  "/knowledge",
  "/case-studies",
  "/spare-parts",
  "/compare",
  "/videos",
  "/deployments",
  "/privacy-policy",
  "/become-a-dealer",
  "/dealer-program",
  "/thermal-and-cold-fogging-machine-100xtfs50",
  "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  "/gem-approved-fogging-machine-oem",
  "/fogging-machine-buying-guide",
  "/fogging-machine-supplier-in-bihar",
  "/hi/fogging-machine-supplier-in-bihar",
  "/id/thermal-vs-cold-fogging-machine",
  "/hi/blog",
  "/vehicle-mounted-fogging-machine",
  "/fogging-machine-government-procurement",
  "/nhm-fogging-machine",
  "/is-14855-fogging-machine",
  "/ai/product-catalog",
  "/ai/about-100x",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/llms.txt",
  "/this-url-does-not-exist-404",
  "/foo/bar-does-not-exist",
  "/zz/blog",
  "/admin/login",
  "/admin",
  "/api/video-popup",
  "/api/rfq-popup/config",
  "/api/seo/page-overrides?path=/",
  "/api/i18n/available-locales?pathname=/blog",
  "/api/redirects/active",
  "/api/merchant/products.xml",
]

const REDIRECT_PROBES = [
  "/contact",
  "/products/100xtfs50",
  "/products/tfs50",
  "/cold-fogging-machine",
  "/en/blog",
  "/en/fogging-machine-buying-guide",
  "/100xdb400-double-barrel-thermal-fogging-machine-vehicle-mountable",
]

const PREFIXES = ["/blog/", "/knowledge/", "/case-studies/", "/spare-parts/", "/compare/", "/products/", "/hi/", "/id/"]

function fileName(path) {
  return path.replace(/^\//, "").replace(/[^a-zA-Z0-9._-]+/g, "_") || "root"
}

async function pickFromSitemap(base) {
  const res = await fetch(`${base}/sitemap.xml`)
  const xml = await res.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  const picked = []
  for (const p of PREFIXES) {
    const matches = locs.filter((l) => l.startsWith(p) && l !== p)
    picked.push(...matches.slice(0, 2))
  }
  return picked
}

async function dump(base, out) {
  mkdirSync(out, { recursive: true })
  const fromSitemap = await pickFromSitemap(base)
  const urls = [...new Set([...FIXED, ...fromSitemap])]
  const index = []
  for (const path of urls) {
    const res = await fetch(base + path, { redirect: "manual", headers: { "user-agent": "html-dump/1" } })
    const body = await res.text()
    const headers = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    const name = fileName(path)
    writeFileSync(join(out, `${name}.body`), body)
    writeFileSync(join(out, `${name}.meta.json`), JSON.stringify({ path, status: res.status, headers }, null, 2))
    index.push({ path, status: res.status, bytes: body.length, cacheControl: headers["cache-control"] ?? null })
    console.log(`${res.status} ${path} (${body.length} bytes) cc=${headers["cache-control"] ?? "-"}`)
  }
  for (const path of REDIRECT_PROBES) {
    const res = await fetch(base + path, { redirect: "manual" })
    const name = `redirect__${fileName(path)}`
    const headers = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    writeFileSync(join(out, `${name}.meta.json`), JSON.stringify({ path, status: res.status, headers }, null, 2))
    index.push({ path, status: res.status, location: headers.location ?? null, redirectProbe: true })
    console.log(`${res.status} ${path} -> ${headers.location ?? "-"}`)
  }
  writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2))
}

// ── compare ────────────────────────────────────────────────────────────────
function headTags(html) {
  // Scanned over the whole document, not just <head>: a dynamically streamed
  // page emits route metadata (canonical, hreflang, og:*, icons) further down
  // the body and React hoists it into <head> on the client, whereas a
  // prerendered page has it in <head> from the start. Same tags either way.
  const tags = []
  for (const m of html.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*>/gi)) tags.push(m[0].trim())
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    tags.push(`ld+json:${m[1].trim()}`)
  }
  // Build-specific asset hashes (webpack runtime chunk, CSS chunk names) are
  // not content; normalise them so only real head changes surface.
  const norm = (t) => t.replace(/\/_next\/static\/(chunks|css)\/[^"]+/g, "/_next/static/$1/HASH")
  // Streaming renders can emit the same preload/link twice; compare as a set.
  return [...new Set(tags.map(norm))].sort()
}

// Visible words as a multiset. A dynamically streamed page embeds its
// loading.tsx fallback ("Loading…") AND the final content (in hidden chunks
// React swaps in), so word order differs from a prerendered page; comparing
// word counts ignores order while still catching any changed/missing copy.
function wordBag(html) {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
  const bag = new Map()
  for (const w of text.split(/\s+/).filter(Boolean)) bag.set(w, (bag.get(w) ?? 0) + 1)
  return bag
}

function diffBags(a, b) {
  const onlyBefore = [], onlyAfter = []
  for (const [w, n] of a) { const m = b.get(w) ?? 0; if (n > m) onlyBefore.push(`${w}×${n - m}`) }
  for (const [w, n] of b) { const m = a.get(w) ?? 0; if (n > m) onlyAfter.push(`${w}×${n - m}`) }
  return { onlyBefore, onlyAfter }
}

function htmlAttrs(html) {
  return /<html\b([^>]*)>/i.exec(html)?.[1]?.trim() ?? ""
}

function diffSets(a, b) {
  const A = new Set(a), B = new Set(b)
  return { onlyBefore: a.filter((x) => !B.has(x)), onlyAfter: b.filter((x) => !A.has(x)) }
}

function compare(beforeDir, afterDir) {
  const before = JSON.parse(readFileSync(join(beforeDir, "index.json"), "utf8"))
  const after = JSON.parse(readFileSync(join(afterDir, "index.json"), "utf8"))
  const afterByPath = new Map(after.map((e) => [e.path, e]))
  let problems = 0
  const report = []
  for (const b of before) {
    const a = afterByPath.get(b.path)
    if (!a) { report.push(`MISSING after: ${b.path}`); problems++; continue }
    const lines = []
    if (a.status !== b.status) { lines.push(`  STATUS ${b.status} -> ${a.status}`); problems++ }
    if (b.redirectProbe) {
      if (a.location !== b.location) { lines.push(`  LOCATION ${b.location} -> ${a.location}`); problems++ }
      report.push(`${lines.length ? "DIFF" : "same"} ${b.path}${lines.length ? "\n" + lines.join("\n") : ""}`)
      continue
    }
    const name = fileName(b.path)
    const bm = JSON.parse(readFileSync(join(beforeDir, `${name}.meta.json`), "utf8"))
    const am = JSON.parse(readFileSync(join(afterDir, `${name}.meta.json`), "utf8"))
    for (const h of ["x-robots-tag", "content-type", "location"]) {
      if ((bm.headers[h] ?? null) !== (am.headers[h] ?? null)) { lines.push(`  HEADER ${h}: ${bm.headers[h] ?? "-"} -> ${am.headers[h] ?? "-"}`); problems++ }
    }
    // The HTTP `Link: …; rel=preload` early-hint header is only emitted for
    // dynamically rendered responses; prerendered pages carry the same
    // preloads as <link> tags in the HTML instead. Informational only.
    const linkHeaderChanged = (bm.headers.link ?? null) !== (am.headers.link ?? null)
    const ccChanged = (bm.headers["cache-control"] ?? null) !== (am.headers["cache-control"] ?? null)
    const bh = readFileSync(join(beforeDir, `${name}.body`), "utf8")
    const ah = readFileSync(join(afterDir, `${name}.body`), "utf8")
    const isHtml = /text\/html/.test(bm.headers["content-type"] ?? "")
    if (isHtml) {
      if (htmlAttrs(bh) !== htmlAttrs(ah)) { lines.push(`  <html> attrs: [${htmlAttrs(bh)}] -> [${htmlAttrs(ah)}]`); problems++ }
      const d = diffSets(headTags(bh), headTags(ah))
      if (d.onlyBefore.length || d.onlyAfter.length) {
        problems++
        lines.push(`  HEAD/JSON-LD differs: -${d.onlyBefore.length} +${d.onlyAfter.length}`)
        for (const t of d.onlyBefore.slice(0, 6)) lines.push(`    - ${t.slice(0, 220)}`)
        for (const t of d.onlyAfter.slice(0, 6)) lines.push(`    + ${t.slice(0, 220)}`)
      }
      const t = diffBags(wordBag(bh), wordBag(ah))
      // "Loading…" is loading.tsx's fallback, which a streamed (dynamic) page
      // embeds alongside the real content; a prerendered page never shows it.
      const onlyBefore = t.onlyBefore.filter((w) => !/^Loading…×\d+$/.test(w))
      if (onlyBefore.length || t.onlyAfter.length) {
        problems++
        lines.push(`  VISIBLE TEXT differs: words only before [${onlyBefore.slice(0, 12).join(" ")}] only after [${t.onlyAfter.slice(0, 12).join(" ")}]`)
      }
    } else if (bh !== ah) {
      // Non-HTML (sitemap, feeds, JSON): bytes must match exactly, except
      // for generated timestamps which are normalised out below.
      const norm = (s) => s.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "T").replace(/[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} [\d:]+ GMT/g, "D")
      if (norm(bh) !== norm(ah)) { lines.push(`  BODY bytes differ (${bh.length} -> ${ah.length})`); problems++ }
    }
    const identical = bh === ah
    const tag = lines.length ? "DIFF" : identical ? "same (byte-identical)" : "same (DOM/head/text; bytes differ)"
    const info = linkHeaderChanged ? "  [Link preload header: dynamic-only, info]" : ""
    report.push(`${tag} ${b.path}${ccChanged ? `  [cache-control: "${bm.headers["cache-control"] ?? "-"}" -> "${am.headers["cache-control"] ?? "-"}"]` : ""}${lines.length ? "\n" + lines.join("\n") : ""}`)
  }
  console.log(report.join("\n"))
  console.log(`\n${problems === 0 ? "OK" : "PROBLEMS"}: ${problems} unexplained difference(s) across ${before.length} URLs`)
  process.exitCode = problems === 0 ? 0 : 2
}

const [mode, ...rest] = process.argv.slice(2)
if (mode === "dump") {
  const base = rest[rest.indexOf("--base") + 1]
  const out = rest[rest.indexOf("--out") + 1]
  await dump(base.replace(/\/$/, ""), out)
} else if (mode === "compare") {
  compare(rest[0], rest[1])
} else {
  console.error("usage: html-dump.mjs dump --base URL --out DIR | compare BEFORE_DIR AFTER_DIR")
  process.exit(1)
}
