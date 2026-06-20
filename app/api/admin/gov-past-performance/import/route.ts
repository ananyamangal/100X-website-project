import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const VALID_CATEGORIES = ["Municipal", "Health", "Railways", "Defence", "Agriculture", "Other"]
const VALID_STATUSES = ["Completed", "Ongoing", "In Progress", "Pending"]

function parseRow(row: Record<string, string>) {
  const department = (row["Department"] || row["department"] || "").trim()
  const organization = (row["Organization"] || row["organization"] || row["Client"] || row["client"] || "").trim()
  const state = (row["State"] || row["state"] || "").trim()
  const product = (row["Product"] || row["product"] || row["Machine"] || row["machine"] || "").trim()
  const rawValue = row["Order Value"] || row["order_value"] || row["value"] || row["Value"] || ""
  const rawQty = row["Quantity"] || row["quantity"] || row["Units"] || row["units"] || ""
  const rawYear = row["Year"] || row["year"] || row["Order Year"] || row["order_year"] || String(new Date().getFullYear())
  const rawStatus = row["Status"] || row["status"] || "Completed"
  const rawCat = row["Category"] || row["category"] || "Municipal"
  const notes = (row["Notes"] || row["notes"] || row["Details"] || row["details"] || "").trim()

  const category = VALID_CATEGORIES.find(c => c.toLowerCase() === rawCat.trim().toLowerCase()) || "Municipal"
  const status = VALID_STATUSES.find(s => s.toLowerCase() === rawStatus.trim().toLowerCase()) || "Completed"

  if (!organization || !state) return null

  return {
    department,
    organization,
    state,
    product,
    quantity: rawQty ? parseInt(rawQty) || null : null,
    orderValue: rawValue ? parseFloat(rawValue) || null : null,
    orderYear: parseInt(rawYear) || new Date().getFullYear(),
    status,
    category,
    notes,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rows: Record<string, string>[] = body.rows || []

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    const parsed = rows.map(parseRow).filter(Boolean) as any[]

    if (parsed.length === 0) {
      return NextResponse.json({ error: "No valid rows after parsing. Ensure Organization and State columns are present." }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()
    const result = await db.collection("gov_past_performance").insertMany(parsed)

    return NextResponse.json({
      inserted: result.insertedCount,
      skipped: rows.length - parsed.length,
      total: rows.length,
    })
  } catch (err) {
    console.error("Import error:", err)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
