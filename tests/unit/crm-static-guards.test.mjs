// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-static-guards.test.mjs
// Generic source scans that guard future CRM steps (ADR sections 12, 14; model.ts OutboundText notes).
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/
const rel = f => path.relative(ROOT, f).split(path.sep).join("/")

function walk(dir) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return []
  const out = []
  const rec = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".next") continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) rec(p)
      else if (EXT.test(e.name)) out.push(p)
    }
  }
  rec(abs)
  return out
}

/** Removes comments (keeps string contents) so doc comments that merely mention a name do not trip scans. */
function stripComments(src) {
  let out = "", i = 0, q = null
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (q) {
      out += c
      if (c === "\\") { out += src[i + 1] ?? ""; i += 2; continue }
      if (c === q) q = null
      i++
    } else if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++
    } else if (c === "/" && n === "*") {
      i += 2
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") out += "\n"; i++ }
      i += 2
    } else if (c === '"' || c === "'" || c === "`") {
      q = c; out += c; i++
    } else { out += c; i++ }
  }
  return out
}

const read = f => stripComments(fs.readFileSync(f, "utf8"))

/** All module specifiers: from "x", import "x", import("x"), require("x"). */
function specifiers(code) {
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(["'`])([^"'`\n]+)\1/g
  const out = []
  let m
  while ((m = re.exec(code))) out.push(m[2])
  return out
}

/** Resolves "@/" aliases and relative specifiers to repo-relative paths; bare packages unchanged. */
function resolveSpec(file, spec) {
  if (spec.startsWith("@/")) return spec.slice(2)
  if (spec.startsWith(".")) return rel(path.resolve(path.dirname(file), spec))
  return spec
}
const under = (resolved, prefix) => resolved === prefix || resolved.startsWith(prefix + "/")

const CRM_DIRS = ["lib/crm", "app/api/crm", "scripts/crm", "app/(admin)/admin/crm"]
const crmFiles = CRM_DIRS.flatMap(walk)
const growthFiles = walk("lib/growth-os")
const outboundFiles = ["lib/crm/outbound", "lib/crm/broadcast", "lib/crm/queue"].flatMap(walk)

test("scan sanity: lib/crm and lib/growth-os sources are found", () => {
  assert.ok(walk("lib/crm").length >= 5, "expected lib/crm/** sources")
  assert.ok(growthFiles.length > 0, "expected lib/growth-os/** sources")
})

test("CRM code never imports lib/growth-os", () => {
  const offenders = []
  for (const f of crmFiles) {
    for (const s of specifiers(read(f))) {
      if (under(resolveSpec(f, s), "lib/growth-os")) offenders.push(rel(f) + " -> " + s)
    }
  }
  assert.deepEqual(offenders, [])
})

test("lib/growth-os imports nothing from lib/crm (or CRM api/scripts)", () => {
  const offenders = []
  for (const f of growthFiles) {
    for (const s of specifiers(read(f))) {
      const r = resolveSpec(f, s)
      if (under(r, "lib/crm") || under(r, "app/api/crm") || under(r, "scripts/crm")) offenders.push(rel(f) + " -> " + s)
    }
  }
  assert.deepEqual(offenders, [])
})

test("outbound/broadcast/queue: no unsafe casts on the OutboundText path", () => {
  const bad = [
    [/\bas\s+any\b/, "as any"],
    [/\bas\s+never\b/, "as never"],
    [/\bas\s+unknown\s+as\b/, "as unknown as"],
    [/\bas\s+OutboundText\b/, "as OutboundText"],
    [/<\s*OutboundText\s*>\s*[\w(\[{"'`]/, "<OutboundText> cast"],
    [/<\s*(?:any|never)\s*>\s*[\w(\[{"'`]/, "<any>/<never> cast"],
  ]
  const offenders = []
  for (const f of outboundFiles) {
    const raw = fs.readFileSync(f, "utf8")
    const code = stripComments(raw)
    for (const [re, label] of bad) if (re.test(code)) offenders.push(rel(f) + ": " + label)
    if (/@ts-ignore|@ts-nocheck/.test(raw)) offenders.push(rel(f) + ": ts-ignore/ts-nocheck")
  }
  assert.deepEqual([...new Set(offenders)], [])
})

test("no explicit type arguments on OutboundText mint functions (anywhere in CRM code)", () => {
  const MINT = ["fromComposer", "fromTemplateParam", "fromAutomationSetting", "fromPersistedOutbound"]
  const re = new RegExp("\\b(?:" + MINT.join("|") + ")\\s*<")
  const offenders = []
  for (const f of new Set([...outboundFiles, ...crmFiles])) {
    if (re.test(read(f))) offenders.push(rel(f))
  }
  assert.deepEqual(offenders, [])
})

test("outbound/broadcast/queue never import or name the internal-notes module (DATA_MODEL section 6)", () => {
  const offenders = []
  for (const f of outboundFiles) {
    const code = read(f)
    for (const s of specifiers(code)) {
      const r = resolveSpec(f, s)
      if (under(r, "lib/crm/notes") || /(^|\/)notes(\/|$|\.)/.test(r) || /internal-?notes/i.test(r)) offenders.push(rel(f) + " -> " + s)
    }
    if (/\bInternalNoteText\b/.test(code) && !/\bNotInternalNote\b/.test(code)) offenders.push(rel(f) + ": references InternalNoteText")
  }
  assert.deepEqual(offenders, [])
})

test("CRM data access goes through lib/crm/db.ts: no direct clientPromise / .db( / lib/mongodb in lib/crm, API routes, admin pages", () => {
  const files = ["lib/crm", "app/api/crm", "app/(admin)/admin/crm"].flatMap(walk)
    .filter(f => !["lib/crm/db.ts", "lib/crm/indexes.ts"].includes(rel(f)))
  const offenders = []
  for (const f of files) {
    const code = read(f)
    if (/\bclientPromise\b/.test(code)) offenders.push(rel(f) + ": clientPromise")
    if (/\.db\s*\(/.test(code)) offenders.push(rel(f) + ": .db(")
    if (/new\s+MongoClient\b/.test(code)) offenders.push(rel(f) + ": new MongoClient")
    for (const s of specifiers(code)) if (/(^|\/)lib\/mongodb$/.test(resolveSpec(f, s)) || /(^|\/)mongodb$/.test(resolveSpec(f, s)) && s !== "mongodb") offenders.push(rel(f) + " -> " + s)
  }
  assert.deepEqual(offenders, [])
})

test("collections are only resolved through the wrapper (no raw .collection(literal) outside db.ts)", () => {
  const files = crmFiles.filter(f => rel(f) !== "lib/crm/db.ts" && !rel(f).startsWith("scripts/crm/"))
  const offenders = []
  for (const f of files) {
    const code = read(f)
    if (/\.collection\s*\(\s*["'`]/.test(code)) offenders.push(rel(f) + ": .collection(string literal)")
    if (/\bdb\s*\.\s*collection\s*\(/.test(code)) offenders.push(rel(f) + ": db.collection(")
  }
  assert.deepEqual(offenders, [])
})

test("lib/crm/db.ts keeps its documented public surface", () => {
  const db = fs.readFileSync(path.join(ROOT, "lib/crm/db.ts"), "utf8")
  for (const name of ["crmDbFrom", "crmDb", "CrmWorkspaceViolation", "assertCrmDbAllowed"]) {
    assert.match(db, new RegExp("export\\s+(?:async\\s+)?(?:function|class)\\s+" + name + "\\b"), name)
  }
})

test("ADR 15: only the growth module, website ingest and conversion writer reference the sales-invisible collections", () => {
  // Allowed: lib/crm/growth/** (exports, when built), the website ingest, the conversion writer, the
  // backfill that replays the ingest, and the modules that only DECLARE names/indexes.
  const ALLOWED_FILES = new Set([
    "lib/crm/website.ts",
    "lib/crm/conversions.ts",
    "scripts/crm/backfill-website-leads.mjs",
    "lib/crm/model.ts",
    "lib/crm/db.ts",
    "lib/crm/indexes.ts",
  ])
  const allowed = r => ALLOWED_FILES.has(r) || under(r, "lib/crm/growth") || under(r, "tests")
  const REF = [
    [/\bCOLL\s*\.\s*(?:attribution|conversionEvents)\b/, "COLL.attribution/conversionEvents"],
    [/\bCOLL\s*\[\s*["'`](?:attribution|conversionEvents)["'`]\s*\]/, "COLL[\"attribution\"]"],
    [/["'`]crm_(?:attribution|conversion_events)["'`]/, "literal collection name"],
    [/\bSALES_INVISIBLE_COLLECTIONS\b/, "SALES_INVISIBLE_COLLECTIONS"],
  ]
  const files = ["lib", "app", "scripts", "components", "middleware.ts"].flatMap(d => (fs.existsSync(path.join(ROOT, d)) && fs.statSync(path.join(ROOT, d)).isFile() ? [path.join(ROOT, d)] : walk(d)))
  assert.ok(files.length > 50, "scan sanity")
  const offenders = []
  for (const f of files) {
    const r = rel(f)
    if (allowed(r)) continue
    const code = read(f)
    for (const [re, label] of REF) if (re.test(code)) offenders.push(r + ": " + label)
  }
  assert.deepEqual(offenders, [])
  // Positive control: the allowed writers really do reference them (the scan is not vacuous).
  assert.match(read(path.join(ROOT, "lib/crm/website.ts")), REF[0][0])
  assert.match(read(path.join(ROOT, "lib/crm/conversions.ts")), REF[0][0])
})

// ───────────────────────── STEP 3d/3e: internal-note separation + sales-invisible (independent) ─────────────────────────
const RESOLVE_EXT = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"]
function resolveFile(file, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null // bare package
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(file), spec)
  for (const e of RESOLVE_EXT) {
    const p = base + e
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  }
  return null
}
/** Every repo file reachable through static or dynamic imports from `starts` (including the starts). */
function reachable(starts) {
  const seen = new Set()
  const stack = [...starts]
  while (stack.length) {
    const f = stack.pop()
    if (seen.has(f)) continue
    seen.add(f)
    for (const s of specifiers(read(f))) {
      const r = resolveFile(f, s)
      if (r && !seen.has(r)) stack.push(r)
    }
  }
  return seen
}
const reachesNotes = starts => [...reachable(starts)].filter(f => under(rel(f), "lib/crm/notes"))

test("3d: nothing under whatsapp/outbound/broadcast/queue/automation/reminders/growth/ai/flows or the inbox/webhook routes reaches lib/crm/notes (transitive)", () => {
  const dirs = ["whatsapp", "outbound", "quotes", "broadcast", "queue", "automation", "reminders", "growth", "ai", "flows"].map(d => "lib/crm/" + d)
  const starts = [...dirs.flatMap(walk), ...["app/api/crm/whatsapp", "app/api/crm/inbox", "app/api/crm/templates", "app/api/crm/quotations", "app/api/crm/broadcasts", "app/api/crm/queue", "app/api/crm/cron"].flatMap(walk)]
  assert.ok(starts.length >= 5, "scan sanity: whatsapp sources found")
  const offenders = []
  for (const s of starts) {
    const hit = reachesNotes([s])
    if (hit.length) offenders.push(rel(s) + " -> " + hit.map(rel).join(","))
  }
  assert.deepEqual(offenders, [])
  // also: no sending-side file names COLL.internalNotes or the note collection literal
  // Sole sanctioned exception (DATA_MODEL §6): lib/crm/outbound/gate.ts reads the notes collection's textHash only.
  const GATE = "lib/crm/outbound/gate.ts"
  for (const f of starts) if (rel(f) !== GATE) assert.ok(!/internalNotes|crm_internal_notes/.test(read(f)), rel(f))
  const gateSrc = stripComments(read(path.join(ROOT, GATE)))
  const noteReads = gateSrc.match(/COLL\s*\.\s*internalNotes.*/g) ?? []
  assert.ok(noteReads.length >= 1 && noteReads.every(l => /projection:\s*\{\s*textHash:\s*1\s*\}/.test(l)), "gate.ts reads notes with projection {textHash:1} only")
  assert.ok(!/from\s+["'][^"']*\/notes(\/|["'])/.test(gateSrc), "gate.ts must not import lib/crm/notes")
})

test("3d: the contact read handlers (lib/crm/api/contacts.ts, the contact/deal routes) and /api/crm/team never reach lib/crm/notes", () => {
  const starts = ["lib/crm/api/contacts.ts", "lib/crm/api/route.ts", "lib/crm/api/auth.ts", "lib/crm/leads/query.ts", "lib/crm/leads/deal-patch.ts",
    "app/api/crm/contacts/[id]/route.ts", "app/api/crm/contacts/[id]/timeline/route.ts", "app/api/crm/deals/[id]/route.ts",
    "lib/crm/api/team.ts", "app/api/crm/team/route.ts"].map(f => path.join(ROOT, f)) // /api/crm/team has its own handler module (lib/crm/api/team.ts), so it is covered too
  for (const s of starts) assert.ok(fs.existsSync(s), s)
  assert.deepEqual(reachesNotes(starts).map(rel), [])
  assert.deepEqual(reachesNotes([path.join(ROOT, "lib/crm/dealers/import.ts"), path.join(ROOT, "lib/crm/api/dealers.ts")]).map(rel), [])
  // positive controls: the only two sanctioned importers do reach it, so the walker is not vacuous
  assert.ok(reachesNotes([path.join(ROOT, "lib/crm/api/notes.ts")]).length > 0)
  assert.ok(reachesNotes([path.join(ROOT, "lib/crm/leads/manual.ts")]).length > 0)
  assert.ok(reachesNotes([path.join(ROOT, "lib/crm/api/leads.ts")]).length > 0)
})

test("3d: only lib/crm/notes, lib/crm/api/notes.ts and lib/crm/leads/manual.ts import the notes module / name the notes collection", () => {
  const ALLOWED_IMPORTERS = new Set(["lib/crm/api/notes.ts", "lib/crm/leads/manual.ts"])
  const ALLOWED_COLL = new Set(["lib/crm/model.ts", "lib/crm/db.ts", "lib/crm/indexes.ts", "lib/crm/outbound/gate.ts"])
  const importers = [], namers = []
  for (const f of crmFiles) {
    const r = rel(f)
    const code = read(f)
    if (!under(r, "lib/crm/notes") && specifiers(code).some(s => { const x = resolveFile(f, s); return x && under(rel(x), "lib/crm/notes") })) importers.push(r)
    if (!under(r, "lib/crm/notes") && !ALLOWED_COLL.has(r) && /\bCOLL\s*\.\s*internalNotes\b|["'`]crm_internal_notes["'`]/.test(code)) namers.push(r)
  }
  assert.deepEqual(importers.sort(), [...ALLOWED_IMPORTERS].sort())
  assert.deepEqual(namers.sort(), [...ALLOWED_IMPORTERS].sort().filter(f => f === "lib/crm/api/notes.ts" ? false : false).concat(namers.filter(n => !ALLOWED_IMPORTERS.has(n))).sort())
  assert.deepEqual(namers.filter(n => !ALLOWED_IMPORTERS.has(n)), [], "only notes importers may name the notes collection")
})

test("3d: notes module and handlers never log (no console.* in lib/crm/notes, no note text passed to a logger/audit)", () => {
  for (const f of walk("lib/crm/notes")) assert.ok(!/\bconsole\s*\./.test(read(f)), rel(f))
  const notes = read(path.join(ROOT, "lib/crm/api/notes.ts"))
  assert.ok(!/\blog\.(info|error)\([^)]*\b(text|t\.text|body)\b/.test(notes))
  const manual = read(path.join(ROOT, "lib/crm/leads/manual.ts"))
  assert.ok(!/\bconsole\s*\./.test(manual))
  // audit call sites never receive the note text (balanced-paren extraction of every logCrmAction(...) call)
  for (const code of [manual, notes]) {
    let i = 0
    while ((i = code.indexOf("logCrmAction(", i)) !== -1) {
      let depth = 0, j = i + "logCrmAction".length
      do { if (code[j] === "(") depth++; else if (code[j] === ")") depth--; j++ } while (depth > 0 && j < code.length)
      const call = code.slice(i, j)
      assert.ok(!/(input\.notes|t\.text|note\.text|body\.text|body\.notes|text)/.test(call.replace(/noteId|"note\.create"|type: "note"/g, "")), "note text in audit call: " + call.slice(0, 120))
      i = j
    }
  }
})

test("3d/3e: new files never reference the sales-invisible collections or ad-attribution fields", () => {
  const files = [
    ...["lib/crm/api", "lib/crm/leads", "lib/crm/dealers", "lib/crm/notes"].flatMap(walk),
    path.join(ROOT, "lib/crm/audit.ts"), path.join(ROOT, "lib/crm/validate.ts"),
    ...["contacts", "dealers", "deals", "leads", "team"].flatMap(d => walk("app/api/crm/" + d)),
    path.join(ROOT, "scripts/crm/grant-crm-permissions.mjs"),
  ]
  assert.ok(files.length >= 20, "scan sanity: " + files.length)
  const offenders = []
  for (const f of files) {
    const code = read(f)
    if (/crm_attribution|crm_conversion_events|\bCOLL\s*\.\s*(?:attribution|conversionEvents)\b|SALES_INVISIBLE|\bgclid\b|\bfbclid\b|\bwbraid\b|\bgbraid\b|\butm[A-Z_\b]/.test(code)) offenders.push(rel(f))
    if (/\battribution\b/i.test(code)) offenders.push(rel(f) + " (attribution)")
  }
  assert.deepEqual(offenders, [])
})

test("3d/3e: CRM API routes only read through lib/crm/api (route files are thin) and use dynamic + nodejs runtime", () => {
  const routes = walk("app/api/crm").filter(f => /route\.ts$/.test(f) && !rel(f).includes("/whatsapp/") && !rel(f).endsWith("/health/route.ts"))
  assert.ok(routes.length >= 9, "found " + routes.length)
  for (const f of routes) {
    const code = fs.readFileSync(f, "utf8")
    assert.match(code, /export const dynamic = "force-dynamic"/, rel(f))
    assert.match(code, /export const runtime = "nodejs"/, rel(f))
    assert.match(code, /@\/lib\/crm\/api\//, rel(f))
    assert.ok(!/COLL\./.test(code), rel(f) + " touches collections directly")
  }
})
