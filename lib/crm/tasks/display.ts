// Display name for a contact row (name → company → WhatsApp profile name → phone).
import type { Document } from "mongodb"

export function prettyName(c: Document): string {
  for (const k of ["name", "company", "waProfileName"]) if (typeof c[k] === "string" && c[k].trim()) return c[k].trim()
  return typeof c.phoneE164 === "string" ? c.phoneE164 : "Customer"
}
