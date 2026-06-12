import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { getLandingPage } from "@/lib/seo/landing-pages"

export const dynamic = "force-dynamic"

// GET /api/admin/landing-pages/[slug]/override
// Read the current override doc + last 10 audit entries.
// Requires landing_pages.view so read-only roles can inspect without editing.
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await requirePermission(request, "landing_pages.view")
  if (auth instanceof NextResponse) return auth

  const { slug } = params

  if (!getLandingPage(slug)) {
    return NextResponse.json({ error: "Page not found in registry" }, { status: 404 })
  }

  try {
    const client = await clientPromise
    const db = client.db()

    const override = await db
      .collection("landing_page_overrides")
      .findOne({ slug }, { projection: { _id: 0 } })

    const history = await db
      .collection("landing_page_audit")
      .find({ slug })
      .sort({ timestamp: -1 })
      .limit(10)
      .project({ _id: 0, userId: 0 })
      .toArray()

    return NextResponse.json({ ok: true, override: override ?? null, history })
  } catch (err) {
    console.error("GET landing-pages/override error:", err)
    return NextResponse.json({ error: "Failed to load override" }, { status: 500 })
  }
}

// PUT /api/admin/landing-pages/[slug]/override
// Upserts the override for a landing page. Requires landing_pages.edit.
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await requirePermission(request, "landing_pages.edit")
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  const { slug } = params

  if (!getLandingPage(slug)) {
    return NextResponse.json({ error: "Page not found in registry" }, { status: 404 })
  }

  let body: { overrides: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { overrides } = body
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return NextResponse.json({ error: "overrides field required" }, { status: 400 })
  }

  // ─── Field validation ────────────────────────────────────────────────────
  const errors: string[] = []

  const meta = overrides.metadata as Record<string, string> | undefined
  if (meta !== undefined) {
    if ("title" in meta && !String(meta.title ?? "").trim()) {
      errors.push("Meta title cannot be empty")
    }
  }

  const hero = overrides.hero as Record<string, unknown> | undefined
  if (hero !== undefined) {
    if ("headline" in hero && !String(hero.headline ?? "").trim()) {
      errors.push("Hero headline (H1) cannot be empty")
    }
    const primary = hero.primary as Record<string, string> | undefined
    if (primary?.href !== undefined && String(primary.href).trim()) {
      if (!/^(\/|https?:\/\/)/.test(String(primary.href).trim())) {
        errors.push("CTA URL must start with / or https://")
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; "), errors }, { status: 422 })
  }

  // ─── Persist ─────────────────────────────────────────────────────────────
  try {
    const client = await clientPromise
    const db = client.db()

    // Snapshot previous state to compute changed sections
    const existing = await db
      .collection("landing_page_overrides")
      .findOne({ slug }, { projection: { overrides: 1 } })

    const prevOverrides = (existing?.overrides ?? {}) as Record<string, unknown>

    const fieldsChanged: string[] = []
    for (const section of ["metadata", "hero", "faqs", "relatedLandingSlugs"] as const) {
      if (overrides[section] !== undefined) {
        if (JSON.stringify(prevOverrides[section] ?? null) !== JSON.stringify(overrides[section])) {
          fieldsChanged.push(section)
        }
      }
    }

    const now = new Date()

    await db.collection("landing_page_overrides").updateOne(
      { slug },
      {
        $set: {
          slug,
          overrides,
          modifiedBy: user.email,
          modifiedByName: user.name,
          modifiedAt: now,
        },
      },
      { upsert: true }
    )

    await db.collection("landing_page_audit").insertOne({
      slug,
      userId: user.sub,
      userEmail: user.email,
      userName: user.name,
      timestamp: now,
      fieldsChanged,
      snapshot: overrides,
    })

    await writeAuditLog(user, "edit", `landing_page:${slug}`, { slug, fieldsChanged }, request)

    revalidatePath(`/${slug}`)

    return NextResponse.json({
      ok: true,
      modifiedAt: now.toISOString(),
      modifiedBy: user.email,
      modifiedByName: user.name,
      fieldsChanged,
    })
  } catch (err) {
    console.error("PUT landing-pages/override error:", err)
    return NextResponse.json({ error: "Failed to save override" }, { status: 500 })
  }
}

// DELETE /api/admin/landing-pages/[slug]/override
// Removes the override doc, writes a revert audit entry, and revalidates the live page.
// Requires landing_pages.edit.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await requirePermission(request, "landing_pages.edit")
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  const { slug } = params

  if (!getLandingPage(slug)) {
    return NextResponse.json({ error: "Page not found in registry" }, { status: 404 })
  }

  try {
    const client = await clientPromise
    const db = client.db()

    // Snapshot existing overrides before deletion for the audit trail
    const existing = await db
      .collection("landing_page_overrides")
      .findOne({ slug }, { projection: { overrides: 1, _id: 0 } })

    const result = await db
      .collection("landing_page_overrides")
      .deleteOne({ slug })

    const now = new Date()

    await db.collection("landing_page_audit").insertOne({
      slug,
      userId:   user.sub,
      userEmail: user.email,
      userName:  user.name,
      timestamp: now,
      fieldsChanged: ["revert"],
      snapshot: existing?.overrides ?? {},
    })

    await writeAuditLog(user, "delete", `landing_page:${slug}`, { slug, action: "revert_to_registry" }, request)

    revalidatePath(`/${slug}`)

    return NextResponse.json({ ok: true, deleted: result.deletedCount > 0 })
  } catch (err) {
    console.error("DELETE landing-pages/override error:", err)
    return NextResponse.json({ error: "Failed to revert override" }, { status: 500 })
  }
}
