/**
 * lib/gem/archive-service.ts
 *
 * Orchestrates the full Layer 1 archive pipeline for a single contract.
 *
 * Pipeline steps:
 *   1. Fetch PDF (URL or upload)
 *   2. Validate PDF (magic bytes, size, EOF)
 *   3. Compute SHA256
 *   4. Duplicate check
 *   5a. Write contract.pdf  (ifNotExists)
 *   5b. Write metadata.json (always overwrite)
 *   5c. Write extracted.json (always overwrite)
 *   6. Post-write integrity verification
 *   7. MongoDB upsert (gem_contract_archives)
 *   8. Update archive-manifest.json
 *
 * Layer 1 constraints enforced here:
 *   - Max 10 contracts per approval token (checked by API route, not service)
 *   - Category validation done in API route before this is called
 *   - No scheduler, no background jobs, no bulk processing
 */

import clientPromise                  from "@/lib/mongodb"
import { buildHybridArchivePath, contentHash, verifyContentIntegrity, ARCHIVE_MANIFEST_PATH }
  from "./archive-paths"
import { validatePdf }                from "./pdf-validator"
import { extractPdf }                 from "./extractor"
import { ARCHIVE_SCHEMA_VERSION, ARCHIVE_TOOL_VERSION } from "./archive-paths"
import { ARCHIVE_POLICY }             from "./archive-category-config"
import type { StorageProvider }       from "./storage-provider"
import type {
  ContractMetadataJson,
  ContractArchiveRecord,
  ArchiveManifest,
} from "./storage-provider"
import type { PdfClass }              from "./archive-paths"

// ─── Input / output types ─────────────────────────────────────────────────────

export interface PdfSource {
  type:      "url" | "upload"
  url?:      string
  base64?:   string
  filename?: string
}

export interface ArchiveContractParams {
  gemcNumber:        string
  buyerName:         string
  buyerState:        string | null
  sellerName:        string | null
  sellerGstin:       string | null
  category:          string
  productNameRaw:    string | null
  contractValueInr:  number | null
  quantity:          number | null
  currentStatus:     string
  publishDate:       string | null
  bidEndDate:        string | null
  awardDate:         string | null
  pdfSource:         PdfSource
  pdfClass:          PdfClass
  enrichmentRunId:   string
  archivedByUserId:  string
}

