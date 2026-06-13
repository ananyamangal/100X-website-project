/**
 * lib/gem/providers/factory.ts
 *
 * Returns the correct StorageProvider for the current environment.
 * Production with BLOB_READ_WRITE_TOKEN → VercelBlobProvider
 * Otherwise → LocalDiskProvider (development / fallback)
 */

import type { StorageProvider } from "../storage-provider"
import { LocalDiskProvider }  from "./local-disk"
import { VercelBlobProvider } from "./vercel-blob"

let _cached: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (_cached) return _cached

  const isProduction = process.env.NODE_ENV === "production"
  const hasToken     = !!process.env.BLOB_READ_WRITE_TOKEN

  if (isProduction && !hasToken) {
    console.warn("[archive] BLOB_READ_WRITE_TOKEN not set in production — falling back to LocalDiskProvider. Files will be stored in /tmp and will NOT persist across function invocations.")
  }

  _cached = hasToken ? new VercelBlobProvider() : new LocalDiskProvider()
  return _cached
}

/** For testing only — inject a custom provider */
export function _setStorageProvider(p: StorageProvider) { _cached = p }
export function _resetStorageProvider() { _cached = null }
