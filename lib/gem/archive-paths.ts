/**
 * lib/gem/archive-paths.ts
 *
 * Security-hardened archive path generation for GeM contract PDFs.
 * Option C: Hybrid Human-Readable + Hash Verification (approved 2026-06-13).
 *
 * SECURITY CONTRACT (unchanged from Tier 2):
 *   - No raw external string is ever used directly as a path component.
 *   - All external strings pass through allow-list normalization before use.
 *   - validateComponent() is called on every computed component (defense-in-depth).
 *   - resolveAndValidate() must be called before any filesystem or storage I/O.
 *   - SHA-256 is retained in metadata.json for integrity verification,
 *     duplicate detection, and audit — it is NOT used as a directory or filename.
 *
 * Archive directory structure:
 *   {base}/contracts/{class}/{YYYY}/{MM}/{buyer-slug}/{contract-id}/
 *     contract.pdf      — archived PDF
 *     metadata.json     — full contract metadata including SHA-256
 *     extracted.json    — extracted text (written post-extraction, Tier 3)
 *
 *   {base}/archive-manifest.json — root-level manifest of all archived contracts
 *
 * YYYY/MM partitioning uses the archive/download timestamp (internal system
 * clock), NOT the contract date. This ensures the path is well-defined even
 * when the contract date is missing or incorrect. Contract dates live in
 * metadata.json where they belong.
 */

import { createHash } from "crypto"
import * as nodePath from "path"

// ─── Schema versioning ────────────────────────────────────────────────────────

/** Increment when ContractMetadataJson schema changes in a breaking way. */
export const ARCHIVE_SCHEMA_VERSION = 1 as const

/** Archive tool version — written into every metadata.json. */
export const ARCHIVE_TOOL_VERSION = "1.0.0" as const

// ─── PDF storage classes ──────────────────────────────────────────────────────

/**
 * PDF retention tier:
 *   A — Permanent (awarded contracts with signed documents)
 *   B — 6-month retention (active/evaluated bids)
 *   C — Delete after text extraction (published/cancelled, low value)
 */
export type PdfClass = "A" | "B" | "C"

// ─── Security constants ───────────────────────────────────────────────────────

// No /g flag on these — safe to call .test() multiple times without
// lastIndex state mutation.
const ILLEGAL_COMPONENT_RE = /[<>:"/\\|?*\x00-\x1F\x7F]/
const TRAVERSAL_RE         = /\.\./
const NULL_BYTE_RE         = /\0/
const ABSOLUTE_RE          = /^[/\\]|^[A-Za-z]:[/\\]/

/** Maximum UTF-8 byte length for a single path component (POSIX ext4 limit). */
const MAX_COMPONENT_BYTES = 255

/** Buyer slug maximum character length before byte-length validation. */
const MAX_SLUG_CHARS = 80

/** Contract ID maximum character length before byte-length validation. */
const MAX_CONTRACT_ID_CHARS = 80

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a GeM contract number to a stable canonical form.
 * Used as the contract directory name and for SHA-256 hashing in audit trails.
 *
 * Output alphabet: [A-Z0-9-]+, max 80 characters.
 *
 * Examples:
 *   "GEMC-511687788095606"  → "GEMC-511687788095606"
 *   "gemc 511687788095606"  → "GEMC-511687788095606"
 *   "GEMC/511687788095606"  → "GEMC-511687788095606"
 */
export function normalizeContractId(input: string): string {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("contractId must be a non-empty string")
  }
  const normalized = input
    .trim()
    .toUpperCase()
    .replace(/[\s/_]+/g, "-")
    .replace(/[^A-Z0-9\-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_CONTRACT_ID_CHARS)

  if (!normalized) {
    throw new Error(`contractId "${input.slice(0, 40)}" produced empty string after normalization`)
  }
  return normalized
}

/**
 * Normalize a buyer/organization name to a stable canonical form for hashing.
 * Used for SHA-256 hashing in audit identity — NOT for directory names.
 * For directory names, use toBuyerSlug() instead.
 *
 * Output: uppercase with spaces, [A-Z0-9 ]+
 */
export function normalizeBuyerName(input: string): string {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("buyerName must be a non-empty string")
  }
  const normalized = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized) {
    throw new Error(
      `buyerName "${input.slice(0, 40)}" produced empty string after normalization ` +
      `(possible path traversal attempt)`
    )
  }
  return normalized
}