export interface ArchiveResult {
  written:           boolean
  existed:           boolean
  versionConflict:   boolean
  gemcNumber:        string
  sha256:            string
  sizeBytes:         number
  relativePath:      string
  integrityVerified: boolean
  status:            ContractArchiveRecord["status"]
  record:            ContractArchiveRecord
  extractionStatus:  string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchUrl(url: string): Promise<{ buffer: Buffer; contentType: string | null; contentLength: number | null }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { "User-Agent": "100xCircle-ArchiveBot/1.0" },
  })
  if (!res.ok) throw new Error(`PDF fetch failed: HTTP ${res.status} for ${url}`)
  const contentType   = res.headers.get("content-type")
  const contentLength = res.headers.get("content-length")
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType, contentLength: contentLength ? parseInt(contentLength, 10) : null }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function archiveContract(
  provider: StorageProvider,
  params: ArchiveContractParams,
): Promise<ArchiveResult> {
  const db = (await clientPromise).db()
  const col = db.collection<ContractArchiveRecord>("gem_contract_archives")

  // ── Step 1: Fetch PDF ──────────────────────────────────────────────────────
  let pdfBuffer: Buffer
  let fetchContentType: string | null  = null
  let fetchContentLength: number | null = null

  if (params.pdfSource.type === "url") {
    if (!params.pdfSource.url) throw new Error("pdf_source.url is required when type is 'url'")
    const fetched     = await fetchUrl(params.pdfSource.url)
    pdfBuffer         = fetched.buffer
    fetchContentType  = fetched.contentType
    fetchContentLength = fetched.contentLength
  } else {
    if (!params.pdfSource.base64) throw new Error("pdf_source.base64 is required when type is 'upload'")
    pdfBuffer = Buffer.from(params.pdfSource.base64, "base64")
  }

  // ── Step 2: Validate PDF ───────────────────────────────────────────────────
  validatePdf(pdfBuffer, {
    contentType:   fetchContentType,
    contentLength: fetchContentLength,
  })

  // ── Step 3: SHA-256 ────────────────────────────────────────────────────────
  const sha256    = contentHash(pdfBuffer)
  const sizeBytes = pdfBuffer.length

  // ── Step 4: Duplicate check ────────────────────────────────────────────────
  const normalizedGemc = params.gemcNumber.toUpperCase().trim()

  const existing = await col.findOne({ gemc_number: normalizedGemc })
  if (existing) {
    if (existing.sha256 === sha256) {
      return {
        written: false, existed: true, versionConflict: false,
        gemcNumber: normalizedGemc, sha256, sizeBytes,
        relativePath: existing.relative_path,
        integrityVerified: existing.integrity_verified,
        status: existing.status, record: existing,
        extractionStatus: "skipped_duplicate",
      }
    }
    return {
      written: false, existed: true, versionConflict: true,
      gemcNumber: normalizedGemc, sha256, sizeBytes,
      relativePath: existing.relative_path,
      integrityVerified: existing.integrity_verified,
      status: existing.status, record: existing,
      extractionStatus: "skipped_version_conflict",
    }
  }

  // ── Step 5: Build paths ────────────────────────────────────────────────────
  const paths = buildHybridArchivePath({
    gemContractNumber: normalizedGemc,
    buyerName:         params.buyerName,
    pdfClass:          params.pdfClass,
  })

  // ── Step 5a: Store contract.pdf ────────────────────────────────────────────
  await provider.write(paths.contractPdfPath, pdfBuffer, {
    ifNotExists:  true,
    contentType:  "application/pdf",
    metadata: {
      "content-sha256":    sha256,
      "gemc-number":       normalizedGemc,
      "pdf-class":         paths.pdfClass,
      "enrichment-run-id": params.enrichmentRunId,
    },
  })

  // ── Step 6 (pre): Extract text ─────────────────────────────────────────────
  const extracted = await extractPdf(pdfBuffer)

  // ── Step 5b: Store metadata.json ───────────────────────────────────────────
  const metadata: ContractMetadataJson = {
    _schema_version:        ARCHIVE_SCHEMA_VERSION,
    _archive_tool_version:  ARCHIVE_TOOL_VERSION,
    contract_id:            paths.normalizedContractId,
    contract_id_raw:        params.gemcNumber,
    buyer_name:             params.buyerName,
    buyer_slug:             paths.buyerSlug,
    buyer_state:            params.buyerState,
    seller_name:            params.sellerName,
    seller_gstin:           params.sellerGstin,
    category:               params.category,
    product_name_raw:       params.productNameRaw,
    contract_value_inr:     params.contractValueInr,
    quantity:               params.quantity,
    current_status:         params.currentStatus,
    publish_date:           params.publishDate,
    bid_end_date:           params.bidEndDate,
    award_date:             params.awardDate,
    sha256,
    size_bytes:             sizeBytes,
    source_url:             params.pdfSource.type === "url" ? (params.pdfSource.url ?? null) : null,
    download_timestamp:     new Date().toISOString(),
    pdf_class:              paths.pdfClass,
    relative_path:          paths.contractPdfPath,
    enrichment_run_id:      params.enrichmentRunId,
    storage_provider:       provider.providerId,
    integrity_verified:     false,
    integrity_verified_at:  null,
  }
  await provider.write(paths.metadataJsonPath, Buffer.from(JSON.stringify(metadata, null, 2)))

  // ── Step 5c: Store extracted.json ──────────────────────────────────────────
  await provider.write(paths.extractedJsonPath, Buffer.from(JSON.stringify(extracted, null, 2)))

  // ── Step 6: Post-write integrity verification ──────────────────────────────
  const readBack = await provider.read(paths.contractPdfPath)
  verifyContentIntegrity(readBack, sha256)

  // Update metadata with verified flag
  metadata.integrity_verified    = true
  metadata.integrity_verified_at = new Date().toISOString()
  await provider.write(paths.metadataJsonPath, Buffer.from(JSON.stringify(metadata, null, 2)))

  // ── Step 7: MongoDB upsert ─────────────────────────────────────────────────
  const archiveStatus: ContractArchiveRecord["status"] =
    extracted._extraction_status === "success" || extracted._extraction_status === "partial"
      ? "extracted"
      : "stored"

  const now   = new Date()
  const record: ContractArchiveRecord = {
    gemc_number:           paths.normalizedContractId,
    gemc_number_raw:       params.gemcNumber,
    buyer_name:            params.buyerName,
    buyer_slug:            paths.buyerSlug,
    buyer_state:           params.buyerState,
    seller_name:           params.sellerName,
    seller_gstin:          params.sellerGstin,
    category:              params.category,
    product_name_raw:      params.productNameRaw,
    contract_value_inr:    params.contractValueInr,
    quantity:              params.quantity,
    current_status:        params.currentStatus,
    publish_date:          params.publishDate,
    bid_end_date:          params.bidEndDate,
    award_date:            params.awardDate,
    sha256,
    size_bytes:            sizeBytes,
    source_url:            params.pdfSource.type === "url" ? (params.pdfSource.url ?? null) : null,
    relative_path:         paths.contractPdfPath,
    pdf_class:             paths.pdfClass,
    storage_provider:      provider.providerId,
    enrichment_run_id:     params.enrichmentRunId,
    integrity_verified:    true,
    integrity_verified_at: now,
    status:                archiveStatus,
    created_at:            now,
    updated_at:            now,
    expires_at:            null,
  }

  await col.updateOne(
    { gemc_number: paths.normalizedContractId },
    { $set: record, $setOnInsert: { created_at: now } },
    { upsert: true },
  )

  // ── Step 8: Update manifest ────────────────────────────────────────────────
  await updateManifest(provider, col, params.enrichmentRunId, params.archivedByUserId)

  return {
    written: true, existed: false, versionConflict: false,
    gemcNumber: normalizedGemc, sha256, sizeBytes,
    relativePath: paths.contractPdfPath,
    integrityVerified: true,
    status: archiveStatus, record,
    extractionStatus: extracted._extraction_status,
  }
}

