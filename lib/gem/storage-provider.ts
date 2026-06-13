/**
 * lib/gem/storage-provider.ts
 *
 * Storage provider abstraction and document schemas for the GeM contract archive.
 *
 * DESIGN PRINCIPLE:
 *   No provider-specific logic (AWS SDK types, Azure credentials, fs paths) may
 *   appear in any business logic file. Business logic holds only a StorageProvider
 *   reference. Concrete implementations are injected at the application boundary.
 *
 * Supported providers (implementations deferred to Tier 3):
 *   LocalDiskProvider  — development / testing
 *   VercelBlobProvider — production (Vercel Blob private bucket)
 *   S3Provider         — AWS S3 / S3-compatible (Cloudflare R2, MinIO)
 *   AzureBlobProvider  — Azure Blob Storage
 *   GCSProvider        — Google Cloud Storage
 *
 * Tier 2 deliverable: INTERFACE + SCHEMAS ONLY.
 * No provider implementations until Tier 3.
 */

import type { ARCHIVE_SCHEMA_VERSION, ARCHIVE_TOOL_VERSION, PdfClass } from "./archive-paths"

// ─── Storage provider interface ───────────────────────────────────────────────

export interface WriteOptions {
  /** MIME type. Default: "application/pdf" */
  contentType?: string

  /**
   * Arbitrary ASCII key-value metadata stored alongside the file.
   *
   * Conventional keys used by this system:
   *   content-sha256     — SHA-256 hex of file content
   *   gemc-number        — normalized GeM contract number
   *   pdf-class          — "A" | "B" | "C"
   *   source-url         — origin URL the PDF was fetched from
   *   archived-at        — ISO-8601 timestamp of first storage
   *   enrichment-run-id  — approval token ID of the enrichment run
   */
  metadata?: Record<string, string>

  /**
   * If true: skip the write if a file already exists at this path.
   * Returns { written: false, existed: true } without error.
   *
   * Since contract.pdf is always the same filename within a contract directory,
   * this is the primary deduplication mechanism: if the directory already exists,
   * the second archive attempt is a no-op.
   */
  ifNotExists?: boolean
}

export interface WriteResult {
  written: boolean
  existed: boolean
  /** Provider-specific storage URL or object key (for logging/audit). */
  storageRef?: string
}

export interface FileInfo {
  relativePath: string
  sizeBytes: number
  contentType: string
  metadata: Record<string, string>
  lastModified: Date
}

export interface ListOptions {
  /** Maximum results. Default: 1000. */
  limit?: number
  /** Pagination cursor from a prior list() call. */
  cursor?: string
}

export interface ListResult {
  paths: string[]
  nextCursor?: string
}

export interface DeleteResult {
  deleted: boolean
}

/**
 * Abstraction over any blob / object / file storage backend.
 *
 * All paths are relative, use forward slashes, and must not be absolute or
 * contain "..". Providers map them internally to provider-specific keys.
 *
 * Implementation requirements:
 *   - Validate that relativePaths do not escape the provider root.
 *   - Safe for concurrent async callers (no shared mutable state).
 *   - Propagate errors as thrown exceptions — no swallowing.
 *   - Never log secret credentials.
 */
export interface StorageProvider {
  write(relativePath: string, content: Buffer, options?: WriteOptions): Promise<WriteResult>
  read(relativePath: string): Promise<Buffer>
  exists(relativePath: string): Promise<boolean>
  delete(relativePath: string): Promise<DeleteResult>
  list(prefix: string, options?: ListOptions): Promise<ListResult>
  /** Returns null (not throw) when file does not exist. */
  stat(relativePath: string): Promise<FileInfo | null>
  readonly providerId: string
}

/** Factory that returns a configured StorageProvider for the current environment. */
export type StorageProviderFactory = () => StorageProvider | Promise<StorageProvider>

// ─── metadata.json schema ─────────────────────────────────────────────────────

/**
 * Shape of the metadata.json file stored inside every contract directory.
 *
 * Path: contracts/{class}/{YYYY}/{MM}/{buyer-slug}/{contract-id}/metadata.json
 *
 * Design requirements:
 *   - Self-contained: the archive folder must be reconstructable without MongoDB.
 *   - Complete: contains all information needed to rebuild MongoDB records.
 *   - Versioned: _schema_version enables future migration of existing files.
 *   - Auditable: sha256 and enrichment_run_id link every file to its approval.
 */
export interface ContractMetadataJson {
  // ── Schema identity ────────────────────────────────────────────────────────
  /** Increment when schema changes in a breaking way. Current: 1. */
  _schema_version: typeof ARCHIVE_SCHEMA_VERSION
  /** Archive tool version that wrote this file (e.g. "1.0.0"). */
  _archive_tool_version: typeof ARCHIVE_TOOL_VERSION

  // ── Contract identity ──────────────────────────────────────────────────────
  /** Normalized GeM contract number — matches the directory name. */
  contract_id: string
  /** Raw GeM contract number as received (before normalization). */
  contract_id_raw: string

