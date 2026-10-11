/**
 * Draws a quotation Layout (./layout.ts) as an A4 PDF with pdfkit. Fonts are embedded from
 * ./fonts.generated.ts (Noto Sans Latin + Latin-ext + Noto Sans Devanagari, OFL): no font file is
 * read from disk, and pdfkit's built-in Helvetica (AFM files) is never loaded — the default font is
 * one of ours. Mixed-script text (e.g. a Hindi customer name, the ₹ sign) is split into runs and
 * each run uses a font that has its glyphs.
 *
 * Output is deterministic for the same layout (fixed CreationDate/ModDate and document id), so a
 * re-render of an issued quotation is byte-identical.
 */
import { createHash } from "node:crypto"
import PDFDocument from "pdfkit"
import * as fontkit from "fontkit"
import * as F from "./fonts.generated"
import type { Layout } from "./layout"

type Weight = "regular" | "bold"
type Face = "latin" | "ext" | "deva"

let fontCache: Record<string, Buffer> | null = null
function fonts(): Record<string, Buffer> {
  if (!fontCache) {
    const b = (s: string) => Buffer.from(s, "base64")
    fontCache = {
      "latin-regular": b(F.latin400),
      "latin-bold": b(F.latin700),
      "ext-regular": b(F.latinExt400),
      "ext-bold": b(F.latinExt700),
      "deva-regular": b(F.deva400),
      "deva-bold": b(F.deva700),
    }
  }
  return fontCache
}

const DEVA = /[ऀ-ॿ᳐-᳿꣠-ꣿ‌‍◌]/

let coverage: Record<Face, { hasGlyphForCodePoint(cp: number): boolean }> | null = null
function cover(): Record<Face, { hasGlyphForCodePoint(cp: number): boolean }> {
  if (!coverage) {
    const fb = fonts()
    coverage = { latin: fontkit.create(fb["latin-regular"]), ext: fontkit.create(fb["ext-regular"]), deva: fontkit.create(fb["deva-regular"]) }
  }
  return coverage
}

/**
 * Splits text into [face, run] pairs by real glyph coverage. Devanagari (and ₹ next to it) uses the
 * Devanagari face; everything else the first face that has the glyph (latin → latin-ext →
 * devanagari). A character the current run's face can draw (space, punctuation) stays in that run,
 * so shaping is not broken up.
 */
export function scriptRuns(text: string): [Face, string][] {
  const c = cover()
  const out: [Face, string][] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number
    const prev = out.length ? out[out.length - 1][0] : null
    let f: Face
    if (DEVA.test(ch)) f = "deva"
    else if (prev && c[prev].hasGlyphForCodePoint(cp) && !/[A-Za-z0-9]/.test(ch)) f = prev
    else if (c.latin.hasGlyphForCodePoint(cp)) f = "latin"
    else if (c.ext.hasGlyphForCodePoint(cp)) f = "ext"
    else if (c.deva.hasGlyphForCodePoint(cp)) f = "deva"
    else f = "latin" // no glyph anywhere: pdfkit draws .notdef
    if (prev === f) out[out.length - 1][1] += ch
    else out.push([f, ch])
  }
  return out
}

const A4 = { w: 595.28, h: 841.89 }
const M = 40 // margin
const INK = "#1f2937"
const MUTED = "#6b7280"
const RULE = "#d1d5db"
const BRAND = "#0f766e"

