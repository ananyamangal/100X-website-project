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

export function sanitizeRichHtml(html: string | unknown): string {
  const str = asHtmlInput(html)
  if (!str) return ""
  return sanitizeHtml(str, SANITIZE)
}

function asHtmlInput(s: unknown): string {
  if (typeof s === "string") return s
  if (s == null) return ""
  return String(s)
}

export function isProbablyRichHtml(s: string | unknown): boolean {
  const t = asHtmlInput(s).trim()
  if (!t) return false
  return /<[a-z][\s\S]*>/i.test(t)
}

/** Plain text for search, cards, and line-clamp previews */
export function plainTextFromHtml(html: string | unknown): string {
  const str = asHtmlInput(html)
  if (!str) return ""
  // Insert a space before block-level tags so adjacent elements don't get merged
  const spaced = str.replace(/<\/?(?:p|li|div|br|h[1-6]|ul|ol|tr|td|th)[^>]*>/gi, " ")
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
  // sanitize-html decodes &nbsp; to   (non-breaking space); \s does not match it
  return text.replace(/ /g, " ").replace(/\s+/g, " ").trim()
}
