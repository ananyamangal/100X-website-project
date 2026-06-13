/**
 * lib/gem/providers/vercel-blob.ts
 *
 * StorageProvider implementation backed by Vercel Blob (private bucket).
 * Requires BLOB_READ_WRITE_TOKEN environment variable.
 * Production storage for contract PDFs and metadata.
 */

import { put, del, list, head } from "@vercel/blob"
import type {
  StorageProvider,
  WriteOptions,
  WriteResult,
  FileInfo,
  ListOptions,
  ListResult,
  DeleteResult,
} from "../storage-provider"

function token(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN
  if (!t) throw new Error("BLOB_READ_WRITE_TOKEN is not set — VercelBlobProvider requires this env var")
  return t
}

export class VercelBlobProvider implements StorageProvider {
  readonly providerId = "vercel-blob"

  async write(relativePath: string, content: Buffer, options: WriteOptions = {}): Promise<WriteResult> {
    if (options.ifNotExists) {
      try {
        const existing = await head(relativePath, { token: token() })
        if (existing) return { written: false, existed: true, storageRef: existing.url }
      } catch {
        // not found — proceed
      }
    }

    const blob = await put(relativePath, content, {
      access:          "private",
      addRandomSuffix: false,
      contentType:     options.contentType ?? "application/octet-stream",
      token:           token(),
    })

    return { written: true, existed: false, storageRef: blob.url }
  }

  async read(relativePath: string): Promise<Buffer> {
    const result = await list({ prefix: relativePath, limit: 1, token: token() })
    const blob   = result.blobs.find(b => b.pathname === relativePath)
    if (!blob) throw new Error(`VercelBlobProvider: not found "${relativePath}"`)

    const res = await fetch(blob.downloadUrl)
    if (!res.ok) throw new Error(`VercelBlobProvider: fetch failed ${res.status} for "${relativePath}"`)
    return Buffer.from(await res.arrayBuffer())
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const result = await list({ prefix: relativePath, limit: 1, token: token() })
      return result.blobs.some(b => b.pathname === relativePath)
    } catch { return false }
  }

  async delete(relativePath: string): Promise<DeleteResult> {
    try {
      const result = await list({ prefix: relativePath, limit: 1, token: token() })
      const blob   = result.blobs.find(b => b.pathname === relativePath)
      if (!blob) return { deleted: false }
      await del(blob.url, { token: token() })
      return { deleted: true }
    } catch { return { deleted: false } }
  }

  async list(prefix: string, options: ListOptions = {}): Promise<ListResult> {
    const limit  = options.limit ?? 1000
    const cursor = options.cursor
    const result = await list({
      prefix,
      limit,
      cursor,
      token: token(),
    })
    return {
      paths:      result.blobs.map(b => b.pathname),
      nextCursor: result.cursor,
    }
  }

  async stat(relativePath: string): Promise<FileInfo | null> {
    try {
      const result = await list({ prefix: relativePath, limit: 1, token: token() })
      const blob   = result.blobs.find(b => b.pathname === relativePath)
      if (!blob) return null
      return {
        relativePath,
        sizeBytes:    blob.size,
        contentType:  "application/octet-stream",
        metadata:     {},
        lastModified: new Date(blob.uploadedAt),
      }
    } catch { return null }
  }
}
