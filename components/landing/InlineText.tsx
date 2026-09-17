import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Minimal inline markup for copy that lives in plain-string content sources
 * (landing registry, FAQ arrays): `[label](/path)` links and `**bold**`.
 *
 * One string is the single source for BOTH the visible markup (links/bold
 * rendered) and any JSON-LD mirror (`inlineToPlainText` — same words, no
 * markup), so FAQPage schema can never drift from the rendered answer.
 * Strings without these tokens render exactly as before.
 */
const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g

export function inlineToPlainText(text: string): string {
  return text.replace(TOKEN, (_m, label?: string, _href?: string, bold?: string) => label ?? bold ?? "")
}

type Props = {
  text: string
  linkClassName?: string
}

export default function InlineText({
  text,
  linkClassName = "text-brand-700 underline underline-offset-2 hover:text-brand-600 [[data-theme=dark-industrial]_&]:text-brand-400",
}: Props) {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0
    if (start > last) out.push(text.slice(last, start))
    const [, label, href, bold] = m
    if (label !== undefined && href !== undefined) {
      out.push(
        /^https?:\/\//.test(href) ? (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            {label}
          </a>
        ) : (
          <Link key={key++} href={href} className={linkClassName}>
            {label}
          </Link>
        ),
      )
    } else if (bold !== undefined) {
      out.push(<strong key={key++}>{bold}</strong>)
    }
    last = start + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
