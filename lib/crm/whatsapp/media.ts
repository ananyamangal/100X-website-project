/**
 * Inbound WhatsApp media → Cloudinary (DATA_MODEL §1.6 "Media").
 *
 * GET https://graph.facebook.com/<ver>/<media-id> (Bearer CRM_WA_ACCESS_TOKEN) → { url, mime_type,
 * file_size } → GET that url with the same bearer → bytes (16 MB cap) → uploader (default: the
 * existing lib/cloudinaryUpload.ts helper). `fetch` and the uploader are injectable so tests never
 * call Meta or Cloudinary.
 *
 * Logging rule: the Meta media URL, the bearer token and the Cloudinary URL are NEVER put in an
 * error message. Errors carry only an HTTP status and Meta's error code/type/message/fbtrace_id.
 */
import { uploadToCloudinary } from "../../cloudinaryUpload"

export const MEDIA_MAX_BYTES = 16 * 1024 * 1024
/** Meta media ids expire after ~30 days; a retry after that is pointless. */
export const MEDIA_ID_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const DEFAULT_GRAPH_API_VERSION = "v23.0"

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }) => Promise<Response>

export const MEDIA_LOOKUP_TIMEOUT_MS = 10_000
export const MEDIA_DOWNLOAD_TIMEOUT_MS = 45_000
/** Hosts Meta serves media downloads from. The bearer token is sent to no other host. */
const TRUSTED_DOWNLOAD_SUFFIXES = [".fbsbx.com", ".whatsapp.net"]

export function isTrustedMediaDownloadUrl(u: string): boolean {
  let url: URL
  try {
    url = new URL(u)
  } catch {
    return false
  }
  if (url.protocol !== "https:" || url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  return TRUSTED_DOWNLOAD_SUFFIXES.some(sfx => host.endsWith(sfx) && host.length > sfx.length)
}

const isAbort = (e: unknown) => e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")

/** Reads a body counting bytes; stops (and cancels) once it passes `max`. null = over the cap. */
async function readCapped(res: Response, max: number): Promise<Uint8Array | null> {
  if (!res.body) {
    const b = new Uint8Array(await res.arrayBuffer())
    return b.byteLength > max ? null : b
  }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.byteLength
  }
  return out
}

export type MediaKind = "image" | "document" | "audio" | "video" | "sticker"

export interface UploadInput {
  bytes: Uint8Array
  mime: string
  filename: string
  kind: MediaKind
  /** "crm/fogging/<yyyy-mm>" — advisory; the default unsigned-preset uploader cannot set it. */
  folder: string
}
export interface UploadResult {
  url: string
  publicId: string | null
}
export type MediaUploader = (input: UploadInput) => Promise<UploadResult>

export class MediaError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly httpStatus: number | null
  readonly meta: { code?: number; subcode?: number; type?: string; message?: string; fbtraceId?: string } | null
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    httpStatus: number | null = null,
    meta: MediaError["meta"] = null,
  ) {
    super(message)
    this.name = "MediaError"
    this.code = code
    this.retryable = retryable
    this.httpStatus = httpStatus
    this.meta = meta
  }
}

/** Meta error codes that are worth retrying (rate limits, temporary/unknown service errors). */
const RETRYABLE_META_CODES = new Set([1, 2, 4, 17, 341, 80007, 130429, 131000, 131016])

const URLISH = /https?:\/\/\S+/gi
const scrub = (s: unknown): string | undefined => (typeof s === "string" ? s.replace(URLISH, "[url]").slice(0, 300) : undefined)

async function metaErrorOf(res: Response): Promise<MediaError["meta"]> {
  try {
    const body = (await res.json()) as { error?: Record<string, unknown> }
    const e = body && typeof body === "object" ? body.error : undefined
    if (!e || typeof e !== "object") return null
    return {
      code: typeof e.code === "number" ? e.code : undefined,
      subcode: typeof e.error_subcode === "number" ? e.error_subcode : undefined,
      type: scrub(e.type),
      message: scrub(e.message),
      fbtraceId: scrub(e.fbtrace_id),
    }
  } catch {
    return null
  }
}

function httpFailure(step: string, res: Response, meta: MediaError["meta"]): MediaError {
  const retryable =
    res.status >= 500 || res.status === 429 || res.status === 408 || (meta?.code !== undefined && RETRYABLE_META_CODES.has(meta.code))
  return new MediaError(`${step}_http_${res.status}`, `${step} failed with HTTP ${res.status}${meta?.code ? ` (meta ${meta.code})` : ""}`, retryable, res.status, meta)
}

export function cloudinaryResourceType(kind: MediaKind, mime: string): "image" | "video" | "raw" {
  if (kind === "image" || kind === "sticker") return "image"
  if (kind === "video" || kind === "audio") return "video" // Cloudinary stores audio under "video"
  return /^(image)\//i.test(mime) ? "image" : "raw"
}

/** Default uploader: the existing 100X helper (unsigned preset; returns secure_url only). */
export const defaultMediaUploader: MediaUploader = async input => {
  const file = new File([input.bytes as BlobPart], input.filename, { type: input.mime })
  const url = await uploadToCloudinary(file, cloudinaryResourceType(input.kind, input.mime))
  return { url, publicId: null }
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "application/pdf": "pdf",
}

