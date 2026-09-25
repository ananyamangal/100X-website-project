import { cn } from "@/lib/utils"
import { isProbablyRichHtml, normalizeNbsp, sanitizeRichHtml } from "@/lib/rich-text"
import { wrapFaqAccordion } from "@/lib/faqAccordion"
import { enhanceTables } from "@/lib/richTables"

type RichContentProps = {
  html: string
  className?: string
  /**
   * Wrap an existing "Frequently Asked Questions" h2 + h3/p block (if the
   * content has one) in native <details>/<summary> so it becomes
   * clickable/expandable. Opt-in and off by default — every call site other
   * than the blog post page renders exactly as before. Pure presentation:
   * doesn't touch JSON-LD, heading text/level, or word count; a safe no-op
   * when the exact pattern isn't found. See lib/faqAccordion.ts.
   */
  faqAccordion?: boolean
}

/**
 * Renders admin-authored HTML safely, or plain text (legacy) with preserved line breaks.
 */
export function RichContent({ html, className, faqAccordion = false }: RichContentProps) {
  const safe = normalizeNbsp(html)
  if (!safe) return null
  // Plain-text branch has no child elements to scope a break-anywhere rule
  // to, so it keeps the blanket overflow-wrap as a safety net for a raw
  // unbroken token (pasted URL, SKU/model code, no-space string) — these
  // fields (excerpts, short descriptions) are short, so the tradeoff is rare.
  if (!isProbablyRichHtml(safe)) {
    return (
      <div className={cn("whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]", className)}>
        {safe}
      </div>
    )
  }
  return (
    <div
      className={cn(
        // NOT a blanket overflow-wrap/word-break here: `anywhere` affects the
        // browser's line-breaking algorithm for ALL text, not just genuinely
        // unbreakable tokens, so ordinary short/medium words end up split
        // mid-character whenever they land near a line-wrap boundary (e.g.
        // "treatment" rendering as "tr" / "eatment" across two lines) —
        // reproduced on a live blog post: 51 words split on one article with
        // the blanket rule, 0 with it removed. The long-unbroken-token
        // overflow risk this was meant to guard against realistically only
        // shows up in links and inline code, so it's scoped to `a`/`code`
        // below instead of applied to all text.
        "rich-html max-w-none leading-relaxed",
        "[&_a]:[overflow-wrap:anywhere] [&_a]:[word-break:break-word]",
        // Paragraphs
        "[&_p]:mb-4 [&_p:last-child]:mb-0",
        // Headings with clear hierarchy
        "[&_h1]:text-2xl [&_h1]:md:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:leading-tight",
        "[&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:leading-snug",
        "[&_h3]:text-lg [&_h3]:md:text-xl [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-5 [&_h3]:mb-2",
        "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-gray-800 [&_h4]:mt-4 [&_h4]:mb-2",
        // Lists
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1",
        "[&_li]:text-gray-700",
        // Links
        "[&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-700",
        // Images — responsive, no overflow
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4",
        // Tables — enhanceTables() wraps each in .rich-table-scroll, which is what
        // scrolls sideways on a phone; the table itself stays a real table.
        "[&_.rich-table-scroll]:overflow-x-auto [&_.rich-table-scroll]:my-6 [&_.rich-table-scroll]:max-w-full",
        "[&_table]:w-full [&_table]:min-w-[32rem] [&_table]:border-collapse [&_table]:text-sm",
        "[&_thead]:bg-green-50 [&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900",
        "[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-gray-700 [&_td]:align-top",
        "[&_tbody_tr:nth-child(even)]:bg-gray-50",
        // Blockquotes
        "[&_blockquote]:border-l-4 [&_blockquote]:border-green-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4",
        // Code
        "[&_pre]:bg-gray-900 [&_pre]:text-brand-400 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm",
        "[&_code]:bg-gray-100 [&_code]:text-gray-800 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:max-w-full [&_code]:[word-break:break-all]",
        "[&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0",
        // Quill size classes
        "[&_span.ql-size-small]:text-sm [&_span.ql-size-large]:text-xl [&_span.ql-size-huge]:text-2xl",
        // HR
        "[&_hr]:my-6 [&_hr]:border-gray-200",
        // Strong/em
        "[&_strong]:font-semibold [&_strong]:text-gray-900",
        // FAQ accordion (see lib/faqAccordion.ts) — native <details>/<summary>,
        // so it works without JS. Question keeps its own h3 styling above;
        // only the disclosure chrome and spacing are added here.
        "[&_details.faq-accordion-item]:mt-3 [&_details.faq-accordion-item]:mb-3 [&_details.faq-accordion-item]:rounded-xl [&_details.faq-accordion-item]:border [&_details.faq-accordion-item]:border-gray-200 [&_details.faq-accordion-item]:px-4 [&_details.faq-accordion-item]:py-1",
        "[&_summary.faq-accordion-summary]:cursor-pointer [&_summary.faq-accordion-summary]:list-none [&_summary.faq-accordion-summary]:flex [&_summary.faq-accordion-summary]:items-start [&_summary.faq-accordion-summary]:justify-between [&_summary.faq-accordion-summary]:gap-3",
        "[&_summary.faq-accordion-summary::-webkit-details-marker]:hidden",
        "[&_summary.faq-accordion-summary_h3]:mt-0 [&_summary.faq-accordion-summary_h3]:mb-0",
        "[&_.faq-accordion-chevron]:mt-1.5 [&_.faq-accordion-chevron]:shrink-0 [&_.faq-accordion-chevron]:text-brand-700 [&_.faq-accordion-chevron]:transition-transform [&_.faq-accordion-chevron]:duration-200",
        "[&_details.faq-accordion-item[open]_.faq-accordion-chevron]:rotate-180",
        "[&_.faq-accordion-answer]:mt-1",
        "[&_.faq-accordion-answer_p]:mb-2 [&_.faq-accordion-answer_p:last-child]:mb-2",
        className
      )}
      dangerouslySetInnerHTML={{
        __html: faqAccordion
          ? wrapFaqAccordion(enhanceTables(sanitizeRichHtml(safe)))
          : enhanceTables(sanitizeRichHtml(safe)),
      }}
    />
  )
}
