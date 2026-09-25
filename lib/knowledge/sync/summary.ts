import type { SourceResult } from "./jobs"

/** Plain-language result line for one source, e.g. "42 blog posts synced: 34 published, 8 held as drafts for review · 0 errors". */
export function summarizeSource(r: SourceResult, label: string): string {
  const detail: string[] = []
  if (r.published) detail.push(`${r.published} published`)
  if (r.drafted) detail.push(`${r.drafted} held as drafts for review`)
  if (r.unchanged) detail.push(`${r.unchanged} unchanged`)
  if (r.skippedLocked) detail.push(`${r.skippedLocked} skipped (edited by an admin)`)
  if (r.unpublished) detail.push(`${r.unpublished} taken offline (source removed)`)
  const head = `${r.scanned} ${label.toLowerCase()} synced`
  return `${head}${detail.length ? `: ${detail.join(", ")}` : ""} · ${r.errors.length} error${r.errors.length === 1 ? "" : "s"}`
}
