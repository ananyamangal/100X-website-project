import DOMPurify from "isomorphic-dompurify"

const SANITIZE: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "h1",
    "h2",
    "h3",
    "h4",
    "ol",
    "ul",
    "li",
    "a",
    "span",
    "div",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
}

export function sanitizeRichHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  return DOMPurify.sanitize(html, SANITIZE)
}

export function isProbablyRichHtml(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  return /<[a-z][\s\S]*>/i.test(t)
}

/** Plain text for search, cards, and line-clamp previews */
export function plainTextFromHtml(html: string): string {
  if (!html) return ""
  const text = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
  return text.replace(/\s+/g, " ").trim()
}
