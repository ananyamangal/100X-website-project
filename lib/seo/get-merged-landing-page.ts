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

// Mirrors HeroHeadlinePart / HeroCta in lib/seo/landing-types.ts exactly.
// PITFALL (caused a live bug 2026-08-06): z.object() at the top level rejects
// the WHOLE overrides doc if any one field's *type* doesn't match — headline
// being a string here when a translation row actually stored the two-tone
// array-of-parts shape (added by the hero-extra seeding pass) failed
// .safeParse() for hero AND metadata AND faqs AND sections together, since
// they all live under one `parsed.success` check below. That silently
// dropped every override on that row back to English, not just the one
// field that didn't fit — so this schema must track HeroBlock's real shape,
// not a simplified guess at it.
const HeroHeadlinePartSchema = z.object({
  text:   z.string(),
  accent: z.enum(["default", "green", "yellow"]).optional(),
})

const HeroCtaSchema = z.object({
  label: z.string().optional(),
  href:  z.string().optional(),
  track: z.string().optional(),
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
      eyebrow:  z.string().optional(),
      navBadge: z.string().optional(),
      headline: z.union([z.string(), z.array(HeroHeadlinePartSchema)]).optional(),
      sub:      z.string().optional(),
      primary:   HeroCtaSchema.optional(),
      secondary: HeroCtaSchema.optional(),
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
    if (ov.metadata.title         !== undefined) merged.metadata.title         = ov.metadata.title
    if (ov.metadata.description   !== undefined) merged.metadata.description   = ov.metadata.description
    if (ov.metadata.ogTitle       !== undefined) merged.metadata.ogTitle       = ov.metadata.ogTitle
    if (ov.metadata.ogDescription !== undefined) merged.metadata.ogDescription = ov.metadata.ogDescription
    if (ov.metadata.ogImage       !== undefined) merged.metadata.ogImage       = ov.metadata.ogImage
  }

  if (ov.hero !== undefined && def.hero !== undefined) {
    merged.hero = { ...def.hero }
    if (ov.hero.eyebrow  !== undefined) merged.hero.eyebrow  = ov.hero.eyebrow
    if (ov.hero.navBadge !== undefined) merged.hero.navBadge = ov.hero.navBadge
    if (ov.hero.headline !== undefined) merged.hero.headline = ov.hero.headline
    if (ov.hero.sub      !== undefined) merged.hero.sub      = ov.hero.sub
    for (const cta of ["primary", "secondary"] as const) {
      const ovCta = ov.hero[cta]
      if (ovCta === undefined) continue
      const defCta = def.hero[cta]
      if (defCta) {
        merged.hero[cta] = { ...defCta }
        if (ovCta.label !== undefined) merged.hero[cta]!.label = ovCta.label
        if (ovCta.href  !== undefined) merged.hero[cta]!.href  = ovCta.href
        if (ovCta.track !== undefined) merged.hero[cta]!.track = ovCta.track
      } else if (ovCta.label && ovCta.href) {
        merged.hero[cta] = { label: ovCta.label, href: ovCta.href, ...(ovCta.track ? { track: ovCta.track } : {}) }
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
 * Returns the merged landing page definition for `slug`, in `locale`.
 *
 * Flow: Registry → English CMS Override → Locale Translation → Merge
 *
 * `locale` translations are stored the same shape as English CMS overrides
 * (landing_page_translations, keyed by {slug, locale}) and merged on top of
 * the already-CMS-merged English def via the same applyOverride() used for
 * CMS overrides — one proven merge path, not a parallel one.
 *
 * Only rows with `reviewed: true` are read — an unreviewed row behaves
 * exactly as if it doesn't exist yet (falls through to English). This is
 * the publish gate: seeding writes `reviewed: false` by default, and a
 * separate explicit action (scripts/publish-i18n-translation.mjs) flips it.
 *
 * Failure contract (never throws, never returns 500):
 *   • Mongo unavailable → console.warn → return static/English def
 *   • Override/translation doc missing, or not yet reviewed → return the
 *     next layer down
 *   • Zod validation fails → console.warn → return the next layer down
 *   • No translation for `locale` yet → return the English-merged def
 *     (graceful fallback — translated URL still renders, just in English)
 *   • Returns null only if slug is not in the registry at all
 */
export async function getMergedLandingPage(slug: string, locale: string = "en"): Promise<LandingPageDef | null> {
  const def = getLandingPage(slug)
  if (!def) return null

  let englishMerged = def
  try {
    const client = await clientPromise
    const db = client.db()

    const row = await db
      .collection("landing_page_overrides")
      .findOne({ slug }, { projection: { overrides: 1, _id: 0 } })

    if (row?.overrides) {
      const parsed = OverridesSchema.safeParse(row.overrides)
      if (parsed.success) {
        englishMerged = applyOverride(def, parsed.data)
      } else {
        console.warn(
          `[CMS] Override Zod validation failed for slug="${slug}" — rendering static page.`,
          parsed.error.issues.slice(0, 3),
        )
      }
    }
  } catch (err) {
    console.warn(
      `[CMS] DB unavailable for slug="${slug}" — rendering static page.`,
      (err as Error).message,
    )
    return englishMerged
  }

  if (locale === "en") return englishMerged

  try {
    const client = await clientPromise
    const db = client.db()

    const row = await db
      .collection("landing_page_translations")
      .findOne({ slug, locale, reviewed: true }, { projection: { overrides: 1, _id: 0 } })

    if (!row?.overrides) return englishMerged

    const parsed = OverridesSchema.safeParse(row.overrides)
    if (!parsed.success) {
      console.warn(
        `[i18n] Translation Zod validation failed for slug="${slug}" locale="${locale}" — falling back to English.`,
        parsed.error.issues.slice(0, 3),
      )
      return englishMerged
    }

    return applyOverride(englishMerged, parsed.data)
  } catch (err) {
    console.warn(
      `[i18n] DB unavailable fetching translation for slug="${slug}" locale="${locale}" — falling back to English.`,
      (err as Error).message,
    )
    return englishMerged
  }
}
