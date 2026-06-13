/**
 * lib/gem/pdf-validator.ts
 *
 * Structural PDF validation before any storage write.
 * Checks magic bytes, size bounds, EOF marker, and (for URL fetches) Content-Type.
 * Throws PdfValidationError with a machine-readable code on failure.
 */

export type PdfValidationCode =
  | "EMPTY_BUFFER"
  | "NOT_A_PDF"
  | "TOO_SMALL"
  | "TOO_LARGE"
  | "TRUNCATED"
  | "WRONG_CONTENT_TYPE"
  | "INCOMPLETE_DOWNLOAD"

export class PdfValidationError extends Error {
  readonly code: PdfValidationCode
  constructor(code: PdfValidationCode, message: string) {
    super(message)
    this.name  = "PdfValidationError"
    this.code  = code
  }
}

const MIN_BYTES = 1_024          // 1 KB — smallest valid PDF
const MAX_BYTES = 52_428_800     // 50 MB

export interface FetchMeta {
  contentType?: string | null
  contentLength?: number | null
}

/**
 * Validate a PDF buffer.
 * @param buffer    Raw bytes of the PDF
 * @param fetchMeta Optional HTTP response metadata (for URL downloads)
 */
export function validatePdf(buffer: Buffer, fetchMeta?: FetchMeta): void {
  if (buffer.length === 0) {
    throw new PdfValidationError("EMPTY_BUFFER", "PDF buffer is empty")
  }

  if (buffer.length < MIN_BYTES) {
    throw new PdfValidationError(
      "TOO_SMALL",
      `PDF is ${buffer.length} bytes — under 1 KB minimum (likely invalid or truncated)`
    )
  }

  if (buffer.length > MAX_BYTES) {
    throw new PdfValidationError(
      "TOO_LARGE",
      `PDF is ${(buffer.length / 1_048_576).toFixed(1)} MB — exceeds 50 MB limit`
    )
  }

  const magic = buffer.slice(0, 5).toString("ascii")
  if (magic !== "%PDF-") {
    throw new PdfValidationError(
      "NOT_A_PDF",
      `File does not start with PDF signature — got "${magic.replace(/[^\x20-\x7E]/g, "?")}"`
    )
  }

  // Check for EOF marker in last 1 KB
  const tail    = buffer.slice(Math.max(0, buffer.length - 1024)).toString("latin1")
  const hasEof  = tail.includes("%%EOF") || tail.includes("%EOF")
  if (!hasEof) {
    throw new PdfValidationError(
      "TRUNCATED",
      "PDF appears to be truncated — no %%EOF marker found in last 1 KB"
    )
  }

  if (fetchMeta) {
    const ct = fetchMeta.contentType ?? ""
    if (ct && !ct.startsWith("application/pdf")) {
      throw new PdfValidationError(
        "WRONG_CONTENT_TYPE",
        `URL returned Content-Type "${ct}" — expected application/pdf`
      )
    }

    if (fetchMeta.contentLength != null && fetchMeta.contentLength > 0) {
      if (buffer.length < fetchMeta.contentLength * 0.99) {
        throw new PdfValidationError(
          "INCOMPLETE_DOWNLOAD",
          `Downloaded ${buffer.length} bytes but Content-Length was ${fetchMeta.contentLength} — download may be incomplete`
        )
      }
    }
  }
}
