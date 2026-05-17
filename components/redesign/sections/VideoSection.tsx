"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import Container from "../primitives/Container"
import Section from "../primitives/Section"
import SectionHeading from "../primitives/SectionHeading"

type Props = {
  /** YouTube video ID (the 11-char string after `?v=`). */
  youtubeId: string
  /** Optional custom poster — falls back to YouTube's maxresdefault. */
  posterSrc?: string
  posterAlt?: string
  eyebrow?: string
  title?: string
  sub?: string
}

/**
 * Lazy-loaded YouTube embed using the "facade" pattern: nothing loads
 * from youtube.com until the user clicks play. Cuts the first-paint
 * cost of a YouTube iframe (~500KB + multiple third-party requests).
 *
 * Visually: clickable poster with a centered orange play button. On
 * click, the poster is replaced with the real <iframe> using
 * `autoplay=1` so the click acts as the play action — UX-equivalent
 * to a native player.
 */
export default function VideoSection({
  youtubeId,
  posterSrc,
  posterAlt = "Product demonstration video",
  eyebrow = "Demo",
  title = "See the machines in real conditions.",
  sub = "Field-side footage of 100x Circle equipment in deployment — output, coverage, and operator workflow.",
}: Props) {
  const [active, setActive] = useState(false)
  const poster =
    posterSrc ?? `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`

  return (
    <Section tone="bg" ariaLabelledBy="video-heading">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} id="video-heading" />
        <div className="mt-12 md:mt-14 mx-auto max-w-4xl">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--rd-border)] bg-[var(--rd-surface-1)] shadow-[var(--rd-shadow-card)]">
            {active ? (
              <iframe
                src={embedUrl}
                title="Product demonstration"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <button
                type="button"
                aria-label="Play product demonstration video"
                onClick={() => setActive(true)}
                className="group absolute inset-0 flex items-center justify-center focus-visible:outline-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster}
                  alt={posterAlt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-95"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="relative z-10 grid h-20 w-20 place-items-center rounded-full bg-[var(--rd-accent)] text-black shadow-[var(--rd-shadow-accent)] transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-white">
                  <Play size={32} aria-hidden="true" fill="currentColor" />
                </span>
              </button>
            )}
          </div>
        </div>
      </Container>
    </Section>
  )
}
