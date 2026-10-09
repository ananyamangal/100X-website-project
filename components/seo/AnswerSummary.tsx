import Link from "next/link"
import { formatUpdated } from "@/lib/seo/answer-summaries"

/**
 * Visible answer-first summary block (SEO/AEO item E3, 2026-10): a 40-60 word
 * answer, a "Last updated" date and an organisation byline. Additive only:
 * it is placed next to existing content and never replaces a title, H1 or
 * paragraph. Server component (no client JS).
 */
export default function AnswerSummary({
  summary,
  updated,
  tone = "light",
  className = "",
}: {
  summary: string
  /** YYYY-MM-DD */
  updated: string
  tone?: "light" | "dark"
  className?: string
}) {
  const dark = tone === "dark"
  return (
    <section
      aria-label="Summary"
      data-answer-summary=""
      className={`rounded-xl border px-4 py-3.5 ${
        dark ? "border-white/[0.12] bg-white/[0.04]" : "border-gray-200 bg-gray-50"
      } ${className}`}
    >
      <p className={`text-[11px] font-bold uppercase tracking-widest ${dark ? "text-gray-400" : "text-gray-500"}`}>
        In short
      </p>
      <p className={`mt-1 text-sm leading-relaxed ${dark ? "text-gray-200" : "text-gray-700"}`}>{summary}</p>
      <p className={`mt-2 text-xs ${dark ? "text-gray-500" : "text-gray-500"}`}>
        Last updated <time dateTime={updated}>{formatUpdated(updated)}</time>
        {" · "}By{" "}
        <Link href="/about" className="underline underline-offset-2 hover:text-brand-600">
          100X Circle Pvt Ltd
        </Link>
        , fogging machine manufacturer, Gurugram
      </p>
    </section>
  )
}