export function mediaFilename(waMediaId: string, mime: string, given: string | null): string {
  if (given && given.trim()) return given.trim().replace(/[\\/\0]/g, "_").slice(0, 120)
  const base = mime.split(";")[0].trim().toLowerCase()
  return `wa-${waMediaId}.${EXT[base] ?? "bin"}`
}

export interface FetchMediaInput {
  waMediaId: string
  mime: string
  filename: string | null
  kind: MediaKind
  waTimestamp: Date | null
}

export interface FetchMediaDeps {
  accessToken: string | undefined
  apiVersion?: string
  fetch?: FetchLike
  upload?: MediaUploader
  now?: Date
}

export type FetchMediaResult =
  | { storage: "stored"; url: string; publicId: string | null; bytes: number; mime: string }
  | { storage: "too_large"; bytes: number | null; mime: string }

/** Downloads one Meta media object and uploads it. Throws MediaError (never with URLs/tokens). */
export async function fetchAndStoreMedia(input: FetchMediaInput, deps: FetchMediaDeps): Promise<FetchMediaResult> {
  const token = deps.accessToken?.trim()
  if (!token) throw new MediaError("no_access_token", "CRM_WA_ACCESS_TOKEN is not set", false)
  const now = deps.now ?? new Date()
  if (input.waTimestamp && now.getTime() - input.waTimestamp.getTime() > MEDIA_ID_TTL_MS) {
    throw new MediaError("media_expired", "Meta media id older than 30 days", false)
  }
  const f: FetchLike = deps.fetch ?? ((u, i) => fetch(u, i))
  const version = (deps.apiVersion?.trim() || DEFAULT_GRAPH_API_VERSION).replace(/^\/+|\/+$/g, "")
  const auth = { Authorization: `Bearer ${token}` }

  // 1. Resolve the short-lived download URL.
  let metaRes: Response
  try {
    metaRes = await f(`https://graph.facebook.com/${version}/${encodeURIComponent(input.waMediaId)}`, {
      method: "GET",
      headers: auth,
      signal: AbortSignal.timeout(MEDIA_LOOKUP_TIMEOUT_MS),
    })
  } catch (e) {
    if (isAbort(e)) throw new MediaError("media_lookup_timeout", "media lookup timed out", true)
    throw new MediaError("media_lookup_network", "media lookup network error", true)
  }
  if (!metaRes.ok) throw httpFailure("media_lookup", metaRes, await metaErrorOf(metaRes))
  let info: { url?: unknown; mime_type?: unknown; file_size?: unknown }
  try {
    info = (await metaRes.json()) as typeof info
  } catch {
    throw new MediaError("media_lookup_bad_json", "media lookup returned invalid JSON", true)
  }
  const downloadUrl = typeof info.url === "string" ? info.url : ""
  if (!/^https:\/\//i.test(downloadUrl)) throw new MediaError("media_lookup_no_url", "media lookup returned no https url", false)
  if (!isTrustedMediaDownloadUrl(downloadUrl)) {
    // Never send the bearer token to an unexpected host.
    throw new MediaError("media_url_untrusted_host", "media download host is not a Meta media host", false)
  }
  const mime = typeof info.mime_type === "string" && info.mime_type ? info.mime_type : input.mime
  const declared = typeof info.file_size === "number" ? info.file_size : Number(info.file_size)
  if (Number.isFinite(declared) && declared > MEDIA_MAX_BYTES) return { storage: "too_large", bytes: declared, mime }

  // 2. Download the bytes (same bearer; the URL itself is never logged).
  let dl: Response
  try {
    dl = await f(downloadUrl, { method: "GET", headers: auth, signal: AbortSignal.timeout(MEDIA_DOWNLOAD_TIMEOUT_MS) })
  } catch (e) {
    if (isAbort(e)) throw new MediaError("media_download_timeout", "media download timed out", true)
    throw new MediaError("media_download_network", "media download network error", true)
  }
  if (!dl.ok) throw httpFailure("media_download", dl, null)
  const lenHeader = dl.headers.get("content-length")
  const len = lenHeader === null ? NaN : Number(lenHeader)
  if (Number.isFinite(len) && len > MEDIA_MAX_BYTES) {
    await dl.body?.cancel().catch(() => {})
    return { storage: "too_large", bytes: len, mime }
  }
  let bytes: Uint8Array | null
  try {
    bytes = await readCapped(dl, MEDIA_MAX_BYTES) // counts bytes even when content-length is missing
  } catch (e) {
    if (isAbort(e)) throw new MediaError("media_download_timeout", "media download timed out", true)
    throw new MediaError("media_download_network", "media download interrupted", true)
  }
  if (!bytes) return { storage: "too_large", bytes: null, mime }

  // 3. Upload.
  const upload = deps.upload ?? defaultMediaUploader
  const month = now.toISOString().slice(0, 7)
  let up: UploadResult
  try {
    up = await upload({
      bytes,
      mime,
      filename: mediaFilename(input.waMediaId, mime, input.filename),
      kind: input.kind,
      folder: `crm/fogging/${month}`,
    })
  } catch {
    throw new MediaError("cloudinary_upload_failed", "Cloudinary upload failed", true)
  }
  if (!up || typeof up.url !== "string" || !up.url) throw new MediaError("cloudinary_no_url", "Cloudinary returned no url", true)
  return { storage: "stored", url: up.url, publicId: up.publicId ?? null, bytes: bytes.byteLength, mime }
}
