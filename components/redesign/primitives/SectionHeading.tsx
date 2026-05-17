import { cn } from "@/lib/utils"
import Eyebrow from "./Eyebrow"

type Props = {
  eyebrow?: string
  title: string
  /** Optional subheading paragraph rendered under the title. */
  sub?: string
  /** ARIA id so the parent <Section ariaLabelledBy> can reference it. */
  id?: string
  align?: "left" | "center"
  className?: string
  /** Tag override — defaults to h2 (most common). */
  as?: "h1" | "h2" | "h3"
}

/**
 * Shared section header — Eyebrow + h2 + optional sub. Apple/Tesla
 * spacing: tight title→sub gap, generous bottom margin set by the
 * containing Section.
 */
export default function SectionHeading({
  eyebrow,
  title,
  sub,
  id,
  align = "center",
  className,
  as: Heading = "h2",
}: Props) {
  return (
    <div className={cn(align === "center" ? "text-center mx-auto max-w-3xl" : "text-left max-w-3xl", className)}>
      {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
      <Heading
        id={id}
        className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--rd-text)] leading-[1.05]"
      >
        {title}
      </Heading>
      {sub ? (
        <p className="mt-5 md:mt-6 text-base md:text-lg text-[var(--rd-text-muted)] leading-relaxed">
          {sub}
        </p>
      ) : null}
    </div>
  )
}
