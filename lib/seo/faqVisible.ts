// Pure helpers for keeping FAQPage JSON-LD and visible Q&A in step (B1).
// A page that emits FAQPage schema must show every schema question and
// answer as visible, server-rendered text. These helpers read the Q&A pairs
// straight out of the page's own FAQPage object, so the visible block can
// never drift from the schema.

export type FaqPair = { q: string; a: string }

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

/** Q&A pairs from a FAQPage JSON-LD object (or null when it is not one). */
export function faqPairsFromJsonLd(jsonLd: unknown, exclude: readonly string[] = []): FaqPair[] {
  if (!jsonLd || typeof jsonLd !== "object") return []
  const node = jsonLd as Record<string, unknown>
  if (node["@type"] !== "FAQPage" || !Array.isArray(node.mainEntity)) return []
  const skip = new Set(exclude.map((s) => s.trim()))
  const out: FaqPair[] = []
  for (const item of node.mainEntity) {
    if (!item || typeof item !== "object") continue
    const qNode = item as Record<string, unknown>
    const q = asText(qNode.name)
    const ans = qNode.acceptedAnswer
    const a = ans && typeof ans === "object" ? asText((ans as Record<string, unknown>).text) : ""
    if (!q || !a || skip.has(q)) continue
    out.push({ q, a })
  }
  return out
}
