"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"
import Container from "../primitives/Container"
import Section from "../primitives/Section"
import SectionHeading from "../primitives/SectionHeading"
import Card from "../primitives/Card"

export type Testimonial = {
  quote: string
  /** Speaker name OR organisation name when individual is confidential. */
  author: string
  /** Role / title under the name. */
  role?: string
  /** Optional logo or photo path. */
  avatar?: string
}

type Props = {
  items: Testimonial[]
  eyebrow?: string
  title?: string
  sub?: string
}

const FALLBACK: Testimonial[] = [
  {
    quote:
      "The double-barrel units cleared our ward backlog in two weeks. Documentation arrived ready for audit — exactly what tender procurement needs.",
    author: "Procurement Officer",
    role: "Tier-1 Municipal Corporation",
  },
  {
    quote:
      "OEM authorization process took less than 48 hours. We've sold five GeM orders in the first quarter — margins clean and dispatch reliable.",
    author: "GeM Reseller (Lucknow)",
    role: "Channel partner",
  },
  {
    quote:
      "Dense fog output, low maintenance, English + Hindi support. We've standardised on 100x Circle across our pest-control branches.",
    author: "Operations Head",
    role: "Pest-control firm, Mumbai",
  },
]

/**
 * Embla-driven testimonial slider. One-card-per-view on mobile, two on
 * desktop. Prev/next nav, dot pagination, autoplay-free (avoids
 * jankiness with reduced-motion users). Card height equalises so the
 * row stays grid-perfect.
 */
export default function TestimonialSlider({
  items,
  eyebrow = "Field feedback",
  title = "Trusted by procurement, dealers, and operations teams.",
  sub,
}: Props) {
  const data = items.length ? items : FALLBACK
  const [emblaRef, embla] = useEmblaCarousel({
    align: "start",
    loop: false,
    skipSnaps: false,
  })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback(() => {
    if (!embla) return
    setCanPrev(embla.canScrollPrev())
    setCanNext(embla.canScrollNext())
    setSelected(embla.selectedScrollSnap())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    onSelect()
    embla.on("select", onSelect)
    embla.on("reInit", onSelect)
  }, [embla, onSelect])

  return (
    <Section tone="surface" ariaLabelledBy="testimonials-heading">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} id="testimonials-heading" />

        <div className="mt-12 md:mt-14">
          <div className="overflow-hidden" ref={emblaRef}>
            <ul className="flex list-none -ml-4 md:-ml-5">
              {data.map((t, i) => (
                <li
                  key={i}
                  className="basis-full md:basis-1/2 lg:basis-1/2 shrink-0 grow-0 pl-4 md:pl-5"
                >
                  <Card tone="solid" className="h-full p-7 md:p-8">
                    <Quote
                      size={28}
                      aria-hidden="true"
                      className="text-[var(--rd-accent)]/70 mb-5"
                    />
                    <p className="text-base md:text-lg leading-relaxed text-[var(--rd-text)]">
                      “{t.quote}”
                    </p>
                    <div className="mt-6 flex items-center gap-3 border-t border-[var(--rd-border)] pt-5">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rd-accent-soft)] text-[var(--rd-accent)] font-bold text-sm">
                        {t.author.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--rd-text)]">
                          {t.author}
                        </div>
                        {t.role ? (
                          <div className="text-xs text-[var(--rd-text-muted)]">{t.role}</div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 flex items-center justify-between">
            <div className="flex items-center gap-2" aria-label="Slide indicators">
              {data.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={selected === i}
                  onClick={() => embla?.scrollTo(i)}
                  className={
                    selected === i
                      ? "h-1.5 w-6 rounded-full bg-[var(--rd-accent)] transition-all"
                      : "h-1.5 w-1.5 rounded-full bg-[var(--rd-border-strong)] transition-all hover:bg-[var(--rd-text-muted)]"
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous testimonial"
                disabled={!canPrev}
                onClick={() => embla?.scrollPrev()}
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--rd-border-strong)] bg-[var(--rd-surface-1)] text-[var(--rd-text)] transition-all hover:border-[var(--rd-accent)] hover:text-[var(--rd-accent)] disabled:opacity-40 disabled:hover:border-[var(--rd-border-strong)] disabled:hover:text-[var(--rd-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-accent)]"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next testimonial"
                disabled={!canNext}
                onClick={() => embla?.scrollNext()}
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--rd-border-strong)] bg-[var(--rd-surface-1)] text-[var(--rd-text)] transition-all hover:border-[var(--rd-accent)] hover:text-[var(--rd-accent)] disabled:opacity-40 disabled:hover:border-[var(--rd-border-strong)] disabled:hover:text-[var(--rd-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-accent)]"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