/**
 * Convert a buyer/organization name to a URL-safe, filesystem-safe slug.
 * Used as the buyer directory name in the archive hierarchy.
 *
 * Output alphabet: [a-z0-9-]+, max 80 characters.
 *
 * Algorithm:
 *   1. Lowercase + trim
 *   2. Path separators, hyphens, underscores, dots → single space
 *   3. Remove remaining non-alphanumeric characters
 *   4. Collapse whitespace → hyphens
 *   5. Trim leading/trailing hyphens
 *   6. Enforce 80-character limit
 *
 * Examples:
 *   "Municipal Corporation of Delhi"      → "municipal-corporation-of-delhi"
 *   "Ministry of Defence (Army)"          → "ministry-of-defence-army"
 *   "NDMC - New Delhi Municipal Council"  → "ndmc-new-delhi-municipal-council"
 *   "ABC & Sons Pvt. Ltd."               → "abc-sons-pvt-ltd"
 *   "../../../etc/passwd"                 → "etc-passwd"  (traversal chars stripped)
 *   "Buyer; rm -rf /"                     → "buyer-rm-rf"
 *
 * Security: output is always [a-z0-9-]+ — structurally incapable of path
 * traversal. validateComponent() is called downstream as defense-in-depth.
 */
export function toBuyerSlug(input: string): string {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("buyerName must be a non-empty string")
  }
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.\\/]+/g, " ")   // treat separators and path chars as spaces
    .replace(/[^a-z0-9\s]/g, "")     // strip remaining special chars
    .trim()
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-{2,}/g, "-")          // collapse consecutive hyphens
    .replace(/^-|-$/g, "")           // trim leading/trailing hyphens
    .slice(0, MAX_SLUG_CHARS)

  if (!slug) {
    throw new Error(
      `buyerName "${input.slice(0, 40)}" produced empty slug after normalization ` +
      `(possible path traversal attempt)`
    )
  }
  return slug
}

// ─── Hashing (retained from Tier 2 for integrity/audit) ──────────────────────

/**
 * Compute SHA-256 hex digest of a UTF-8 string.
 * Used for: audit-trail identity hashing of contract IDs and buyer names.
 * NOT used as a path component in Option C.
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex")
}

/**
 * Compute SHA-256 hex digest of binary content (Buffer).
 * Used for: integrity verification, duplicate detection, audit.
 * Stored in metadata.json as the sha256 field — NOT used as the filename.
 *
 * The result is 64 lowercase hex characters.
 */
export function contentHash(content: Buffer): string {
  if (!Buffer.isBuffer(content)) throw new Error("content must be a Buffer")
  if (content.length === 0) throw new Error("content must not be empty")
  return createHash("sha256").update(content).digest("hex")
}

// ─── Component validation (unchanged from Tier 2) ─────────────────────────────

/**
 * Validate that a string is safe to use as a single path component.
 * Throws a descriptive error on any violation.
 *
 * Called on every component produced by buildHybridArchivePath() as
 * defense-in-depth against future bugs in normalization functions above.
 */
export function validateComponent(component: string, label = "component"): string {
  if (typeof component !== "string" || component.length === 0) {
    throw new Error(`Path ${label} must be a non-empty string`)
  }
  if (component === "." || component === "..") {
    throw new Error(`Path ${label} is a reserved name: "${component}"`)
  }
  if (NULL_BYTE_RE.test(component)) {
    throw new Error(`Path ${label} contains a null byte`)
  }
  if (TRAVERSAL_RE.test(component)) {
    throw new Error(`Path ${label} contains traversal sequence: "${component}"`)
  }
  if (ABSOLUTE_RE.test(component)) {
    throw new Error(`Path ${label} looks like an absolute path: "${component}"`)
  }
  if (ILLEGAL_COMPONENT_RE.test(component)) {
    throw new Error(
      `Path ${label} contains illegal characters: "${component.slice(0, 60)}"`
    )
  }
  const byteLength = Buffer.byteLength(component, "utf8")
  if (byteLength > MAX_COMPONENT_BYTES) {
    throw new Error(
      `Path ${label} exceeds ${MAX_COMPONENT_BYTES} bytes (${byteLength}): ` +
      `"${component.slice(0, 40)}..."`
    )
  }
  return component
}