export async function renderQuotationPdf(layout: Layout): Promise<Buffer> {
  const fb = fonts()
  const doc = new PDFDocument({
    size: "A4",
    margin: M,
    // pdfkit accepts a font Buffer here (no AFM read); @types/pdfkit 0.17 only declares string.
    font: fb["latin-regular"] as unknown as string,
    info: { Title: layout.info.title, Author: layout.seller.name, Creator: "100X CRM", Producer: "100X CRM", CreationDate: layout.info.createdAt, ModDate: layout.info.createdAt },
    autoFirstPage: true,
    bufferPages: true,
  })
  for (const [k, v] of Object.entries(fb)) doc.registerFont(k, v)
  // Deterministic document id (pdfkit derives one from the time otherwise).
  ;(doc as unknown as { _id?: Buffer })._id = createHash("md5").update(layout.info.title + layout.info.createdAt.toISOString()).digest()

  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))
  const done = new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve())
    doc.on("error", reject)
  })

  /** Draws mixed-script text in a box. */
  const text = (s: string, x: number, y: number, o: { width?: number; size?: number; weight?: Weight; color?: string; align?: "left" | "right" | "center" } = {}) => {
    const size = o.size ?? 9
    const weight = o.weight ?? "regular"
    doc.fillColor(o.color ?? INK).fontSize(size)
    const runs = scriptRuns(s)
    if (o.align && o.align !== "left") {
      // Single-line right/centre alignment: measure every run in its own font, then place the runs
      // one after another (a single font for the whole string would lose glyphs, e.g. digits next to ₹).
      const widths = runs.map(([face, run]) => doc.font(`${face}-${weight}`).widthOfString(run))
      const total = widths.reduce((a, b) => a + b, 0)
      const box = o.width ?? total
      let cx = o.align === "right" ? x + box - total : x + (box - total) / 2
      runs.forEach(([face, run], i) => {
        doc.font(`${face}-${weight}`).text(run, cx, y, { lineBreak: false })
        cx += widths[i]
      })
      return
    }
    runs.forEach(([face, run], i) => {
      doc.font(`${face}-${weight}`)
      const last = i === runs.length - 1
      if (i === 0) doc.text(run, x, y, { width: o.width, continued: !last })
      else doc.text(run, { continued: !last })
    })
  }
  const heightOf = (s: string, width: number, size = 9) => {
    doc.font("latin-regular").fontSize(size)
    return doc.heightOfString(s, { width })
  }
  const rule = (y: number, color = RULE) => doc.moveTo(M, y).lineTo(A4.w - M, y).lineWidth(0.6).strokeColor(color).stroke()

  // ── header ──
  let y = M
  text(layout.seller.name, M, y, { size: 15, weight: "bold", color: BRAND })
  text(layout.title, A4.w - M - 200, y + 2, { width: 200, size: 15, weight: "bold", align: "right" })
  y += 22
  for (const l of layout.seller.lines) {
    text(l, M, y, { size: 8.5, color: MUTED, width: 330 })
    y += 12
  }
  let my = M + 24
  for (const [k, v] of layout.meta) {
    text(k, A4.w - M - 200, my, { width: 80, size: 8.5, color: MUTED })
    text(v, A4.w - M - 120, my, { width: 120, size: 8.5, weight: "bold", align: "right" })
    my += 13
  }
  y = Math.max(y, my) + 8
  rule(y, BRAND)
  y += 10

  // ── buyer ──
  text(layout.buyer.heading, M, y, { size: 8.5, color: MUTED })
  y += 12
  for (const [i, l] of layout.buyer.lines.entries()) {
    text(l, M, y, { size: 9.5, weight: i === 0 ? "bold" : "regular", width: 330 })
    y += 13
  }
  y += 8

  // ── table ──
  const cols = [18, 205, 52, 30, 62, 32, 58, 58] // sums to 515 (A4 width minus margins)
  const xs = cols.reduce<number[]>((a, w, i) => (a.push(i === 0 ? M : a[i - 1] + cols[i - 1]), a), [])
  const right = new Set([3, 4, 5, 6, 7])
  const drawHead = () => {
    doc.rect(M, y, A4.w - 2 * M, 18).fill("#f3f4f6")
    layout.table.head.forEach((h, i) => text(h, xs[i] + 3, y + 5, { width: cols[i] - 6, size: 8, weight: "bold", align: right.has(i) ? "right" : "left" }))
    y += 20
  }
  drawHead()
  for (const row of layout.table.rows) {
    const h = Math.max(14, heightOf(row[1], cols[1] - 6, 8.5) + 6)
    if (y + h > A4.h - M - 150) {
      doc.addPage()
      y = M
      drawHead()
    }
    row.forEach((c, i) => {
      if (i === 1) {
        const [model, ...desc] = c.split("\n")
        text(model, xs[i] + 3, y + 3, { width: cols[i] - 6, size: 8.5, weight: "bold" })
        if (desc.length) text(desc.join("\n"), xs[i] + 3, y + 14, { width: cols[i] - 6, size: 8, color: MUTED })
      } else text(c, xs[i] + 3, y + 3, { width: cols[i] - 6, size: 8.5, align: right.has(i) ? "right" : "left" })
    })
    y += h + (row[1].includes("\n") ? 8 : 0)
    rule(y - 2)
  }

  // ── totals ──
  if (y > A4.h - M - 190) {
    doc.addPage()
    y = M
  }
  y += 6
  const tx = A4.w - M - 220
  for (const [k, v] of layout.tax) {
    text(k, tx, y, { width: 110, size: 9, color: MUTED })
    text(v, tx + 110, y, { width: 110, size: 9, align: "right" })
    y += 14
  }
  doc.rect(tx, y, 220, 20).fill("#ecfdf5")
  text(layout.grandTotal[0], tx + 6, y + 6, { width: 120, size: 9, weight: "bold" })
  text(layout.grandTotal[1], tx + 110, y + 5, { width: 104, size: 10.5, weight: "bold", align: "right", color: BRAND })
  y += 28
  text(layout.amountInWords, M, y, { width: A4.w - 2 * M, size: 8.5, color: MUTED })
  y += heightOf(layout.amountInWords, A4.w - 2 * M, 8.5) + 10

  // ── terms + bank ──
  if (layout.terms.length) {
    text("Terms & conditions", M, y, { size: 9, weight: "bold" })
    y += 14
    for (const [k, v] of layout.terms) {
      if (y > A4.h - M - 60) {
        doc.addPage()
        y = M
      }
      text(`${k}:`, M, y, { width: 90, size: 8.5, color: MUTED })
      text(v, M + 92, y, { width: A4.w - 2 * M - 92, size: 8.5 })
      y += Math.max(12, heightOf(v, A4.w - 2 * M - 92, 8.5) + 3)
    }
    y += 6
  }
  if (layout.bank.length) {
    text("Bank details", M, y, { size: 9, weight: "bold" })
    y += 14
    for (const l of layout.bank) {
      text(l, M, y, { size: 8.5 })
      y += 12
    }
  }

  // ── footer + watermark on every page ──
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    if (layout.watermark) {
      doc.save()
      doc.rotate(-35, { origin: [A4.w / 2, A4.h / 2] })
      doc.font("latin-bold").fontSize(110).fillColor("#e5e7eb").opacity(0.6).text(layout.watermark, 0, A4.h / 2 - 60, { width: A4.w, align: "center", lineBreak: false })
      doc.restore()
      doc.opacity(1)
    }
    const fy = A4.h - M - 30
    rule(fy - 6)
    text(layout.footer[0], M, fy, { size: 8, weight: "bold", width: 360 })
    text(layout.footer.slice(1).join("  "), M, fy + 10, { size: 7.5, color: MUTED, width: 360 })
    text(`Page ${i - range.start + 1} of ${range.count}`, A4.w - M - 100, fy + 10, { width: 100, size: 7.5, color: MUTED, align: "right" })
  }

  doc.end()
  await done
  return Buffer.concat(chunks)
}
