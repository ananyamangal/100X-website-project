/**
 * Unit tests for lib/gem/archive-paths.ts
 *
 * Run with:
 *   npx tsx --test lib/gem/__tests__/archive-paths.test.ts
 *
 * Uses Node.js built-in test runner (node:test) — no Jest or Vitest required.
 * Node 18+ required (ships with Next.js 14 / Vercel default runtime).
 *
 * Test coverage (Option C — Hybrid Human-Readable + Hash Verification):
 *   normalizeContractId     — valid inputs, separators, edge cases, traversal
 *   normalizeBuyerName      — valid inputs, punctuation, traversal
 *   toBuyerSlug             — slugification, separators, attack payloads
 *   sha256Hex               — known-vector verification
 *   contentHash             — Buffer input, empty rejection
 *   validateComponent       — ".", "..", null bytes, illegal chars, length
 *   buildHybridArchivePath  — structure, determinism, attack payloads
 *   buildArchiveManifestPath — constant path
 *   assertInsideBase        — traversal detection
 *   resolveAndValidate      — absolute path rejection, traversal rejection
 *   areDuplicates           — hash comparison logic
 *   verifyContentIntegrity  — pass and fail cases
 *   Attack surface          — 13 canonical attack payloads end-to-end
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import * as nodePath from "path"

import {
  normalizeContractId,
  normalizeBuyerName,
  toBuyerSlug,
  sha256Hex,
  contentHash,
  validateComponent,
  buildHybridArchivePath,
  buildArchiveManifestPath,
  ARCHIVE_MANIFEST_PATH,
  assertInsideBase,
  resolveAndValidate,
  areDuplicates,
  verifyContentIntegrity,
} from "../archive-paths.js"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buf(s: string): Buffer {
  return Buffer.from(s, "utf8")
}

function assertThrows(fn: () => unknown, expectedFragment: string, label: string): void {
  let threw = false
  try { fn() } catch (e) {
    threw = true
    const msg = e instanceof Error ? e.message : String(e)
    assert.ok(
      msg.toLowerCase().includes(expectedFragment.toLowerCase()),
      `${label}: expected error containing "${expectedFragment}", got: "${msg}"`
    )
  }
  assert.ok(threw, `${label}: expected an error to be thrown but none was`)
}

// Fixed archive date for deterministic tests
const FIXED_DATE = new Date("2026-06-13T00:00:00.000Z")

// ─── normalizeContractId ──────────────────────────────────────────────────────

describe("normalizeContractId", () => {
  it("passes standard GEMC number unchanged", () => {
    assert.equal(normalizeContractId("GEMC-511687788095606"), "GEMC-511687788095606")
  })
  it("uppercases lowercase input", () => {
    assert.equal(normalizeContractId("gemc-511687788095606"), "GEMC-511687788095606")
  })
  it("replaces spaces with hyphens", () => {
    assert.equal(normalizeContractId("gemc 511687788095606"), "GEMC-511687788095606")
  })
  it("replaces slashes with hyphens", () => {
    assert.equal(normalizeContractId("gemc/511687788095606"), "GEMC-511687788095606")
  })
  it("replaces underscores with hyphens", () => {
    assert.equal(normalizeContractId("gemc_511687788095606"), "GEMC-511687788095606")
  })
  it("collapses multiple separators", () => {
    assert.equal(normalizeContractId("GEMC--511687788095606"), "GEMC-511687788095606")
  })
  it("strips leading/trailing whitespace", () => {
    assert.equal(normalizeContractId("  GEMC-511687788095606  "), "GEMC-511687788095606")
  })
  it("throws on empty string", () => {
    assertThrows(() => normalizeContractId(""), "non-empty string", "empty")
  })
  it("throws on whitespace-only string", () => {
    assertThrows(() => normalizeContractId("   "), "non-empty string", "whitespace only")
  })
  it("path traversal attempt — strips traversal chars, produces safe output", () => {
    const result = normalizeContractId("../../../etc/passwd")
    assert.ok(!result.includes(".."), "must not contain ..")
    assert.ok(!result.includes("/"),  "must not contain /")
    assert.ok(result.length > 0,      "must not be empty")
  })
  it("path traversal attempt — pure dots throw", () => {
    assertThrows(() => normalizeContractId("..."), "empty string", "pure dots")
  })
  it("null byte attempt — removed, does not throw", () => {
    const result = normalizeContractId("GEMC\0-123")
    assert.ok(!result.includes("\0"), "must not contain null byte")
  })
})

// ─── normalizeBuyerName ───────────────────────────────────────────────────────

describe("normalizeBuyerName", () => {
  it("uppercases and strips punctuation", () => {
    assert.equal(
      normalizeBuyerName("Ministry of Defence, New Delhi"),
      "MINISTRY OF DEFENCE NEW DELHI"
    )
  })
  it("strips ampersands and dots", () => {
    assert.equal(normalizeBuyerName("ABC & Sons Pvt. Ltd."), "ABC SONS PVT LTD")
  })
  it("collapses internal whitespace", () => {
    assert.equal(normalizeBuyerName("Dept.   of  Health"), "DEPT OF HEALTH")
  })
  it("throws on empty string", () => {
    assertThrows(() => normalizeBuyerName(""), "non-empty string", "empty")
  })
  it("'../../../etc/passwd' sanitizes to safe alphanumeric output", () => {
    const result = normalizeBuyerName("../../../etc/passwd")
    assert.ok(!result.includes("."),  "must not contain dots")
    assert.ok(!result.includes("/"),  "must not contain slashes")
    assert.ok(!result.includes("\\"), "must not contain backslash")
    assert.ok(result.length > 0,      "must not be empty")
  })
  it("'../../../../' throws — all chars stripped", () => {
    assertThrows(() => normalizeBuyerName("../../../../"), "empty string", "slash traversal")
  })
  it("semicolon injection — stripped", () => {
    const result = normalizeBuyerName("Buyer; rm -rf /")
    assert.ok(!result.includes(";"), "must not contain semicolon")
    assert.ok(!result.includes("/"), "must not contain slash")
  })
})

// ─── toBuyerSlug ──────────────────────────────────────────────────────────────

describe("toBuyerSlug", () => {
  it("normalizes standard organization name", () => {
    assert.equal(
      toBuyerSlug("Municipal Corporation of Delhi"),
      "municipal-corporation-of-delhi"
    )
  })
  it("uppercased input is lowercased", () => {
    assert.equal(toBuyerSlug("MINISTRY OF DEFENCE"), "ministry-of-defence")
  })
  it("parentheses and comma stripped — words joined by hyphens", () => {
    assert.equal(toBuyerSlug("Ministry of Defence (Army)"), "ministry-of-defence-army")
  })
  it("dashes in input preserved as word separators", () => {
    assert.equal(
      toBuyerSlug("NDMC - New Delhi Municipal Council"),
      "ndmc-new-delhi-municipal-council"
    )
  })
  it("dots treated as word separators", () => {
    assert.equal(toBuyerSlug("ABC & Sons Pvt. Ltd."), "abc-sons-pvt-ltd")
  })
  it("existing hyphen input preserved", () => {
    assert.equal(toBuyerSlug("valid-buyer"), "valid-buyer")
  })
  it("collapses extra whitespace", () => {
    assert.equal(toBuyerSlug("  spaces  "), "spaces")
  })
  it("long organization name capped at 80 chars", () => {
    const long = "A".repeat(50) + " " + "B".repeat(50)
    const result = toBuyerSlug(long)
    assert.ok(result.length <= 80, `slug must not exceed 80 chars, got ${result.length}`)
  })
  it("output contains only lowercase alphanumeric and hyphens", () => {
    const result = toBuyerSlug("Kerala State Disaster Management Authority")
    assert.match(result, /^[a-z0-9-]+$/)
  })
  it("path traversal '../../../etc/passwd' → 'etc-passwd'", () => {
    const result = toBuyerSlug("../../../etc/passwd")
    assert.ok(!result.includes(".."),  "must not contain ..")
    assert.ok(!result.includes("/"),   "must not contain /")
    assert.ok(!result.includes("\\"),  "must not contain \\")
    assert.equal(result, "etc-passwd", "traversal chars become word separators")
  })
  it("shell injection 'Buyer; rm -rf /' → 'buyer-rm-rf'", () => {
    assert.equal(toBuyerSlug("Buyer; rm -rf /"), "buyer-rm-rf")
  })
  it("all-slash input throws", () => {
    assertThrows(() => toBuyerSlug("/////"), "empty", "all slashes")
  })
  it("all-dot input throws", () => {
    assertThrows(() => toBuyerSlug("..."), "empty", "all dots")
  })
  it("empty string throws", () => {
    assertThrows(() => toBuyerSlug(""), "non-empty", "empty")
  })
})

// ─── sha256Hex ────────────────────────────────────────────────────────────────

describe("sha256Hex", () => {
  it("produces correct SHA-256 for known input", () => {
    assert.equal(
      sha256Hex("hello"),
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    )
  })
  it("produces 64 hex characters", () => {
    assert.equal(sha256Hex("GEMC-511687788095606").length, 64)
  })
  it("is deterministic", () => {
    const input = "GEMC-123456789"
    assert.equal(sha256Hex(input), sha256Hex(input))
  })
  it("different inputs produce different hashes", () => {
    assert.notEqual(sha256Hex("GEMC-1"), sha256Hex("GEMC-2"))
  })
  it("output contains only hex characters", () => {
    assert.match(sha256Hex("test-input"), /^[0-9a-f]{64}$/)
  })
})

// ─── contentHash ─────────────────────────────────────────────────────────────

describe("contentHash", () => {
  it("produces correct SHA-256 for known content", () => {
    assert.equal(
      contentHash(buf("hello")),
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    )
  })
  it("produces 64 hex characters", () => {
    assert.equal(contentHash(buf("some pdf content")).length, 64)
  })
  it("is deterministic", () => {
    const content = buf("PDF content here")
    assert.equal(contentHash(content), contentHash(content))
  })
  it("different content → different hash", () => {
    assert.notEqual(contentHash(buf("doc v1")), contentHash(buf("doc v2")))
  })
  it("throws on empty Buffer", () => {
    assertThrows(() => contentHash(Buffer.alloc(0)), "empty", "empty buffer")
  })
  it("throws on non-Buffer input", () => {
    // @ts-expect-error — intentional type violation for security test
    assertThrows(() => contentHash("not a buffer"), "buffer", "string input")
  })
})

// ─── validateComponent ────────────────────────────────────────────────────────

describe("validateComponent", () => {
  it("accepts a valid hex hash string", () => {
    const hash = "a".repeat(64)
    assert.equal(validateComponent(hash), hash)
  })
  it("accepts single lowercase letter", () => {
    assert.equal(validateComponent("a"), "a")
  })
  it("accepts a buyer slug", () => {
    assert.equal(validateComponent("ministry-of-defence"), "ministry-of-defence")
  })
  it("accepts a contract ID", () => {
    assert.equal(validateComponent("GEMC-511687788095606"), "GEMC-511687788095606")
  })
  it("rejects '.'", () => {
    assertThrows(() => validateComponent("."), "reserved", "dot")
  })
  it("rejects '..'", () => {
    assertThrows(() => validateComponent(".."), "reserved", "double dot")
  })
  it("rejects string containing null byte", () => {
    assertThrows(() => validateComponent("abc\0def"), "null byte", "null byte")
  })
  it("rejects string containing '..' as substring", () => {
    assertThrows(() => validateComponent("abc..def"), "traversal", "traversal substring")
  })
  it("rejects absolute-looking path", () => {
    assertThrows(() => validateComponent("/etc/passwd"), "absolute", "absolute path")
  })
  it("rejects Windows-style absolute path", () => {
    assertThrows(() => validateComponent("C:\\Windows"), "absolute", "windows absolute")
  })
  it("rejects forward slash (path separator in component)", () => {
    assertThrows(() => validateComponent("a/b"), "illegal", "slash in component")
  })
  it("rejects backslash", () => {
    assertThrows(() => validateComponent("a\\b"), "illegal", "backslash")
  })
  it("rejects Windows-illegal '<'", () => {
    assertThrows(() => validateComponent("file<name"), "illegal", "less-than")
  })
  it("rejects Windows-illegal '>'", () => {
    assertThrows(() => validateComponent("file>name"), "illegal", "greater-than")
  })
  it("rejects Windows-illegal ':'", () => {
    assertThrows(() => validateComponent("file:name"), "illegal", "colon")
  })
  it("rejects Windows-illegal '\"'", () => {
    assertThrows(() => validateComponent('file"name'), "illegal", "double-quote")
  })
  it("rejects Windows-illegal '|'", () => {
    assertThrows(() => validateComponent("file|name"), "illegal", "pipe")
  })
  it("rejects Windows-illegal '?'", () => {
    assertThrows(() => validateComponent("file?name"), "illegal", "question mark")
  })
  it("rejects Windows-illegal '*'", () => {
    assertThrows(() => validateComponent("file*name"), "illegal", "asterisk")
  })
  it("rejects component exceeding 255 bytes", () => {
    assertThrows(() => validateComponent("a".repeat(256)), "exceeds", "too long")
  })
  it("accepts component of exactly 255 bytes", () => {
    const max = "a".repeat(255)
    assert.equal(validateComponent(max), max)
  })
  it("rejects empty string", () => {
    assertThrows(() => validateComponent(""), "non-empty", "empty")
  })
})

// ─── buildHybridArchivePath ───────────────────────────────────────────────────

describe("buildHybridArchivePath", () => {
  const SAMPLE_CONTRACT = "GEMC-511687788095606"
  const SAMPLE_BUYER    = "Ministry of Defence"

  it("returns an object with all expected fields", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT,
      buyerName: SAMPLE_BUYER,
      pdfClass: "B",
      archiveDate: FIXED_DATE,
    })
    assert.ok(r.contractPdfPath,     "contractPdfPath must be set")
    assert.ok(r.metadataJsonPath,    "metadataJsonPath must be set")
    assert.ok(r.extractedJsonPath,   "extractedJsonPath must be set")
    assert.ok(r.contractDirPath,     "contractDirPath must be set")
    assert.equal(r.pdfClass, "B",    "pdfClass must be B")
    assert.equal(r.archiveYear, "2026")
    assert.equal(r.archiveMonth, "06")
    assert.equal(r.buyerSlug, "ministry-of-defence")
    assert.equal(r.normalizedContractId, "GEMC-511687788095606")
  })

  it("contractPdfPath has correct structure", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT,
      buyerName: SAMPLE_BUYER,
      pdfClass: "B",
      archiveDate: FIXED_DATE,
    })
    const parts = r.contractPdfPath.split("/")
    assert.equal(parts[0], "contracts",           "parts[0] = 'contracts'")
    assert.equal(parts[1], "b",                   "parts[1] = class 'b'")
    assert.equal(parts[2], "2026",                "parts[2] = year")
    assert.equal(parts[3], "06",                  "parts[3] = month")
    assert.equal(parts[4], "ministry-of-defence", "parts[4] = buyer slug")
    assert.equal(parts[5], "GEMC-511687788095606","parts[5] = contract id")
    assert.equal(parts[6], "contract.pdf",        "parts[6] = filename")
  })

  it("metadataJsonPath ends with /metadata.json", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER, archiveDate: FIXED_DATE,
    })
    assert.ok(r.metadataJsonPath.endsWith("/metadata.json"))
  })

  it("extractedJsonPath ends with /extracted.json", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER, archiveDate: FIXED_DATE,
    })
    assert.ok(r.extractedJsonPath.endsWith("/extracted.json"))
  })

  it("all three paths share the same contractDirPath prefix", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER, archiveDate: FIXED_DATE,
    })
    assert.ok(r.contractPdfPath.startsWith(r.contractDirPath + "/"))
    assert.ok(r.metadataJsonPath.startsWith(r.contractDirPath + "/"))
    assert.ok(r.extractedJsonPath.startsWith(r.contractDirPath + "/"))
  })

  it("has no leading slash", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER, archiveDate: FIXED_DATE,
    })
    assert.ok(!r.contractPdfPath.startsWith("/"),  "contractPdfPath must not start with /")
    assert.ok(!r.contractDirPath.startsWith("/"),  "contractDirPath must not start with /")
  })

  it("uses forward slashes only — no backslashes", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER, archiveDate: FIXED_DATE,
    })
    assert.ok(!r.contractPdfPath.includes("\\"),  "must not contain backslash")
    assert.ok(!r.contractDirPath.includes("\\"),  "must not contain backslash")
  })

  it("is deterministic — same inputs produce same output", () => {
    const r1 = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER,
      pdfClass: "A", archiveDate: FIXED_DATE,
    })
    const r2 = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER,
      pdfClass: "A", archiveDate: FIXED_DATE,
    })
    assert.equal(r1.contractPdfPath,  r2.contractPdfPath)
    assert.equal(r1.contractDirPath,  r2.contractDirPath)
    assert.equal(r1.buyerSlug,        r2.buyerSlug)
  })

  it("different buyer → different path", () => {
    const r1 = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: "Ministry of Defence", archiveDate: FIXED_DATE,
    })
    const r2 = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: "Municipal Corporation of Delhi", archiveDate: FIXED_DATE,
    })
    assert.notEqual(r1.contractDirPath, r2.contractDirPath)
  })

  it("different contract → different path", () => {
    const r1 = buildHybridArchivePath({
      gemContractNumber: "GEMC-111111111111111", buyerName: SAMPLE_BUYER, archiveDate: FIXED_DATE,
    })
    const r2 = buildHybridArchivePath({
      gemContractNumber: "GEMC-222222222222222", buyerName: SAMPLE_BUYER, archiveDate: FIXED_DATE,
    })
    assert.notEqual(r1.contractDirPath, r2.contractDirPath)
  })

  it("class A reflected as 'a' in path", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER,
      pdfClass: "A", archiveDate: FIXED_DATE,
    })
    assert.ok(r.contractPdfPath.startsWith("contracts/a/"))
  })

  it("class C reflected as 'c' in path", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER,
      pdfClass: "C", archiveDate: FIXED_DATE,
    })
    assert.ok(r.contractPdfPath.startsWith("contracts/c/"))
  })

  it("custom archiveDate is reflected in YYYY/MM components", () => {
    const jan2024 = new Date("2024-01-15T00:00:00.000Z")
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT, buyerName: SAMPLE_BUYER, archiveDate: jan2024,
    })
    assert.equal(r.archiveYear, "2024")
    assert.equal(r.archiveMonth, "01")
    assert.ok(r.contractDirPath.includes("/2024/01/"))
  })

  it("path traversal in contract number — stripped to safe output", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: "../../../etc/passwd",
      buyerName: SAMPLE_BUYER,
      archiveDate: FIXED_DATE,
    })
    assert.ok(!r.contractPdfPath.includes(".."),    "must not contain ..")
    assert.ok(!r.contractPdfPath.includes("etc"),   "must not contain 'etc'")
    assert.ok(!r.contractPdfPath.includes("passwd"),"must not contain 'passwd'")
  })

  it("path traversal in buyer name — stripped to safe slug", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT,
      buyerName: "../../../etc/passwd",
      archiveDate: FIXED_DATE,
    })
    assert.ok(!r.contractPdfPath.includes(".."),    "must not contain ..")
    assert.ok(!r.contractPdfPath.includes("/etc/"), "must not contain /etc/")
    assert.equal(r.buyerSlug, "etc-passwd",         "traversal normalized to slug")
  })

  it("shell injection in contract number — stripped", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: "GEMC;rm -rf /;123",
      buyerName: SAMPLE_BUYER,
      archiveDate: FIXED_DATE,
    })
    assert.ok(!r.contractPdfPath.includes(";"),  "must not contain semicolon")
    assert.ok(!r.contractPdfPath.includes(" "),  "must not contain space")
  })

  it("shell injection in buyer name — stripped", () => {
    const r = buildHybridArchivePath({
      gemContractNumber: SAMPLE_CONTRACT,
      buyerName: "Buyer; rm -rf /",
      archiveDate: FIXED_DATE,
    })
    assert.equal(r.buyerSlug, "buyer-rm-rf")
    assert.ok(!r.contractPdfPath.includes(";"), "must not contain semicolon")
  })

  it("empty buyer name throws", () => {
    assertThrows(
      () => buildHybridArchivePath({ gemContractNumber: SAMPLE_CONTRACT, buyerName: "" }),
      "non-empty", "empty buyer"
    )
  })

  it("empty contract number throws", () => {
    assertThrows(
      () => buildHybridArchivePath({ gemContractNumber: "", buyerName: SAMPLE_BUYER }),
      "non-empty", "empty contract"
    )
  })
})

// ─── buildArchiveManifestPath ─────────────────────────────────────────────────

describe("buildArchiveManifestPath", () => {
  it("returns the archive-manifest.json constant", () => {
    assert.equal(buildArchiveManifestPath(), "archive-manifest.json")
  })
  it("matches the exported ARCHIVE_MANIFEST_PATH constant", () => {
    assert.equal(buildArchiveManifestPath(), ARCHIVE_MANIFEST_PATH)
  })
  it("is a valid relative path — no leading slash, no traversal", () => {
    const p = buildArchiveManifestPath()
    assert.ok(!p.startsWith("/"), "must not start with /")
    assert.ok(!p.includes(".."), "must not contain ..")
    assert.ok(!p.includes("\0"), "must not contain null byte")
  })
})

// ─── assertInsideBase ─────────────────────────────────────────────────────────

describe("assertInsideBase", () => {
  const BASE = "/archives/gem"

  it("passes for a valid child path", () => {
    assert.doesNotThrow(() =>
      assertInsideBase(BASE, "/archives/gem/contracts/b/2026/06/buyer/GEMC-1/contract.pdf")
    )
  })
  it("passes for a deeply nested path", () => {
    assert.doesNotThrow(() =>
      assertInsideBase(BASE, "/archives/gem/contracts/a/2024/01/buyer/GEMC-2/metadata.json")
    )
  })
  it("throws for a sibling directory with matching prefix", () => {
    assertThrows(
      () => assertInsideBase(BASE, "/archives/gem-evil/file.pdf"),
      "traversal", "sibling with prefix"
    )
  })
  it("throws for parent directory", () => {
    assertThrows(
      () => assertInsideBase(BASE, "/archives"),
      "traversal", "parent directory"
    )
  })
  it("throws for root", () => {
    assertThrows(() => assertInsideBase(BASE, "/"), "traversal", "root escape")
  })
  it("throws for /etc/passwd", () => {
    assertThrows(
      () => assertInsideBase(BASE, "/etc/passwd"),
      "traversal", "etc/passwd"
    )
  })
  it("throws for dot-dot path that resolves outside base", () => {
    assertThrows(
      () => assertInsideBase("/archives/gem", "/etc/passwd"),
      "traversal", "resolved traversal"
    )
  })
  it("throws for empty baseDir", () => {
    assertThrows(
      () => assertInsideBase("", "/some/path"),
      "empty", "empty baseDir"
    )
  })
})

// ─── resolveAndValidate ───────────────────────────────────────────────────────

describe("resolveAndValidate", () => {
  const BASE = "/archives/gem"

  it("resolves a valid hybrid relative path", () => {
    const resolved = resolveAndValidate(
      BASE, "contracts/b/2026/06/ministry-of-defence/GEMC-511687788095606/contract.pdf"
    )
    const expectedBase = nodePath.resolve(BASE)
    assert.ok(resolved.startsWith(expectedBase), "must start with resolved base")
    assert.ok(!resolved.includes(".."), "must not contain ..")
  })
  it("throws for absolute relativePath", () => {
    assertThrows(
      () => resolveAndValidate(BASE, "/etc/passwd"),
      "absolute", "absolute path injection"
    )
  })
  it("throws for relativePath containing '..'", () => {
    assertThrows(
      () => resolveAndValidate(BASE, "contracts/../../etc/passwd"),
      "..", "traversal via .."
    )
  })
  it("throws for relativePath with null byte", () => {
    assertThrows(
      () => resolveAndValidate(BASE, "contracts/b\0/file"),
      "null byte", "null byte injection"
    )
  })
  it("throws for empty baseDir", () => {
    assertThrows(
      () => resolveAndValidate("", "contracts/b/file"),
      "baseDir", "empty baseDir"
    )
  })
  it("throws for empty relativePath", () => {
    assertThrows(
      () => resolveAndValidate(BASE, ""),
      "relativePath", "empty relativePath"
    )
  })
  it("passes for archive-manifest.json at root", () => {
    const resolved = resolveAndValidate(BASE, "archive-manifest.json")
    const expectedBase = nodePath.resolve(BASE)
    assert.ok(resolved.startsWith(expectedBase), "manifest must resolve inside base")
  })
})

// ─── areDuplicates ────────────────────────────────────────────────────────────

describe("areDuplicates", () => {
  it("returns true for identical hashes", () => {
    const hash = "a".repeat(64)
    assert.equal(areDuplicates(hash, hash), true)
  })
  it("returns false for different hashes", () => {
    assert.equal(areDuplicates("a".repeat(64), "b".repeat(64)), false)
  })
  it("returns false for empty string inputs", () => {
    assert.equal(areDuplicates("", ""), false)
  })
  it("returns false for mismatched lengths", () => {
    assert.equal(areDuplicates("abc", "abcd"), false)
  })
  it("real content hashes — duplicate detection works end-to-end", () => {
    const content = buf("identical PDF content")
    assert.equal(areDuplicates(contentHash(content), contentHash(content)), true)
  })
  it("real content hashes — different files not duplicates", () => {
    assert.equal(areDuplicates(contentHash(buf("PDF v1")), contentHash(buf("PDF v2"))), false)
  })
})

// ─── verifyContentIntegrity ───────────────────────────────────────────────────

describe("verifyContentIntegrity", () => {
  it("passes when content matches stored hash", () => {
    const content = buf("contract PDF bytes")
    assert.doesNotThrow(() => verifyContentIntegrity(content, contentHash(content)))
  })
  it("throws when content does not match stored hash", () => {
    const original  = buf("original PDF")
    const stored    = contentHash(original)
    assertThrows(
      () => verifyContentIntegrity(buf("tampered PDF!"), stored),
      "integrity check failed", "corrupted content"
    )
  })
  it("throws on single-byte corruption", () => {
    const content = buf("contract PDF bytes")
    const hash    = contentHash(content)
    const corrupt = Buffer.from(content)
    corrupt[0]    = corrupt[0] ^ 0x01
    assertThrows(
      () => verifyContentIntegrity(corrupt, hash),
      "integrity check failed", "single byte flip"
    )
  })
  it("includes both expected and actual hashes in error message", () => {
    const content = buf("original")
    const hash    = contentHash(content)
    let errorMsg  = ""
    try { verifyContentIntegrity(buf("tampered"), hash) }
    catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }
    assert.ok(errorMsg.includes(hash), "error must include expected hash")
  })
})

// ─── Integration: path traversal attack surface ───────────────────────────────

describe("path traversal attack surface (integration)", () => {
  const SAFE_BUYER   = "Ministry of Defence"
  const SAMPLE_PDF   = buf("sample-pdf-content")

  const CONTRACT_PAYLOADS = [
    "../../../etc/passwd",
    "..\\..\\..\\Windows\\system32\\cmd.exe",
    "/etc/shadow",
    "C:\\Windows\\System32\\drivers\\etc\\hosts",
    "%2e%2e%2f%2e%2e%2f",
    "....//....//etc//passwd",
    "GEMC\0-12345",
    "GEMC;cat /etc/passwd;",
    "${IFS}cat${IFS}/etc/passwd",
    "|cat /etc/passwd",
    "GEMC-1' OR '1'='1",
    "<script>alert(1)</script>",
    "GEMC-" + "A".repeat(300),
  ]

  for (const payload of CONTRACT_PAYLOADS) {
    it(`contract payload safe: ${payload.slice(0, 50)}`, () => {
      try {
        const result = buildHybridArchivePath({
          gemContractNumber: payload,
          buyerName: SAFE_BUYER,
          archiveDate: FIXED_DATE,
        })
        // If it doesn't throw, the resulting path must be safe
        assert.ok(!result.contractPdfPath.includes(".."),      "no traversal ..")
        assert.ok(!result.contractPdfPath.includes("\0"),      "no null byte")
        assert.ok(!result.contractPdfPath.includes(";"),       "no semicolon")
        assert.ok(!result.contractPdfPath.startsWith("/"),     "no absolute path")
        assert.ok(!result.contractPdfPath.includes("Windows"), "no Windows")

        // Each component of the path must pass validateComponent
        const dir = result.contractDirPath
        for (const part of dir.split("/")) {
          assert.doesNotThrow(() => validateComponent(part))
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        assert.ok(
          msg.includes("empty") || msg.includes("non-empty") ||
          msg.includes("traversal") || msg.includes("illegal") ||
          msg.includes("absolute") || msg.includes("exceeds"),
          `thrown error must be a security rejection, got: ${msg}`
        )
      }
    })
  }
})
