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
    "img",
    "table",
    "colgroup",
    "col",
    "caption",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class"],
    span: ["class"],
    div: ["class"],
    p: ["class"],
    img: ["src", "alt", "width", "height", "loading", "decoding"],
    th: ["scope", "colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // Body images must be absolute https URLs: no http (mixed content), no data:
  // (base64 blobs), no relative paths. An img that fails this is dropped whole.
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  exclusiveFilter: (frame: { tag: string; attribs: Record<string, string> }) =>
    frame.tag === "img" && !/^https:\/\//i.test(frame.attribs.src ?? ""),
  transformTags: {
    img: (tagName: string, attribs: Record<string, string>) => ({
      tagName,
      attribs: {
        ...attribs,
        alt: attribs.alt ?? "",
        loading: attribs.loading === "eager" ? "eager" : "lazy",
        decoding: "async",
      },
    }),
  },
}

/**
 * Admin content pasted from Word/Docs arrives with every space as U+00A0, not
 * U+0020 — sampled live articles have thousands of NBSP and literally zero
 * regular spaces. NBSP is not a line-break opportunity, so a paragraph of it is
 * one unbreakable token: it renders as a single line thousands of px wide and
 * gets clipped by the article column's overflow-x:hidden, cutting text off
 * mid-sentence (worst on phone widths). Normalizing to a real space here is the
 * only thing that restores ordinary wrapping — CSS can only paper over it with
 * break-anywhere, which splits real words mid-character instead.
 */
export function normalizeNbsp(html: string | unknown): string {
  return asHtmlInput(html).replace(/\u00a0/g, " ").replace(/&nbsp;/gi, " ")
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
