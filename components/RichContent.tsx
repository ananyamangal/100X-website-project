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
  if (!html) return null
  if (!isProbablyRichHtml(html)) {
    return <div className={cn("whitespace-pre-wrap", className)}>{html}</div>
  }
  return (
    <div
      className={cn(
        "rich-html max-w-none leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3",
        "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2",
        "[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3",
        "[&_li]:my-1",
        "[&_a]:text-green-600 [&_a]:underline",
        "[&_span.ql-size-small]:text-sm [&_span.ql-size-large]:text-xl [&_span.ql-size-huge]:text-2xl",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  )
}
