/**
 * Knowledge Hub content model.
 *
 * Full-fidelity block schema for the /knowledge articles migrated out of the
 * hardcoded `app/knowledge/<slug>/page.tsx` files into the `knowledge_articles`
 * DB collection. The renderer (`components/knowledge/KnowledgeRenderer.tsx`)
 * reproduces the original markup from these blocks; the admin CMS edits them.
 *
 * Rich text in paragraphs / list items / callouts / FAQ answers uses the same
 * inline mini-markup as the landing pages (`[label](/path)`, `**bold**`) so the
 * visible copy and the JSON-LD plain-text mirror come from ONE string
 * (see lib/knowledge/... consumers and `inlineToPlainText`).
 */

export type Align = "left" | "right" | "center"

export interface HeadingBlock {
  type: "heading"
  level: 2 | 3
  text: string
  /** Optional explicit anchor id; renderer slugifies `text` when absent. */
  id?: string
}

export interface ParagraphBlock {
  type: "paragraph"
  /** Inline mini-markup. */
  text: string
}

export interface ListBlock {
  type: "list"
  ordered: boolean
  /** Each item is inline mini-markup; a `**Lead:** rest` item renders bold lead-in. */
  items: string[]
}

export interface TableColumn {
  text: string
  align?: Align
}

export interface TableBlock {
  type: "table"
  columns: TableColumn[]
  /** Row cells are inline mini-markup, one array per row, aligned to `columns`. */
  rows: string[][]
  /** Optional per-article style variant (matches the original table classes). */
  variant?: "bordered" | "plain"
}

export type CalloutVariant = "keyfact" | "note" | "warning" | "info" | "success"

export interface CalloutBlock {
  type: "callout"
  variant: CalloutVariant
  /** Optional bold lead label, e.g. "Key fact". */
  label?: string
  /** Inline mini-markup body. */
  text: string
}

/**
 * Marks where the visible FAQ section renders. Most originals end with it, so
 * with no marker it renders after every block; articles whose original puts
 * content (e.g. a contact CTA) below the FAQ carry this marker instead.
 */
export interface FaqSectionBlock {
  type: "faq"
}

export type KnowledgeBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | CalloutBlock
  | FaqSectionBlock

/**
 * One FAQ entry. The accordion renders every row whose `visibleAnswer` is
 * non-null; the generated FAQPage JSON-LD includes every row whose
 * `schemaAnswer` is non-null. When the two are equal the answer is
 * single-sourced (Batch A / resolved). When they differ or one is null the row
 * is preserved exactly as it shipped (Batch B safety rows awaiting review).
 */
export interface KnowledgeFaq {
  /** Canonical question; also the wording emitted in FAQPage JSON-LD. */
  question: string
  /**
   * Set only where the original page's on-page question wording differs from
   * its FAQPage wording, so both survive migration unchanged. Same
   * dual-version idea as visibleAnswer/schemaAnswer; Batch A collapses the
   * pair into one wording, at which point this should be dropped.
   */
  visibleQuestion?: string
  /** Inline mini-markup shown in the accordion, or null if schema-only. */
  visibleAnswer: string | null
  /** Plain/inline text emitted in FAQPage JSON-LD, or null if visible-only. */
  schemaAnswer: string | null
  /** True for chemical dilution / PPE / dosing / safety wording. */
  safety: boolean
  /** True while a safety row still needs the owner's single-answer decision. */
  reviewPending: boolean
  /** For Batch B: internal sources cited for a suggested merged answer. */
  sources?: string[]
  /** For Batch B: a suggested merged answer drafted from internal sources (owner approves). */
  suggestedAnswer?: string
}

export interface KnowledgeRelated {
  /** Knowledge Hub slug; used to build `/knowledge/<slug>` when `href` is absent. */
  slug?: string
  /** Explicit path override for related links outside `/knowledge` (e.g. `/compare/...`, `/gem-tender-support`). */
  href?: string
  title: string
  blurb: string
}

export interface KnowledgeByline {
  author: string
  /** e.g. "6 min read". */
  readTime: string
  /** e.g. "Updated June 2026". */
  updatedLabel: string
}

export interface KnowledgeArticle {
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  ogTitle?: string
  ogDescription?: string
  tags: string[]
  byline: KnowledgeByline
  /** Breadcrumb trailing label + hub card title fall back to `title` when absent. */
  breadcrumbLabel?: string
  /** Original per-article container width. */
  maxWidth: "2xl" | "3xl" | "4xl"
  /** The top "Key fact" callout, if the article had one. */
  heroCallout?: CalloutBlock
  h1: string
  blocks: KnowledgeBlock[]
  /** Default "Frequently Asked Questions". */
  faqHeading?: string
  /**
   * Rendered as `<h3>question</h3><p>answer</p>` inside the prose (matching the
   * original pages, not an accordion), so the visible heading structure and the
   * snapshot's H2/H3 counts are preserved. Single-sourcing is achieved by
   * generating the FAQPage JSON-LD from this same array, not by changing markup.
   */
  faqs: KnowledgeFaq[]
  /** "Related Articles" cards (internal links) shown below the body. */
  relatedArticles?: KnowledgeRelated[]
  /** About-the-author box body; the box is omitted entirely when absent (the original page had none). */
  aboutAuthor?: string
  /**
   * Non-FAQ JSON-LD graph(s) preserved verbatim from the original page
   * (Article / WebPage / HowTo / Thing / Organization / MonetaryAmount ...).
   * The FAQPage graph is generated from `faqs`, never stored here.
   */
  structuredData: unknown
  datePublished: string
  dateModified: string
  isPublished: boolean
  /** Sort order in the /knowledge hub list. */
  order: number
}

/** Hub-list projection (no blocks/faqs), for the /knowledge index and hasPart. */
export interface KnowledgeArticleSummary {
  slug: string
  title: string
  metaDescription: string
  tags: string[]
  readTime: string
  order: number
  isPublished: boolean
}
