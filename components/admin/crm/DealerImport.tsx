"use client"
import { useState } from "react"
import { ApiError, crmFetch, errorText } from "./api"
import { prettyPhone } from "./format"
import { Badge, ErrorBox, btnPrimary, btnSecondary, inputCls } from "./ui"

const FIELDS: { key: string; label: string }[] = [
  { key: "mobile", label: "Mobile *" },
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "altPhone", label: "Alternate phone" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "gst", label: "GST" },
  { key: "notes", label: "Notes" },
]

const CATS: Record<string, { label: string; tone: "green" | "gray" | "amber" | "red" | "violet" }> = {
  new: { label: "New", tone: "green" },
  duplicate_existing_contact: { label: "Already a customer", tone: "violet" },
  duplicate_existing_dealer: { label: "Already in directory", tone: "gray" },
  duplicate_in_batch: { label: "Repeated in file", tone: "amber" },
  invalid_phone: { label: "Bad number", tone: "red" },
}

interface PreviewRow {
  i: number
  raw: Record<string, string>
  phoneE164: string | null
  category: string
  reason?: string
}
interface Preview {
  importId: string
  fileName: string
  total: number
  summary: Record<string, number>
  rows: PreviewRow[]
  truncated: boolean
  columnMap: Record<string, string>
  headers: string[]
}
interface Confirmed {
  alreadyConfirmed: boolean
  counts: { inserted: number; alreadyInDirectory: number; contactsFlagged: number; skippedInvalid: number; skippedDuplicateInBatch: number }
}

export function DealerImport() {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [map, setMap] = useState<Record<string, string>>({})
  const [needMap, setNeedMap] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [done, setDone] = useState<Confirmed | null>(null)
  const [showAll, setShowAll] = useState(false)

  function pick(f: File | null) {
    setFile(f); setPreview(null); setDone(null); setError(null); setNeedMap(false); setMap({})
    setHeaders([])
  }

  async function runPreview(withMap: boolean) {
    if (!file || busy) return
    setBusy(true); setError(null); setDone(null)
    try {
      const fd = new FormData()
      fd.set("file", file)
      const chosen = Object.fromEntries(Object.entries(map).filter(([, v]) => v))
      if (withMap && Object.keys(chosen).length) fd.set("columnMap", JSON.stringify(chosen))
      const p = await crmFetch<Preview>("/api/crm/dealers/import/preview", { method: "POST", body: fd })
      setPreview(p)
      setMap(p.columnMap ?? {})
      setHeaders(p.headers ?? [])
      setNeedMap(false)
    } catch (e) {
      setPreview(null)
      if (e instanceof ApiError && e.headers.length > 0) setHeaders(e.headers)
      if (e instanceof ApiError && e.fields["columnMap.mobile"]) {
        setNeedMap(true)
        setError("We could not find the mobile number column. Please pick the right columns below.")
      } else if (e instanceof ApiError && Object.keys(e.fields).some(k => k.startsWith("columnMap"))) {
        setNeedMap(true)
        setError("One of the chosen columns was not found in the file. Please check your choices.")
      } else if (e instanceof ApiError && e.fields.file === "csv_only") setError("Please upload a .csv file.")
      else if (e instanceof ApiError && e.code === "empty_file") setError("That file is empty.")
      else setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!preview || busy) return
    setBusy(true); setError(null)
    try {
      setDone(await crmFetch<Confirmed>("/api/crm/dealers/import/confirm", { method: "POST", body: JSON.stringify({ importId: preview.importId }) }))
      setPreview(null)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const mapPicker = headers.length > 0 && (
    <div className="grid gap-3 sm:grid-cols-2">
      {FIELDS.map(f => (
        <label key={f.key} className="text-sm">
          <span className="mb-1 block font-medium text-gray-800">{f.label}</span>
          <select className={inputCls} value={map[f.key] ?? ""} onChange={e => setMap(m => ({ ...m, [f.key]: e.target.value }))}>
            <option value="">Not in file</option>
            {headers.map((h, i) => <option key={`${i}:${h}`} value={h}>{h}</option>)}
          </select>
        </label>
      ))}
    </div>
  )

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Dealers import</h1>
      <p className="text-sm text-gray-600">Upload a CSV of dealers. You will see a preview first; nothing is saved until you confirm.</p>

      {error && <ErrorBox>{error}</ErrorBox>}

      {done ? (
        <div className="space-y-2 rounded-xl border border-green-200 bg-white p-5">
          <h2 className="text-lg font-bold">{done.alreadyConfirmed ? "This import was already confirmed" : "Import complete"}</h2>
          <ul className="text-sm text-gray-700">
            <li>{done.counts.inserted} dealers added to the directory</li>
            <li>{done.counts.alreadyInDirectory} were already in the directory</li>
            <li>{done.counts.contactsFlagged} existing customers marked as dealers</li>
            <li>{done.counts.skippedInvalid} skipped (bad number)</li>
            <li>{done.counts.skippedDuplicateInBatch} skipped (repeated in the file)</li>
          </ul>
          <button type="button" className={btnSecondary} onClick={() => { pick(null); }}>Import another file</button>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={e => pick(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          {file && headers.length > 0 && (
            <details open={needMap} className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-medium">Which column is which? (optional)</summary>
              <div className="mt-3">{mapPicker}</div>
            </details>
          )}
          <button type="button" className={btnPrimary} disabled={!file || busy} onClick={() => void runPreview(needMap || Object.values(map).some(Boolean))}>
            {busy && !preview ? "Reading file..." : "Preview"}
          </button>
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700"><strong>{preview.total}</strong> rows in {preview.fileName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(CATS).map(([k, c]) => (
                <Badge key={k} tone={c.tone}>{c.label}: {preview.summary[k] ?? 0}</Badge>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void confirm()}>
                {busy ? "Saving..." : "Confirm import"}
              </button>
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => void runPreview(true)}>Re-run with my column choices</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Name / company</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2">Result</th></tr>
              </thead>
              <tbody>
                {(showAll ? preview.rows : preview.rows.slice(0, 50)).map(r => {
                  const c = CATS[r.category] ?? { label: r.category, tone: "gray" as const }
                  return (
                    <tr key={r.i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-400">{r.i}</td>
                      <td className="px-3 py-2">{[r.raw.name, r.raw.company].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.phoneE164 ? prettyPhone(r.phoneE164) : r.raw.mobile || "—"}</td>
                      <td className="px-3 py-2"><Badge tone={c.tone}>{c.label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {preview.rows.length > 50 && !showAll && (
              <button type="button" className="w-full p-3 text-sm font-medium text-blue-700" onClick={() => setShowAll(true)}>
                Show all {preview.rows.length} previewed rows
              </button>
            )}
            {preview.truncated && <p className="p-3 text-xs text-gray-500">Only the first {preview.rows.length} rows are shown, but {(preview.summary.new ?? 0) + (preview.summary.duplicate_existing_contact ?? 0)} rows in the whole file will be added.</p>}
          </div>
        </div>
      )}
    </section>
  )
}
