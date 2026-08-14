import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

interface RedirectInput {
  sourcePath?: string
  destinationPath?: string
  redirectType?: number | string
  active?: boolean
}

/** Ensures a single leading slash, no trailing slash (except "/"), and trims whitespace. */
function normalizePath(raw: string): string {
  let p = (raw || "").trim()
  if (!p) return ""
  if (!p.startsWith("/")) p = `/${p}`
  p = p.replace(/\/+$/, "")
  return p || "/"
}

function normalizeType(raw: RedirectInput["redirectType"]): 301 | 302 {
  return Number(raw) === 302 ? 302 : 301
}

// GET - Fetch all redirects (list view shows active + inactive)
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const redirects = await db
      .collection("url_redirects")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()
    return NextResponse.json(JSON.parse(JSON.stringify(redirects)))
  } catch (error) {
    console.error("Error fetching redirects:", error)
    return NextResponse.json({ error: "Failed to fetch redirects" }, { status: 500 })
  }
}

// POST - Create a new redirect rule
export async function POST(request: NextRequest) {
  try {
    const body: RedirectInput = await request.json()
    const sourcePath = normalizePath(body.sourcePath || "")
    const destinationPath = normalizePath(body.destinationPath || "")
    const redirectType = normalizeType(body.redirectType)

    if (!sourcePath || sourcePath === "/") {
      return NextResponse.json({ error: "A source path is required" }, { status: 400 })
    }
    if (!destinationPath) {
      return NextResponse.json({ error: "A destination path is required" }, { status: 400 })
    }
    if (sourcePath === destinationPath) {
      return NextResponse.json({ error: "Source and destination cannot be the same path" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("url_redirects")

    const dup = await collection.findOne({ sourcePath })
    if (dup) {
      return NextResponse.json({ error: `A redirect for "${sourcePath}" already exists` }, { status: 409 })
    }

    // Chain prevention: every redirect must point directly at its final live
    // URL in one hop. Reject if this redirect would create or extend a chain
    // in either direction (A→B→C caught from B's insert, or C's insert
    // catching an existing A→B).
    const chainViaDestination = await collection.findOne({ sourcePath: destinationPath, active: true })
    if (chainViaDestination) {
      return NextResponse.json(
        {
          error: `"${destinationPath}" is itself the source of another active redirect — point the destination directly at the final URL instead of chaining redirects`,
        },
        { status: 400 },
      )
    }
    const chainViaSource = await collection.findOne({ destinationPath: sourcePath, active: true })
    if (chainViaSource) {
      return NextResponse.json(
        {
          error: `"${sourcePath}" is already used as the destination of another active redirect — point that redirect at the final URL instead of chaining through here`,
        },
        { status: 400 },
      )
    }

    const now = new Date()
    const newRedirect = {
      sourcePath,
      destinationPath,
      redirectType,
      active: body.active ?? true,
      createdAt: now,
      updatedAt: now,
    }
    const result = await collection.insertOne(newRedirect)
    return NextResponse.json({ ...newRedirect, _id: result.insertedId })
  } catch (error) {
    console.error("Error creating redirect:", error)
    return NextResponse.json({ error: "Failed to create redirect" }, { status: 500 })
  }
}
