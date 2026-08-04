import clientPromise from "@/lib/mongodb"

/**
 * Generic translation record for content that has no existing CMS-override
 * mechanism to piggyback on (blog posts). Landing pages use their own
 * landing_page_translations collection instead — see getMergedLandingPage()
 * in lib/seo/get-merged-landing-page.ts, which reuses the CMS override merge
 * path rather than this generic one.
 *
 * `fields` is a flat map of translated field values, keyed by the source
 * field name (e.g. "title", "excerpt", "content"). Kept flat rather than
 * mirroring nested source shapes — blog posts only have a handful of
 * translatable string fields, so a flat map avoids inventing a schema.
 */
export type TranslationStatus = "pending" | "approved" | "rejected"

export interface TranslationDoc {
  _id?: string
  contentType: "blog"
  contentId: string
  locale: string
  fields: Record<string, string>
  status: TranslationStatus
  generatedAt: string
  reviewedAt?: string
  reviewedBy?: string
  // Compliance-relevant content (warranty/terms/etc.) is flagged here so it
  // surfaces in the review queue even though publication isn't gated on it.
  complianceSensitive?: boolean
}

const COLLECTION = "translations"

/**
 * Returns the translated field map for one piece of content, or null if no
 * REVIEWED translation exists yet (caller falls back to the English source
 * — never blocks rendering). Only `status: "approved"` rows are read — this
 * is the publish gate: `status` starts at "pending" on write, and moving to
 * "approved" is a separate, explicit action. Never throws.
 */
export async function getTranslation(
  contentType: TranslationDoc["contentType"],
  contentId: string,
  locale: string
): Promise<Record<string, string> | null> {
  if (locale === "en") return null
  try {
    const client = await clientPromise
    const db = client.db()
    const row = await db
      .collection(COLLECTION)
      .findOne({ contentType, contentId, locale, status: "approved" }, { projection: { fields: 1, _id: 0 } })
    return row?.fields ?? null
  } catch (err) {
    console.warn(
      `[i18n] DB unavailable fetching translation for ${contentType}/${contentId}/${locale} — falling back to English.`,
      (err as Error).message
    )
    return null
  }
}

export async function upsertTranslation(doc: Omit<TranslationDoc, "_id">): Promise<void> {
  const client = await clientPromise
  const db = client.db()
  await db.collection(COLLECTION).updateOne(
    { contentType: doc.contentType, contentId: doc.contentId, locale: doc.locale },
    { $set: doc },
    { upsert: true }
  )
}

export async function listTranslations(filter: {
  status?: TranslationStatus
  locale?: string
  contentType?: TranslationDoc["contentType"]
}): Promise<TranslationDoc[]> {
  const client = await clientPromise
  const db = client.db()
  const query: Record<string, unknown> = {}
  if (filter.status) query.status = filter.status
  if (filter.locale) query.locale = filter.locale
  if (filter.contentType) query.contentType = filter.contentType
  const rows = await db.collection(COLLECTION).find(query).sort({ generatedAt: -1 }).toArray()
  return JSON.parse(JSON.stringify(rows))
}
