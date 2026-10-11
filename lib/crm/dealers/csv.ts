/**
 * Small dependency-free CSV reader for the dealer-directory import (STEP 3e).
 *
 * Handles: UTF-8 BOM, UTF-16 LE/BE with BOM (Excel "Unicode Text"), CRLF / LF / CR line ends,
 * quoted fields with commas, doubled quotes ("") and line breaks inside quotes, a delimiter
 * auto-detected from the header line (comma, semicolon — Excel in comma-decimal locales — or
 * tab), Excel's ="0987…" text-forcing wrapper, trailing blank lines and fully blank rows.
 * An unterminated quote consumes to end of input (reported via `unterminatedQuote`).
 */

export interface CsvParseResult {
  headers: string[]
  rows: string[][]
  delimiter: "," | ";" | "\t"
  unterminatedQuote: boolean
}

/** Bytes → text. BOM-aware; defaults to UTF-8 (invalid sequences become U+FFFD, never throw). */
export function decodeCsvBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2))
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2))
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes.subarray(3))
  return new TextDecoder("utf-8").decode(bytes)
}

/** Picks the delimiter that occurs most often (outside quotes) on the first non-blank line. */
export function detectDelimiter(text: string): "," | ";" | "\t" {
  const counts = { ",": 0, ";": 0, "\t": 0 }
  let inQ = false
  let seen = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') inQ = !inQ
    else if (!inQ && (ch === "\n" || ch === "\r")) {
      if (seen) break
    } else if (!inQ && (ch === "," || ch === ";" || ch === "\t")) {
      counts[ch]++
      seen = true
    } else if (!inQ && ch.trim()) seen = true
  }
  if (counts["\t"] > counts[","] && counts["\t"] >= counts[";"]) return "\t"
  if (counts[";"] > counts[","]) return ";"
  return ","
}

/** Excel-exported `="00123"` text wrapper → `00123`; otherwise trimmed. */
export function cleanCell(v: string): string {
  const t = v.trim()
  const m = /^="(.*)"$/.exec(t)
  return (m ? m[1] : t).trim()
}

export function parseCsv(input: string, opts: { delimiter?: "," | ";" | "\t"; maxRows?: number } = {}): CsvParseResult {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const d = opts.delimiter ?? detectDelimiter(text)
  const maxRows = opts.maxRows ?? Infinity
  const records: string[][] = []
  let row: string[] = []
  let field = ""
  let inQ = false
  let i = 0

  const endField = () => {
    row.push(field)
    field = ""
  }
  const endRow = () => {
    endField()
    if (row.some(c => cleanCell(c) !== "")) records.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQ = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      // A quote opens a quoted section anywhere in the field. Excel's ="0987…" wrapper: drop the "=".
      if (field.trim() === "=") field = ""
      inQ = true
      i++
      continue
    }
    if (ch === d) {
      endField()
      i++
      continue
    }
    if (ch === "\r" || ch === "\n") {
      endRow()
      if (records.length > maxRows + 1) break // header + maxRows + 1: the caller sees "too many"
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1
      continue
    }
    field += ch
    i++
  }
  const unterminatedQuote = inQ
  if (field !== "" || row.length > 0) endRow()

  const [head = [], ...rest] = records
  const headers = head.map(h => cleanCell(h))
  return { headers, rows: rest.map(r => r.map(cleanCell)), delimiter: d, unterminatedQuote }
}