// ─── Path traversal guards (unchanged from Tier 2) ────────────────────────────

/**
 * Assert that a resolved absolute path is contained within the given base directory.
 * Uses path.resolve() on both arguments so that ".." sequences, mixed separators,
 * and platform differences are all normalized before comparison.
 *
 * Throws if resolvedPath escapes baseDir by any means, including sibling-prefix
 * attacks (e.g. "/archive/gem-evil" would escape "/archive/gem").
 */
export function assertInsideBase(baseDir: string, resolvedPath: string): void {
  if (!baseDir) throw new Error("baseDir must not be empty")
  const normalizedBase   = nodePath.resolve(baseDir)
  const normalizedTarget = nodePath.resolve(resolvedPath)
  const prefix = normalizedBase + nodePath.sep
  if (normalizedTarget !== normalizedBase && !normalizedTarget.startsWith(prefix)) {
    throw new Error(
      `Path traversal detected: ` +
      `"${normalizedTarget}" is outside base "${normalizedBase}"`
    )
  }
}

/**
 * Resolve a relative archive path to an absolute path within baseDir,
 * then assert it does not escape the base.
 *
 * This is the MANDATORY final step before any filesystem or storage read/write.
 *
 * @throws if relativePath is absolute, contains "..", contains null bytes,
 *         or resolves to a path outside baseDir.
 */
export function resolveAndValidate(baseDir: string, relativePath: string): string {
  if (!baseDir) throw new Error("baseDir must be provided")
  if (!relativePath) throw new Error("relativePath must be provided")
  if (nodePath.isAbsolute(relativePath)) {
    throw new Error(`relativePath must not be absolute: "${relativePath}"`)
  }
  if (TRAVERSAL_RE.test(relativePath)) {
    throw new Error(`relativePath must not contain "..": "${relativePath}"`)
  }
  if (NULL_BYTE_RE.test(relativePath)) {
    throw new Error("relativePath must not contain null bytes")
  }
  const resolved = nodePath.resolve(baseDir, relativePath)
  assertInsideBase(baseDir, resolved)
  return resolved
}

// ─── Hybrid archive path builder ──────────────────────────────────────────────

export interface HybridArchiveParams {
  /** GeM contract number (e.g. "GEMC-511687788095606"). External — sanitized. */
  gemContractNumber: string

  /** Buyer/organization name (e.g. "Ministry of Defence"). External — slugified. */
  buyerName: string

  /** PDF retention tier. Default: "B". */
  pdfClass?: PdfClass

  /**
   * The date to use for YYYY/MM directory partitioning.
   * Defaults to the current UTC time (new Date()).
   *
   * IMPORTANT: This should be the archive/download timestamp from the internal
   * system clock — NOT a date parsed from external GeM data. Actual contract
   * dates (publish_date, award_date) belong in metadata.json.
   */
  archiveDate?: Date
}

export interface HybridArchiveResult {
  // ── File paths (relative, forward slashes, no leading slash) ──────────────

  /** Full relative path to the archived PDF file. */
  contractPdfPath: string

  /** Full relative path to the metadata JSON file. */
  metadataJsonPath: string

  /** Full relative path to the extracted text JSON file. */
  extractedJsonPath: string

  /** Relative path to the contract directory (no trailing slash). */
  contractDirPath: string

  // ── Components (for constructing metadata records) ─────────────────────────

  /** PDF retention class used. */
  pdfClass: PdfClass

  /** UTC year of the archive date ("2026"). */
  archiveYear: string

  /** Zero-padded UTC month of the archive date ("06"). */
  archiveMonth: string

  /** Normalized buyer slug ("municipal-corporation-of-delhi"). */
  buyerSlug: string

  /** Normalized GeM contract ID ("GEMC-511687788095606"). */
  normalizedContractId: string
}