  // ── Parties ────────────────────────────────────────────────────────────────
  /** Buyer/government organization name (raw, as received from GeM). */
  buyer_name: string
  /** Buyer slug — matches the parent directory name. */
  buyer_slug: string
  /** State or UT of the buyer. */
  buyer_state: string | null
  /** Awarded seller / L1 bidder name. */
  seller_name: string | null
  /** Seller GSTIN if available. */
  seller_gstin: string | null

  // ── Classification ─────────────────────────────────────────────────────────
  /** Normalized product category (e.g. "thermal_fogger"). */
  category: string
  /** Raw product name as found in the bid. */
  product_name_raw: string | null

  // ── Contract details ───────────────────────────────────────────────────────
  /** Contract / awarded value in INR. */
  contract_value_inr: number | null
  /** Quantity ordered. */
  quantity: number | null
  /** Final contract status at time of archive. */
  current_status: string

  // ── Dates (ISO 8601, from GeM data) ───────────────────────────────────────
  publish_date: string | null
  bid_end_date: string | null
  award_date:   string | null

  // ── Integrity & archive provenance ────────────────────────────────────────
  /** SHA-256 hex digest of contract.pdf content. For integrity + deduplication. */
  sha256: string
  /** File size of contract.pdf in bytes. */
  size_bytes: number
  /** URL the PDF was fetched from. */
  source_url: string | null
  /** ISO-8601 timestamp when this file was downloaded and archived. */
  download_timestamp: string
  /** PDF retention class. */
  pdf_class: PdfClass
  /** Relative path to contract.pdf from the storage root. */
  relative_path: string

  // ── Audit trail ────────────────────────────────────────────────────────────
  /** Approval token ID that authorized the enrichment run. Links to audit log. */
  enrichment_run_id: string
  /** Storage provider ID that wrote the file (e.g. "vercel-blob"). */
  storage_provider: string
  /** True once integrity has been verified post-write. */
  integrity_verified: boolean
  /** ISO-8601 timestamp of last integrity verification. */
  integrity_verified_at: string | null
}

// ─── archive-manifest.json schema ────────────────────────────────────────────

/**
 * Shape of the root-level archive-manifest.json file.
 *
 * Path: archive-manifest.json (at storage root)
 *
 * Updated after every successful archive write. Used by rebuild-index.ts to
 * quickly assess archive state without scanning the full directory tree.
 */
export interface ArchiveManifest {
  // ── Schema identity ────────────────────────────────────────────────────────
  _schema_version: typeof ARCHIVE_SCHEMA_VERSION
  _archive_tool_version: typeof ARCHIVE_TOOL_VERSION

  // ── Summary counts ─────────────────────────────────────────────────────────
  /** Total number of contract directories in the archive. */
  total_contracts: number
  /** Breakdown by PDF class. */
  class_counts: { a: number; b: number; c: number }
  /** Total bytes of all contract.pdf files. */
  total_pdf_bytes: number

  // ── Timestamps ─────────────────────────────────────────────────────────────
  /** ISO-8601 timestamp when this manifest was last written. */
  build_timestamp: string
  /** ISO-8601 timestamp of the earliest archived contract. */
  earliest_archive_date: string | null
  /** ISO-8601 timestamp of the most recently archived contract. */
  latest_archive_date: string | null

  // ── Audit ──────────────────────────────────────────────────────────────────
  /** User ID of the last person to run an enrichment job. */
  last_updated_by: string
  /** Approval token ID of the last enrichment run. */
  last_enrichment_run_id: string
}

// ─── MongoDB document schema ──────────────────────────────────────────────────

/**
 * MongoDB document shape for the gem_contract_archives collection.
 *
 * Mirrors ContractMetadataJson with MongoDB-specific fields added.
 * The contract directory in storage is the authoritative source; this
 * collection is the indexed, queryable projection of that data.
 *
 * NOTE: This collection is not created until Tier 3. The schema is defined
 * here as a design commitment so business logic can reference it.
 */
export interface ContractArchiveRecord {
  _id?: string

  // ── Contract identity ──────────────────────────────────────────────────────
  gemc_number:     string   // normalized (matches directory name)
  gemc_number_raw: string   // raw as received

  // ── Parties ────────────────────────────────────────────────────────────────
  buyer_name:   string
  buyer_slug:   string
  buyer_state:  string | null
  seller_name:  string | null
  seller_gstin: string | null

  // ── Classification ─────────────────────────────────────────────────────────
  category:          string
  product_name_raw:  string | null

  // ── Contract details ───────────────────────────────────────────────────────
  contract_value_inr: number | null
  quantity:           number | null
  current_status:     string

  // ── Dates ──────────────────────────────────────────────────────────────────
  publish_date: string | null
  bid_end_date: string | null
  award_date:   string | null

  // ── Storage reference ──────────────────────────────────────────────────────
  sha256:           string
  size_bytes:       number
  source_url:       string | null
  relative_path:    string    // path to contract.pdf from storage root
  pdf_class:        PdfClass
  storage_provider: string

  // ── Audit ──────────────────────────────────────────────────────────────────
  enrichment_run_id:    string
  integrity_verified:   boolean
  integrity_verified_at: Date | null

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  status:     "stored" | "pending_extraction" | "extracted" | "deleted" | "corrupted"
  created_at: Date
  updated_at: Date
  expires_at: Date | null   // null = permanent (Class A)
}
