import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

interface RedirectUpdate {
  sourcePath?: string
  destinationPath?: string
  redirectType?: number | string
  active?: boolean
}

function normalizePath(raw: string): string {
  let p = (raw || "").trim()
  if (!p) return ""
  if (!p.startsWith("/")) p = `/${p}`
  p = p.replace(/\/+$/, "")
  return p || "/"
}

function normalizeType(raw: RedirectUpdate["redirectType"]): 301 | 302 {
  return Number(raw) === 302 ? 302 : 301
}

// PUT - Update a specific redirect
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid redirect ID" }, { status: 400 })
    }

    const body: RedirectUpdate = await request.json()
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
    const objectId = new ObjectId(id)

    const dup = await collection.findOne({ sourcePath, _id: { $ne: objectId } })
    if (dup) {
      return NextResponse.json({ error: `A redirect for "${sourcePath}" already exists` }, { status: 409 })
    }

    const chainViaDestination = await collection.findOne({
      sourcePath: destinationPath,
      active: true,
      _id: { $ne: objectId },
    })
    if (chainViaDestination) {
      return NextResponse.json(
        {
          error: `"${destinationPath}" is itself the source of another active redirect — point the destination directly at the final URL instead of chaining redirects`,
        },
        { status: 400 },
      )
    }
    const chainViaSource = await collection.findOne({
      destinationPath: sourcePath,
      active: true,
      _id: { $ne: objectId },
    })
    if (chainViaSource) {
      return NextResponse.json(
        {
          error: `"${sourcePath}" is already used as the destination of another active redirect — point that redirect at the final URL instead of chaining through here`,
        },
        { status: 400 },
      )
    }

    const result = await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          sourcePath,
          destinationPath,
          redirectType,
          active: body.active ?? true,
          updatedAt: new Date(),
        },
      },
    )
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Redirect not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating redirect:", error)
    return NextResponse.json({ error: "Failed to update redirect" }, { status: 500 })
  }
}

// DELETE - Delete a specific redirect
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid redirect ID" }, { status: 400 })
    }
    const client = await clientPromise
    const db = client.db()
    const result = await db.collection("url_redirects").deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Redirect not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting redirect:", error)
    return NextResponse.json({ error: "Failed to delete redirect" }, { status: 500 })
  }
}
