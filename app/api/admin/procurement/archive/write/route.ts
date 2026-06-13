/**
 * POST /api/admin/procurement/archive/write
 *
 * Archives a single GeM contract PDF.
 * Guards: permission → approval token → category validation → run limit → pipeline
 *
 * Body:
 *   approval_token: string
 *   gemc_number:    string
 *   pdf_source:     { type: "url", url: string } | { type: "upload", base64: string, filename?: string }
 *   pdf_class?:     "A" | "B" | "C"  (default: "B")
 *
 * Layer 1 constraints:
 *   Max 10 contracts per approval token
 *   Category: FOGGING_MACHINE_V2_IS_14855_PART_1 only
 *   No scheduler, no background, no bulk
 */

import { NextRequest, NextResponse }    from "next/server"
import clientPromise                    from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { verifyAndConsumeToken }        from "@/lib/gem/approval"
import { validateArchiveCategory, MAX_CONTRACTS_PER_RUN, ARCHIVE_POLICY }
  from "@/lib/gem/archive-category-config"
import { archiveContract }              from "@/lib/gem/archive-service"
import { getStorageProvider }           from "@/lib/gem/providers/factory"
import { PdfValidationError }           from "@/lib/gem/pdf-validator"
import type { PdfClass }                from "@/lib/gem/archive-paths"
import type { ContractArchiveRecord }   from "@/lib/gem/storage-provider"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.archive.write")
  if (!("user" in auth)) return auth

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  const { approval_token, gemc_number, pdf_source, pdf_class = "B" } = body as {
    approval_token?: string
    gemc_number?:    string
    pdf_source?:     { type?: string; url?: string; base64?: string; filename?: string }
    pdf_class?:      string
  }

  // ── Guard 1: approval token ────────────────────────────────────────────────
  if (!approval_token) {
    await writeAuditLog(auth.user, "archive_write_failed", "archive/write",
      { reason: "missing_approval_token" }, req)
    return NextResponse.json(
      { error: "Approval required. Issue an approval token (operation: archive_write) before archiving.", code: "APPROVAL_REQUIRED" },
      { status: 403 }
    )
  }

  const approval = await verifyAndConsumeToken(
    String(approval_token), auth.user.sub, "archive_write", "/api/admin/procurement/archive/write"
  )
  if (!approval) {
    await writeAuditLog(auth.user, "archive_write_failed", "archive/write",
      { reason: "invalid_expired_or_consumed_token", token_id: approval_token }, req)
    return NextResponse.json(
      { error: "Approval token invalid, expired, or already used.", code: "APPROVAL_INVALID" },
      { status: 403 }
    )
  }

  // ── Guard 2: required fields ───────────────────────────────────────────────
  if (!gemc_number?.trim()) {
    return NextResponse.json({ error: "gemc_number is required", code: "MISSING_FIELD" }, { status: 400 })
  }
  if (!pdf_source?.type || !["url", "upload"].includes(pdf_source.type)) {
    return NextResponse.json({ error: "pdf_source.type must be 'url' or 'upload'", code: "MISSING_FIELD" }, { status: 400 })
  }
  if (pdf_source.type === "url" && !pdf_source.url) {
    return NextResponse.json({ error: "pdf_source.url required when type is 'url'", code: "MISSING_FIELD" }, { status: 400 })
  }
  if (pdf_source.type === "upload" && !pdf_source.base64) {
    return NextResponse.json({ error: "pdf_source.base64 required when type is 'upload'", code: "MISSING_FIELD" }, { status: 400 })
  }

  // ── Guard 3: server-side contract lookup ───────────────────────────────────
  const db       = (await clientPromise).db()
  const contract = await db.collection("gem_contracts").findOne(
    { gemc_no: gemc_number.trim() },
    { projection: {
      gemc_no: 1, product_name: 1, buyer_name: 1, dept_name: 1, state: 1,
      seller_name_canonical: 1, seller_gst: 1, contract_value_num: 1,
      quantity: 1, contract_status: 1, contract_date_dt: 1,
    }}
  )
  if (!contract) {
    return NextResponse.json(
      { error: `Contract ${gemc_number} not found in gem_contracts`, code: "CONTRACT_NOT_FOUND" },
      { status: 400 }
    )
  }

  // ── Guard 4: server-side category validation ───────────────────────────────
  const catResult = validateArchiveCategory(contract.product_name as string | null)
  if (!catResult.allowed) {
    await writeAuditLog(auth.user, "archive_write_failed", "archive/write", {
      gemc_number, product_name: contract.product_name,
      rejection_reason: "CATEGORY_REJECTED",
      validation_reason: catResult.reason,
      matched_reject_pattern: catResult.matchedRejectPattern,
      approval_token_id: approval.token_id,
    }, req)
    return NextResponse.json(
      {
        error: `Contract ${gemc_number} is outside the configured archive scope.`,
        code: "CATEGORY_REJECTED",
        detail: {
          reason: catResult.reason,
          product_name: contract.product_name,
          gemc_number,
          matched_reject_pattern: catResult.matchedRejectPattern,
          allowed_categories: ARCHIVE_POLICY.approvedCategoryIds,
        },
      },
      { status: 403 }
    )
  }

  // ── Guard 5: max 10 contracts per token ────────────────────────────────────
  const runCount = await db.collection<ContractArchiveRecord>("gem_contract_archives")
    .countDocuments({ enrichment_run_id: approval.token_id })
  if (runCount >= MAX_CONTRACTS_PER_RUN) {
    return NextResponse.json(
      { error: `Maximum ${MAX_CONTRACTS_PER_RUN} contracts per approval token reached.`, code: "LIMIT_EXCEEDED" },
      { status: 403 }
    )
  }

  // ── Audit: start ───────────────────────────────────────────────────────────
  await writeAuditLog(auth.user, "archive_write_start", "archive/write", {
    gemc_number, approval_token_id: approval.token_id,
    product_name: contract.product_name,
    category_id: catResult.categoryId,
    pdf_source_type: pdf_source.type,
  }, req)

  // ── Run pipeline ───────────────────────────────────────────────────────────
  try {
    const provider = getStorageProvider()
    const result   = await archiveContract(provider, {
      gemcNumber:       gemc_number.trim(),
      buyerName:        (contract.buyer_name as string) || (contract.dept_name as string) || "Unknown Buyer",
      buyerState:       (contract.state as string | null) ?? null,
      sellerName:       (contract.seller_name_canonical as string | null) ?? null,
      sellerGstin:      (contract.seller_gst as string | null) ?? null,
      category:         "thermal_fogger",
      productNameRaw:   (contract.product_name as string | null) ?? null,
      contractValueInr: (contract.contract_value_num as number | null) ?? null,
      quantity:         (contract.quantity as number | null) ?? null,
      currentStatus:    (contract.contract_status as string) || "unknown",
      publishDate:      null,
      bidEndDate:       null,
      awardDate:        contract.contract_date_dt
        ? new Date(contract.contract_date_dt as string).toISOString().slice(0, 10)
        : null,
      pdfSource: {
        type:   pdf_source.type as "url" | "upload",
        url:    pdf_source.url,
        base64: pdf_source.base64,
      },
      pdfClass:          (["A", "B", "C"].includes(pdf_class) ? pdf_class : "B") as PdfClass,
      enrichmentRunId:   approval.token_id,
      archivedByUserId:  auth.user.sub,
    })

    if (result.written) {
      await writeAuditLog(auth.user, "archive_write_complete", "archive/write", {
        gemc_number, sha256: result.sha256, size_bytes: result.sizeBytes,
        relative_path: result.relativePath, integrity_verified: result.integrityVerified,
        extraction_status: result.extractionStatus, approval_token_id: approval.token_id,
      }, req)
    }

    return NextResponse.json({
      written:           result.written,
      existed:           result.existed,
      versionConflict:   result.versionConflict,
      gemc_number:       result.gemcNumber,
      sha256:            result.sha256,
      size_bytes:        result.sizeBytes,
      relative_path:     result.relativePath,
      integrity_verified: result.integrityVerified,
      extraction_status: result.extractionStatus,
      status:            result.status,
      archive_record:    result.record,
    })
  } catch (err) {
    const isPdfError = err instanceof PdfValidationError
    await writeAuditLog(auth.user, "archive_write_failed", "archive/write", {
      gemc_number, error: String(err),
      code: isPdfError ? (err as PdfValidationError).code : "PIPELINE_ERROR",
      approval_token_id: approval.token_id,
    }, req)

    if (isPdfError) {
      return NextResponse.json(
        { error: (err as PdfValidationError).message, code: "PDF_INVALID", detail: (err as PdfValidationError).code },
        { status: 400 }
      )
    }
    console.error("[archive/write] pipeline error:", err)
    return NextResponse.json({ error: String(err), code: "PIPELINE_ERROR" }, { status: 500 })
  }
}
