import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

const COLLECTION = "platform_changelog"

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)

  const client = await clientPromise
  const db = client.db()

  const entries = await db
    .collection(COLLECTION)
    .find({})
    .sort({ date: -1 })
    .limit(limit)
    .toArray()

  // Seed initial changelog if empty
  if (entries.length === 0) {
    const seed = [
      {
        type: "capability_added",
        name: "Revenue OS v2 — CRM + Execution + Workflows",
        description: "Added Dealer Pipeline, Opportunity Pipeline, Execution Hub, SEO Workflow, Ads Workflow",
        date: new Date("2026-06-16T00:00:00.000Z"),
        version: "v2.0",
        routes_added: [
          "/admin/growth/crm/dealers",
          "/admin/growth/crm/opportunities",
          "/admin/growth/execution",
          "/admin/growth/seo/workflow",
          "/admin/growth/ads/workflow",
        ],
        capabilities_added: 5,
        collections_added: 4,
        removed: 0,
      },
      {
        type: "capability_added",
        name: "Revenue Director v1.1 — Lifecycle + Packs + Intelligence",
        description: "Added execution lifecycle tracking, execution pack generation, measurement strip, 5 pack types",
        date: new Date("2026-06-16T00:00:00.000Z"),
        version: "v1.1",
        routes_added: ["/admin/growth/director"],
        capabilities_added: 3,
        collections_added: 2,
        removed: 0,
      },
      {
        type: "capability_added",
        name: "Growth OS Sprint 0 — Navigation + CMD+K + Breadcrumbs",
        description: "Back-links, breadcrumb trail, CMD+K palette, sidebar restructure",
        date: new Date("2026-06-16T00:00:00.000Z"),
        version: "v0.1",
        routes_added: ["/admin/growth/platform-registry"],
        capabilities_added: 1,
        collections_added: 0,
        removed: 0,
      },
      {
        type: "capability_added",
        name: "Fogging Intelligence v1.4 — ACCEPTED",
        description: "1,418 contracts ₹75.08 Cr, org-first navigation, 670 orgs, 679 sellers, 14 UI pages, production accepted",
        date: new Date("2026-06-16T00:00:00.000Z"),
        version: "v1.4",
        routes_added: ["/admin/growth/fogging"],
        capabilities_added: 14,
        collections_added: 6,
        removed: 0,
      },
    ]
    await db.collection(COLLECTION).insertMany(seed)
    return NextResponse.json({ entries: seed.reverse() })
  }

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const body = await req.json()
  const { type, name, description, routes_added = [], capabilities_added = 0, collections_added = 0, removed = 0, version } = body

  if (!type || !name || !description) {
    return NextResponse.json({ error: "type, name, description required" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db()

  const entry = {
    type,
    name,
    description,
    version: version ?? null,
    routes_added,
    capabilities_added,
    collections_added,
    removed,
    date: new Date(),
  }

  const result = await db.collection(COLLECTION).insertOne(entry)
  return NextResponse.json({ entry: { ...entry, _id: result.insertedId } }, { status: 201 })
}
