/**
 * Quotation PDFs (STEP 6): build the layout from the quotation + contact + seller settings and
 * render it (./pdf.ts).
 *
 * - Issued / superseded: rendered ONCE and stored in crm_quotation_pdfs (_id = quotation _id), then
 *   always served from there — the customer's copy never changes, even if the template does.
 *   A failed render leaves pdf:null; the next download renders and stores it (DATA_MODEL §1.12).
 * - Draft: a "DRAFT"-watermarked preview, rendered on request, never stored.
 */
import { createHash } from "node:crypto"
import { Binary, type Document, type ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { isDuplicateKeyError } from "../capture"
import { COLL, type QuotationLine } from "../model"
import { buildLayout, sellerFrom, type BuyerInput, type SellerSettings } from "./layout"
import { renderQuotationPdf } from "./pdf"
import type { QuoteTerms } from "./input"

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)

export async function renderQuotation(crm: CrmDb, q: Document): Promise<Buffer> {
  const [contact, settings] = await Promise.all([
    crm.collection(COLL.contacts).findOne({ _id: q.contactId }, { projection: { name: 1, waProfileName: 1, company: 1, city: 1, state: 1, phoneE164: 1, email: 1 } }),
    crm.collection<{ _id: string; quotation?: SellerSettings }>(COLL.settings).findOne({ _id: crm.workspace }, { projection: { quotation: 1 } }),
  ])
  const buyer: BuyerInput = {
    name: str(contact?.name) ?? str(contact?.waProfileName),
    company: str(contact?.company),
    city: str(contact?.city),
    state: str(contact?.state),
    phoneE164: str(contact?.phoneE164),
    email: str(contact?.email),
  }
  const layout = buildLayout(
    {
      quoteNumber: (q.quoteNumber as string | null) ?? null,
      version: Number(q.version ?? 1),
      status: String(q.status),
      issuedAt: q.issuedAt instanceof Date ? q.issuedAt : null,
      createdAt: q.createdAt instanceof Date ? q.createdAt : new Date(0),
      lines: (q.lines ?? []) as QuotationLine[],
      totals: q.totals as { taxable: number; gst: number; grandTotal: number },
      terms: q.terms as QuoteTerms,
    },
    buyer,
    sellerFrom(settings?.quotation),
  )
  return renderQuotationPdf(layout)
}

export interface StoredPdf {
  data: Buffer
  sha256: string
  bytes: number
  generatedAt: Date
}

/** Stored PDF of an issued / superseded quotation, rendering and storing it on first use. */
export async function ensureIssuedPdf(crm: CrmDb, q: Document, now: Date = new Date()): Promise<StoredPdf> {
  if (q.status === "draft") throw new Error("drafts have no stored PDF")
  const pdfs = crm.collection(COLL.quotationPdfs)
  const existing = await pdfs.findOne({ _id: q._id as ObjectId })
  if (existing) return toStored(existing)
  const data = await renderQuotation(crm, q)
  const doc = { _id: q._id as ObjectId, data: new Binary(data), bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), generatedAt: now }
  try {
    await pdfs.insertOne(doc)
  } catch (e) {
    // A concurrent first download stored it first: serve that copy.
    if (!isDuplicateKeyError(e)) throw e
    const raced = await pdfs.findOne({ _id: q._id as ObjectId })
    if (raced) return toStored(raced)
    throw e
  }
  await crm.collection(COLL.quotations).updateOne(
    { _id: q._id, pdf: null },
    { $set: { pdf: { storage: "db", cloudinaryPublicId: null, bytes: doc.bytes, sha256: doc.sha256, generatedAt: now } } },
  )
  return { data, sha256: doc.sha256, bytes: doc.bytes, generatedAt: now }
}

function toStored(row: Document): StoredPdf {
  const bin = row.data as Binary | Uint8Array
  const data = bin instanceof Binary ? Buffer.from(bin.buffer) : Buffer.from(bin)
  return { data, sha256: String(row.sha256), bytes: Number(row.bytes), generatedAt: row.generatedAt as Date }
}
