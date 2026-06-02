import { ObjectId } from "mongodb"

/**
 * Generate a URL-safe slug from a product name + its ObjectId.
 *
 * Format: {name-slug}-{last-6-chars-of-id}
 * Example: "100XDB400 Thermal Fogging Machine" + id "68e52538f84599d156f377e0"
 *       → "100xdb400-thermal-fogging-machine-f377e0"
 *
 * The 6-char suffix ensures uniqueness even when names are identical.
 * The slug is set at creation time and never regenerated on name changes
 * so that existing SEO authority is preserved.
 */
export function generateProductSlug(name: string, id: string): string {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  const idSuffix = String(id).slice(-6)
  return `${nameSlug}-${idSuffix}`
}

/** Returns true if the string looks like a MongoDB ObjectId (24-char hex). */
export function isObjectId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s) && ObjectId.isValid(s)
}
