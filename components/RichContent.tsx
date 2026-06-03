import { cn } from "@/lib/utils"
import { isProbablyRichHtml, sanitizeRichHtml } from "@/lib/rich-text"

type RichContentProps = {
  html: string
  className?: string
}

/**
 * Renders admin-authored HTML safely, or plain text (legacy) with preserved line breaks.
 */
export function RichContent({ html, className }: RichContentProps) {
  const safe = typeof html === "string" ? html : html == null ? "" : String(html)
  if (!safe) return null
  if (!isProbablyRichHtml(safe)) {
    return <div className={cn("whitespace-pre-wrap", className)}>{safe}</div>
  }
  return (
    <div
      className={cn(
        "rich-html max-w-none leading-relaxed",
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
        // Tables — scrollable on mobile, no overflow
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm",
        "[&_thead]:bg-gray-50 [&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-700",
        "[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-gray-700",
        "[&_table]:block [&_table]:overflow-x-auto [&_table]:md:table",
        // Blockquotes
        "[&_blockquote]:border-l-4 [&_blockquote]:border-green-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4",
        // Code
        "[&_pre]:bg-gray-900 [&_pre]:text-brand-400 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm",
        "[&_code]:bg-gray-100 [&_code]:text-gray-800 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm",
        "[&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0",
        // Quill size classes
        "[&_span.ql-size-small]:text-sm [&_span.ql-size-large]:text-xl [&_span.ql-size-huge]:text-2xl",
        // HR
        "[&_hr]:my-6 [&_hr]:border-gray-200",
        // Strong/em
        "[&_strong]:font-semibold [&_strong]:text-gray-900",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(safe) }}
    />
  )
}
