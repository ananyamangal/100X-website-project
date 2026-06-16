/**
 * POST /api/admin/growth/operations/seed
 * Seeds the automation_registry MongoDB collection from the static TypeScript config.
 * Safe to run multiple times — upserts by id.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { AUTOMATION_REGISTRY } from "@/lib/growth-os/automation-registry"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()
  const coll = db.collection("automation_registry")

  const seededAt = new Date().toISOString()
  let upserted = 0

  for (const entry of AUTOMATION_REGISTRY) {
    await coll.updateOne(
      { id: entry.id },
      { $set: { ...entry, seeded_at: seededAt } },
      { upsert: true }
    )
    upserted++
  }

  await coll.createIndex({ id: 1 }, { unique: true }).catch(() => {})

  return NextResponse.json({ ok: true, upserted, seeded_at: seededAt, total: AUTOMATION_REGISTRY.length })
}
