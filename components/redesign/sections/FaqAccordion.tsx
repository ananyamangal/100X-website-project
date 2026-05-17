"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import Container from "../primitives/Container"
import Section from "../primitives/Section"
import SectionHeading from "../primitives/SectionHeading"

export type FaqEntry = {
  q: string
  /** Plain text; rendered verbatim and mirrored into FAQPage JSON-LD. */
  a: string
}

type Props = {
  faqs: FaqEntry[]
  eyebrow?: string
  title?: string
  sub?: string
  /** Suppress the FAQPage JSON-LD when another block on the page already emits it. */
  suppressSchema?: boolean
}

/**
 * Radix Accordion FAQ. One open at a time, smooth height transitions
 * via Radix's CSS variable (--radix-accordion-content-height) and the
 * `tailwindcss-animate` accordion-up/down keyframes that ship in the
 * existing tailwind config.
 *
 * Mirrors the visible Q&A into a FAQPage JSON-LD block so Google
 * picks up the schema without divergence from the rendered content.
 */
export default function FaqAccordion({
  faqs,
  eyebrow = "Frequently asked questions",
  title = "Answers for buyers, dealers, and procurement teams.",
  sub,
  suppressSchema = false,
}: Props) {
  if (!faqs?.length) return null

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <Section tone="bg" ariaLabelledBy="faq-heading">
      <Container width="narrow">
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} id="faq-heading" />
        <Accordion.Root
          type="single"
          collapsible
          className="mt-12 md:mt-14 divide-y divide-[var(--rd-border)] rounded-2xl border border-[var(--rd-border)] bg-[var(--rd-surface-1)] shadow-[var(--rd-shadow-card)]"
        >
          {faqs.map((f, i) => (
            <Accordion.Item key={i} value={`faq-${i}`}>
              <Accordion.Header className="flex">
                <Accordion.Trigger className="group flex w-full items-start justify-between gap-4 p-6 md:p-7 text-left font-semibold text-[var(--rd-text)] focus-visible:outline-none focus-visible:bg-white/[0.02] [&[data-state=open]]:text-[var(--rd-accent)] transition-colors">
                  <span className="text-base md:text-lg leading-snug">{f.q}</span>
                  <ChevronDown
                    size={20}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[var(--rd-text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-[var(--rd-accent)]"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-[var(--rd-text-muted)] data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <p className="px-6 md:px-7 pb-6 md:pb-7 text-sm md:text-base leading-relaxed">
                  {f.a}
                </p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Container>

      {suppressSchema ? null : (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </Section>
  )
}
