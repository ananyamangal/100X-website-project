import { z } from "zod"
import clientPromise from "@/lib/mongodb"
import { getLandingPage } from "@/lib/seo/landing-pages"
import type { LandingPageDef } from "@/lib/seo/landing-types"

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Validates the `overrides` sub-document stored in landing_page_overrides.
// Uses .strip() (default) so unknown keys are silently dropped — schema
// evolution in the DB never causes Zod to reject valid overrides.

const FaqSchema = z.object({
  q: z.string(),
  a: z.string(),
})

const OverridesSchema = z.object({
  metadata: z
    .object({
      title:         z.string().optional(),
      description:   z.string().optional(),
      ogTitle:       z.string().optional(),
      ogDescription: z.string().optional(),
      ogImage:       z.string().optional(),
    })
    .optional(),
  hero: z
    .object({
      headline: z.string().optional(),
      sub:      z.string().optional(),
      primary:  z
        .object({
          label: z.string().optional(),
          href:  z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  faqs:                z.array(FaqSchema).optional(),
  relatedLandingSlugs: z.array(z.string()).optional(),
  // sections: loosely typed so any section shape is accepted; the renderer
  // does its own runtime discrimination, and Zod .strip() already drops unknowns.
  sections: z.array(z.object({ kind: z.string() }).passthrough()).optional(),
})

type Overrides = z.infer<typeof OverridesSchema>

// ─── Merge ────────────────────────────────────────────────────────────────────
// Static registry is the source of truth. Each field is applied only when the
// override explicitly defines it (undefined check, not truthiness — so an
// empty-string override is intentional and is applied).

function applyOverride(def: LandingPageDef, ov: Overrides): LandingPageDef {
  const merged: LandingPageDef = { ...def }

  if (ov.metadata !== undefined) {
    merged.metadata = { ...def.metadata }
    if (ov.metadata.title       !== undefined) merged.metadata.title       = ov.metadata.title
    if (ov.metadata.description !== undefined) merged.metadata.description = ov.metadata.description
    if (ov.metadata.ogTitle     !== undefined) merged.metadata.ogTitle     = ov.metadata.ogTitle
    if (ov.metadata.ogDescription !== undefined) merged.metadata.ogDescription = ov.metadata.ogDescription
  }

  if (ov.hero !== undefined && def.hero !== undefined) {
    merged.hero = { ...def.hero }
    if (ov.hero.headline !== undefined) merged.hero.headline = ov.hero.headline
    if (ov.hero.sub      !== undefined) merged.hero.sub      = ov.hero.sub
    if (ov.hero.primary !== undefined) {
      if (def.hero.primary) {
        merged.hero.primary = { ...def.hero.primary }
        if (ov.hero.primary.label !== undefined) merged.hero.primary.label = ov.hero.primary.label
        if (ov.hero.primary.href  !== undefined) merged.hero.primary.href  = ov.hero.primary.href
      } else if (ov.hero.primary.label && ov.hero.primary.href) {
        merged.hero.primary = {
          label: ov.hero.primary.label,
          href:  ov.hero.primary.href,
        }
      }
    }
  }

  if (ov.faqs               !== undefined) merged.faqs               = ov.faqs
  if (ov.relatedLandingSlugs !== undefined) merged.relatedLandingSlugs = ov.relatedLandingSlugs
  // Sections override replaces the static array entirely (not deep-merged),
  // so the editor has full authoring control over page structure.
  if (ov.sections !== undefined) merged.sections = ov.sections as import("./landing-types").LandingSection[]

  return merged
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the merged landing page definition for `slug`.
 *
 * Flow: Registry → Override Lookup → Zod Validation → Merge
 *
 * Failure contract (never throws, never returns 500):
 *   • Mongo unavailable → console.warn → return static def
 *   • Override doc missing → return static def
 *   • Zod validation fails → console.warn → return static def
 *   • Returns null only if slug is not in the registry at all
 */
export async function getMergedLandingPage(slug: string): Promise<LandingPageDef | null> {
  const def = getLandingPage(slug)
  if (!def) return null

  try {
    const client = await clientPromise
    const db = client.db()

    const row = await db
      .collection("landing_page_overrides")
      .findOne({ slug }, { projection: { overrides: 1, _id: 0 } })

    if (!row?.overrides) return def

    const parsed = OverridesSchema.safeParse(row.overrides)
    if (!parsed.success) {
      console.warn(
        `[CMS] Override Zod validation failed for slug="${slug}" — rendering static page.`,
        parsed.error.issues.slice(0, 3),
      )
      return def
    }

    return applyOverride(def, parsed.data)
  } catch (err) {
    console.warn(
      `[CMS] DB unavailable for slug="${slug}" — rendering static page.`,
      (err as Error).message,
    )
    return def
  }
}
