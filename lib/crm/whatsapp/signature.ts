/**
 * Meta webhook signature check (DATA_MODEL §8).
 *
 * `X-Hub-Signature-256: sha256=<64 hex>` is HMAC-SHA256 of the RAW request body, keyed with the
 * subscribed app's secret (CRM_WA_APP_SECRET, trimmed). Compared
 * with timingSafeEqual. Missing secret, missing header or a malformed header all fail closed.
 * Never logs anything (the caller logs the boolean outcome only).
 */
import { createHmac, timingSafeEqual } from "node:crypto"

const HEADER_RE = /^sha256=([0-9a-fA-F]{64})$/

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: "no_secret" | "missing_header" | "malformed_header" | "mismatch" }

function toBuffer(body: string | Uint8Array | ArrayBuffer): Buffer {
  if (typeof body === "string") return Buffer.from(body, "utf8")
  if (body instanceof ArrayBuffer) return Buffer.from(new Uint8Array(body))
  return Buffer.from(body.buffer, body.byteOffset, body.byteLength)
}

/** HMAC-SHA256 hex of `body` with the trimmed secret. Exported for fixtures/tests. */
export function computeWaSignature(body: string | Uint8Array | ArrayBuffer, secret: string): string {
  return createHmac("sha256", secret.trim()).update(toBuffer(body)).digest("hex")
}

export function checkWaSignature(
  rawBody: string | Uint8Array | ArrayBuffer,
  header: string | null | undefined,
  secret: string | null | undefined,
): SignatureCheck {
  const key = typeof secret === "string" ? secret.trim() : ""
  if (!key) return { ok: false, reason: "no_secret" }
  if (typeof header !== "string" || header.trim() === "") return { ok: false, reason: "missing_header" }
  const m = HEADER_RE.exec(header.trim())
  if (!m) return { ok: false, reason: "malformed_header" }
  const expected = Buffer.from(computeWaSignature(rawBody, key), "hex")
  const given = Buffer.from(m[1].toLowerCase(), "hex")
  if (given.length !== expected.length) return { ok: false, reason: "malformed_header" }
  return timingSafeEqual(given, expected) ? { ok: true } : { ok: false, reason: "mismatch" }
}

export function verifyWaSignature(
  rawBody: string | Uint8Array | ArrayBuffer,
  header: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  return checkWaSignature(rawBody, header, secret).ok
}
