/**
 * GET /api/admin/procurement/archive/manifest
 *
 * Returns the current archive-manifest.json from storage.
 * Returns { total_contracts: 0, ... } if manifest does not yet exist.
 */

import { NextRequest, NextResponse } from "next/server"
import { requirePermission }         from "@/lib/rbac/server"
import { getStorageProvider }        from "@/lib/gem/providers/factory"
import { ARCHIVE_MANIFEST_PATH, ARCHIVE_SCHEMA_VERSION, ARCHIVE_TOOL_VERSION } from "@/lib/gem/archive-paths"

export const maxDuration = 15

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.archive.view")
  if (!("user" in auth)) return auth

  try {
    const provider = getStorageProvider()
    const exists   = await provider.exists(ARCHIVE_MANIFEST_PATH)

    if (!exists) {
      return NextResponse.json({
        _schema_version:       ARCHIVE_SCHEMA_VERSION,
        _archive_tool_version: ARCHIVE_TOOL_VERSION,
        total_contracts:       0,
        class_counts:          { a: 0, b: 0, c: 0 },
        total_pdf_bytes:       0,
        build_timestamp:       null,
        earliest_archive_date: null,
        latest_archive_date:   null,
        last_updated_by:       null,
        last_enrichment_run_id: null,
      })
    }

    const buf      = await provider.read(ARCHIVE_MANIFEST_PATH)
    const manifest = JSON.parse(buf.toString("utf8"))
    return NextResponse.json(manifest)
  } catch (err) {
    console.error("[archive/manifest] GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