// ─── Manifest updater ─────────────────────────────────────────────────────────

async function updateManifest(
  provider: StorageProvider,
  col: import("mongodb").Collection<ContractArchiveRecord>,
  enrichmentRunId: string,
  lastUpdatedBy: string,
): Promise<void> {
  try {
    const [total, classCounts, valueSums] = await Promise.all([
      col.countDocuments(),
      col.aggregate([{ $group: { _id: "$pdf_class", count: { $sum: 1 } } }]).toArray(),
      col.aggregate([
        { $group: { _id: null, totalBytes: { $sum: "$size_bytes" } } },
      ]).toArray(),
    ])

    const classMap: Record<string, number> = {}
    for (const r of classCounts) classMap[String(r._id).toLowerCase()] = r.count as number

    const [earliest, latest] = await Promise.all([
      col.findOne({}, { sort: { created_at: 1 }, projection: { created_at: 1 } }),
      col.findOne({}, { sort: { created_at: -1 }, projection: { created_at: 1 } }),
    ])

    const manifest: ArchiveManifest = {
      _schema_version:       ARCHIVE_SCHEMA_VERSION,
      _archive_tool_version: ARCHIVE_TOOL_VERSION,
      total_contracts:       total,
      class_counts:          { a: classMap.a ?? 0, b: classMap.b ?? 0, c: classMap.c ?? 0 },
      total_pdf_bytes:       (valueSums[0]?.totalBytes as number) ?? 0,
      build_timestamp:       new Date().toISOString(),
      earliest_archive_date: earliest?.created_at?.toISOString() ?? null,
      latest_archive_date:   latest?.created_at?.toISOString() ?? null,
      last_updated_by:       lastUpdatedBy,
      last_enrichment_run_id: enrichmentRunId,
    }

    await provider.write(
      ARCHIVE_MANIFEST_PATH,
      Buffer.from(JSON.stringify(manifest, null, 2)),
    )
  } catch (err) {
    // Manifest update is best-effort — never block the archive write
    console.warn("[archive] manifest update failed:", err)
  }
}

// ─── Integrity re-verification ────────────────────────────────────────────────

export interface VerifyResult {
  ok:            boolean
  match:         boolean
  storedSha256:  string
  actualSha256:  string
  gemcNumber:    string
}

export async function verifyContractIntegrity(
  provider: StorageProvider,
  gemcNumber: string,
): Promise<VerifyResult> {
  const db     = (await clientPromise).db()
  const record = await db.collection<ContractArchiveRecord>("gem_contract_archives")
    .findOne({ gemc_number: gemcNumber.toUpperCase().trim() })

  if (!record) throw new Error(`No archive record found for ${gemcNumber}`)

  const liveBuffer = await provider.read(record.relative_path)
  const actualSha  = contentHash(liveBuffer)
  const match      = actualSha === record.sha256

  const now = new Date()
  await db.collection<ContractArchiveRecord>("gem_contract_archives").updateOne(
    { gemc_number: record.gemc_number },
    { $set: {
      integrity_verified:    match,
      integrity_verified_at: now,
      updated_at:            now,
      status:                match ? record.status : "corrupted" as const,
    }},
  )

  return { ok: true, match, storedSha256: record.sha256, actualSha256: actualSha, gemcNumber: record.gemc_number }
}