/**
 * Build a safe, deterministic, human-readable archive path for a GeM contract PDF.
 *
 * Path structure:
 *   contracts/{class}/{YYYY}/{MM}/{buyer-slug}/{contract-id}/contract.pdf
 *   contracts/{class}/{YYYY}/{MM}/{buyer-slug}/{contract-id}/metadata.json
 *   contracts/{class}/{YYYY}/{MM}/{buyer-slug}/{contract-id}/extracted.json
 *
 * Security guarantees (Option C — equal to Tier 2 hash-only protection):
 *   1. No raw external string appears in any path component.
 *   2. YYYY/MM components are derived from the internal clock, not external data.
 *   3. Buyer name passes through allow-list slug normalization → [a-z0-9-]+
 *   4. Contract ID passes through allow-list normalization → [A-Z0-9-]+
 *   5. validateComponent() called on all five computed components.
 *   6. SHA-256 retained in metadata.json for integrity/dedup/audit.
 *
 * @param params  See HybridArchiveParams.
 */
export function buildHybridArchivePath(params: HybridArchiveParams): HybridArchiveResult {
  const {
    gemContractNumber,
    buyerName,
    pdfClass = "B",
    archiveDate = new Date(),
  } = params

  // Step 1 — normalize external strings through allow-list sanitizers
  const normalizedContractId = normalizeContractId(gemContractNumber)
  const buyerSlug            = toBuyerSlug(buyerName)

  // Step 2 — partition by archive date (internal clock, not external data)
  const archiveYear  = String(archiveDate.getUTCFullYear())
  const archiveMonth = String(archiveDate.getUTCMonth() + 1).padStart(2, "0")

  // Step 3 — single-letter class directory
  const classDir = pdfClass.toLowerCase()

  // Step 4 — defense-in-depth: validate every computed component before use
  validateComponent(classDir,             "pdfClass")
  validateComponent(archiveYear,          "archiveYear")
  validateComponent(archiveMonth,         "archiveMonth")
  validateComponent(buyerSlug,            "buyerSlug")
  validateComponent(normalizedContractId, "contractId")

  // Step 5 — assemble with forward slashes (portable across Windows and Linux)
  const contractDirPath = [
    "contracts", classDir, archiveYear, archiveMonth, buyerSlug, normalizedContractId,
  ].join("/")

  return {
    contractPdfPath:   `${contractDirPath}/contract.pdf`,
    metadataJsonPath:  `${contractDirPath}/metadata.json`,
    extractedJsonPath: `${contractDirPath}/extracted.json`,
    contractDirPath,
    pdfClass,
    archiveYear,
    archiveMonth,
    buyerSlug,
    normalizedContractId,
  }
}

// ─── Archive manifest ─────────────────────────────────────────────────────────

/** Relative path to the root-level archive manifest file. */
export const ARCHIVE_MANIFEST_PATH = "archive-manifest.json" as const

/**
 * Return the relative path to the archive manifest.
 * The manifest lives at the storage root, not inside any contract directory.
 */
export function buildArchiveManifestPath(): typeof ARCHIVE_MANIFEST_PATH {
  return ARCHIVE_MANIFEST_PATH
}

// ─── Integrity utilities (unchanged from Tier 2) ──────────────────────────────

/**
 * Check whether two files are duplicates by comparing their SHA-256 content hashes.
 * Pure function — no I/O.
 *
 * Used before archive writes to avoid storing duplicate PDFs: if
 * MongoDB already has a record for this contract with the same sha256,
 * the write can be skipped.
 */
export function areDuplicates(hashA: string, hashB: string): boolean {
  if (!hashA || !hashB) return false
  return hashA.length === hashB.length && hashA === hashB
}

/**
 * Verify that a file's content matches a previously stored SHA-256 hash.
 * Used for integrity checking after reading from storage.
 *
 * @throws if the content is corrupt — includes both expected and actual hashes
 *         in the error message for diagnostics.
 */
export function verifyContentIntegrity(content: Buffer, expectedHash: string): void {
  const actual = contentHash(content)
  if (actual !== expectedHash) {
    throw new Error(
      `File integrity check failed: expected SHA-256 ${expectedHash}, got ${actual}`
    )
  }
}
