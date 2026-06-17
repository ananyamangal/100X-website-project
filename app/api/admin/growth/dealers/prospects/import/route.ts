/**
 * Dealer Prospect CSV Import
 * POST /api/admin/growth/dealers/prospects/import  — parse + upsert CSV
 * GET  /api/admin/growth/dealers/prospects/import  — download CSV template
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"
const COLL = "dealer_prospects"

const CSV_TEMPLATE = `dealer_name,contact_person,mobile,email,city,state,gst,source,notes
"ABC Distributors Pvt Ltd","Rajesh Kumar","9876543210","rajesh@abcdist.com","Lucknow","Uttar Pradesh","09ABCDE1234F1Z5","indiamart","High potential UP dealer"
"XYZ Trade Links","Priya Sharma","8765432109","priya@xyztrade.in","Jaipur","Rajasthan","08FGHIJ5678K2Y6","trade_association","Rajasthan distributor network"
`

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse a single CSV field (handles quoted fields with commas inside)
  function parseFields(line: string): string[] {
    const fields: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"' && !inQuotes)            { inQuotes = true;  continue }
      if (ch === '"' &&  inQuotes && line[i+1] === '"') { current += '"'; i++; continue }
      if (ch === '"' &&  inQuotes)            { inQuotes = false; continue }
      if (ch === ',' && !inQuotes)            { fields.push(current.trim()); current = ""; continue }
      current += ch
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseFields(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"))
  return lines.slice(1).map(line => {
    const vals = parseFields(line)
    const rec: Record<string, string> = {}
    headers.forEach((h, i) => { rec[h] = vals[i] ?? "" })
    return rec
  }).filter(r => Object.values(r).some(v => v.trim()))
}

function normalizePhone(raw: string): string {
  if (!raw) return ""
  const digits = String(raw).replace(/\D/g, "")
  if (digits.length === 10) return digits
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2)
  if (digits.startsWith("0")  && digits.length === 11) return digits.slice(1)
  return digits.length >= 7 ? digits : ""
}

// Field aliases: accept IndiaMART and common naming variants
const FIELD_MAP: Record<string, string[]> = {
  dealer_name:    ["dealer_name", "company_name", "company", "firm_name", "business_name", "organization"],
  contact_person: ["contact_person", "contact", "person", "name", "contact_name", "person_name"],
  mobile:         ["mobile", "phone", "mobile_number", "phone_number", "contact_number", "cell"],
  email:          ["email", "email_id", "email_address"],
  city:           ["city", "location", "town"],
  state:          ["state", "state_name", "province"],
  gst:            ["gst", "gstin", "gst_number", "gst_no"],
  source:         ["source", "data_source", "import_source"],
  notes:          ["notes", "remarks", "comments", "note"],
}

function mapField(row: Record<string, string>, targetField: string): string {
  const aliases = FIELD_MAP[targetField] || [targetField]
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== "") return row[alias]
  }
  return ""
}

// ── GET — CSV template ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  return new NextResponse(CSV_TEMPLATE, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dealer-prospects-template.csv"`,
    },
  })
}

// ── POST — CSV import ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const contentType = req.headers.get("content-type") || ""
    let csvText: string

    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      csvText = await req.text()
    } else if (contentType.includes("application/json")) {
      const body = await req.json() as { csv?: string }
      csvText = body.csv || ""
    } else {
      return NextResponse.json({ error: "Send CSV as body with Content-Type: text/csv, or JSON with {csv: '...'}" }, { status: 400 })
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "Empty CSV body" }, { status: 400 })
    }

    const rows = parseCSV(csvText)
    if (!rows.length) {
      return NextResponse.json({ error: "No data rows found. Check that CSV has a header row." }, { status: 400 })
    }

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()
    const importSource = "csv_import"

    const ops = rows.map(row => {
      const dealerName    = mapField(row, "dealer_name")
      const contactPerson = mapField(row, "contact_person")
      const rawPhone      = mapField(row, "mobile")
      const email         = mapField(row, "email").toLowerCase().trim()
      const city          = mapField(row, "city")
      const state         = mapField(row, "state")
      const gst           = mapField(row, "gst").toUpperCase().trim()
      const source        = mapField(row, "source") || importSource
      const notes         = mapField(row, "notes")
      const mobile        = normalizePhone(rawPhone)

      const dealer_score =
        (email   ? 30 : 0) +
        (mobile  ? 30 : 0) +
        (gst     ? 20 : 0) +
        (city    ? 10 : 0) +
        (contactPerson ? 10 : 0)

      const dedup_key = email
        ? `email:${email}`
        : mobile  ? `phone:${mobile}`
        : gst     ? `gst:${gst}`
        : `name:${dealerName.toLowerCase()}::${city.toLowerCase()}`

      return {
        updateOne: {
          filter: { dedup_key },
          update: {
            $setOnInsert: {
              dedup_key,
              source:        source,
              source_ref_id: "",
              status:        "new",
              created_at:    now,
            },
            $set: {
              dealer_name:      dealerName,
              contact_person:   contactPerson,
              mobile,
              email,
              city,
              state,
              gst,
              dealer_score,
              needs_enrichment: !email || !mobile,
              notes,
              updated_at:       now,
            },
          },
          upsert: true,
        },
      }
    })

    const result = await db.collection(COLL).bulkWrite(ops, { ordered: false })

    await db.collection("growth_os_logs").insertOne({
      ts:       now,
      agent:    "dealer-prospect-engine",
      action:   "csv_import",
      rowsRead: rows.length,
      inserted: result.upsertedCount,
      updated:  result.modifiedCount,
      level:    "success",
      module:   "dealers",
    })

    return NextResponse.json({
      ok:         true,
      rowsRead:   rows.length,
      inserted:   result.upsertedCount,
      updated:    result.modifiedCount,
      duplicates: rows.length - result.upsertedCount - result.modifiedCount,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
