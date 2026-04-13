import sanitizeHtml from "sanitize-html"

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
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
  allowedAttributes: {
    a: ["href", "target", "rel", "class"],
    span: ["class"],
    div: ["class"],
    p: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
}

export function sanitizeRichHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  return sanitizeHtml(html, SANITIZE)
}

export function isProbablyRichHtml(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  return /<[a-z][\s\S]*>/i.test(t)
}

/** Plain text for search, cards, and line-clamp previews */
export function plainTextFromHtml(html: string): string {
  if (!html) return ""
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
  return text.replace(/\s+/g, " ").trim()
}
