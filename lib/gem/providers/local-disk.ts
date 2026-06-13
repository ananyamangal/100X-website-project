/**
 * lib/gem/providers/local-disk.ts
 *
 * StorageProvider implementation backed by the local filesystem.
 * Development and testing only — NOT suitable for production on Vercel
 * (filesystem is read-only except /tmp, which is ephemeral).
 *
 * Base directory: LOCAL_ARCHIVE_BASE env var, or ./archive-local/
 */

import { promises as fs } from "fs"
import * as nodePath from "path"
import type {
  StorageProvider,
  WriteOptions,
  WriteResult,
  FileInfo,
  ListOptions,
  ListResult,
  DeleteResult,
} from "../storage-provider"

function getBase(): string {
  return process.env.LOCAL_ARCHIVE_BASE
    ? nodePath.resolve(process.env.LOCAL_ARCHIVE_BASE)
    : nodePath.join(process.cwd(), "archive-local")
}

export class LocalDiskProvider implements StorageProvider {
  readonly providerId = "local-disk"

  private resolve(relativePath: string): string {
    const base = getBase()
    if (!relativePath || relativePath.includes("..") || nodePath.isAbsolute(relativePath)) {
      throw new Error(`LocalDiskProvider: unsafe path "${relativePath}"`)
    }
    const abs = nodePath.join(base, ...relativePath.split("/"))
    const sep = nodePath.sep
    if (!abs.startsWith(base + sep) && abs !== base) {
      throw new Error(`LocalDiskProvider: path escape for "${relativePath}"`)
    }
    return abs
  }

  async write(relativePath: string, content: Buffer, options: WriteOptions = {}): Promise<WriteResult> {
    const abs = this.resolve(relativePath)

    if (options.ifNotExists) {
      try {
        await fs.access(abs)
        return { written: false, existed: true, storageRef: abs }
      } catch {
        // does not exist — proceed
      }
    }

    await fs.mkdir(nodePath.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content)
    return { written: true, existed: false, storageRef: abs }
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(relativePath))
  }

  async exists(relativePath: string): Promise<boolean> {
    try { await fs.access(this.resolve(relativePath)); return true } catch { return false }
  }

  async delete(relativePath: string): Promise<DeleteResult> {
    try { await fs.unlink(this.resolve(relativePath)); return { deleted: true } }
    catch { return { deleted: false } }
  }

  async list(prefix: string, options: ListOptions = {}): Promise<ListResult> {
    const limit = options.limit ?? 1000
    const base  = getBase()
    const dir   = prefix ? this.resolve(prefix) : base
    const paths: string[] = []

    async function walk(d: string) {
      if (paths.length >= limit) return
      let entries: import("fs").Dirent[]
      try { entries = await fs.readdir(d, { withFileTypes: true }) }
      catch { return }
      for (const e of entries) {
        if (paths.length >= limit) return
        const full = nodePath.join(d, e.name)
        if (e.isDirectory()) { await walk(full) }
        else { paths.push(full.slice(base.length + 1).replace(/\\/g, "/")) }
      }
    }

    await walk(dir)
    return { paths }
  }

  async stat(relativePath: string): Promise<FileInfo | null> {
    try {
      const abs   = this.resolve(relativePath)
      const stats = await fs.stat(abs)
      return {
        relativePath,
        sizeBytes:    stats.size,
        contentType:  "application/octet-stream",
        metadata:     {},
        lastModified: stats.mtime,
      }
    } catch { return null }
  }
}
