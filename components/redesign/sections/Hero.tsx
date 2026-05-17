import Container from "../primitives/Container"
import Eyebrow from "../primitives/Eyebrow"
import Button from "../primitives/Button"

export type HeroCta = { label: string; href: string; track?: string }

export type HeroHeadlinePart = {
  text: string
  /** `accent` paints the part in industrial orange — use sparingly, one word max. */
  accent?: boolean
}

type Props = {
  /** Small uppercase orange label above the headline. */
  eyebrow?: string
  /**
   * Display headline. Pass a string for a one-tone title, or an array
   * of parts to colour-tokenise a single word in orange.
   */
  headline: string | HeroHeadlinePart[]
  /** Single subheading paragraph (60–120 chars works best at this scale). */
  sub: string
  primary?: HeroCta
  secondary?: HeroCta
  /**
   * Optional self-hosted MP4 path. When missing, the gradient + poster
   * still render — the hero degrades gracefully and never blanks out.
   * Recommended: `/videos/hero-fog.mp4` (≤ 800 KB) + `/videos/hero-fog-poster.jpg`.
   */
  videoSrc?: string
  videoPoster?: string
}

function renderHeadline(headline: HeroBlockHeadline) {
  if (typeof headline === "string") return <span>{headline}</span>
  return (
    <>
      {headline.map((part, i) => (
        <span
          key={i}
          className={part.accent ? "text-[var(--rd-accent)]" : undefined}
        >
          {part.text}
          {i < headline.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  )
}

type HeroBlockHeadline = string | HeroHeadlinePart[]

/**
 * Full-bleed industrial hero. Optional looping video background, dark
 * gradient overlay, large display headline with single-word orange
 * accent, primary + WhatsApp CTAs. Mobile-first padding scale.
 *
 * Motion respects prefers-reduced-motion: the <video> auto-pauses via
 * the media query — no JS needed.
 *
 * CWV: video is `preload="metadata"`, poster does the heavy lifting on
 * first paint. If `videoSrc` is omitted the hero is poster + gradient
 * (no extra requests).
 */
export default function Hero({
  eyebrow,
  headline,
  sub,
  primary,
  secondary,
  videoSrc,
  videoPoster,
}: Props) {
  return (
    <section
      className="relative overflow-hidden bg-[var(--rd-bg)]"
      aria-label="Hero"
    >
      {/* ─── Background layer ───────────────────────────────────────── */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {videoPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={videoPoster}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-60"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,rgba(255,106,0,0.12),transparent_55%)]" />
        )}
        {videoSrc ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={videoPoster}
            className="absolute inset-0 h-full w-full object-cover opacity-50 motion-reduce:hidden"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : null}
        {/* Dark gradient + vignette so foreground text always meets WCAG. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <Container className="relative z-10 py-24 md:py-36 lg:py-44">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? (
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">
              <Eyebrow withDot>{eyebrow}</Eyebrow>
            </div>
          ) : null}

          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] text-white motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
            {renderHeadline(headline)}
          </h1>

          <p className="mx-auto mt-6 md:mt-8 max-w-2xl text-base md:text-lg text-[var(--rd-text-muted)] leading-relaxed motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-150">
            {sub}
          </p>

          {primary || secondary ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-300">
              {primary ? (
                <Button
                  href={primary.href}
                  variant="primary"
                  size="lg"
                  trailing
                  dataGtm={primary.track ?? "hero_primary"}
                >
                  {primary.label}
                </Button>
              ) : null}
              {secondary ? (
                <Button
                  href={secondary.href}
                  variant={secondary.href.startsWith("https://wa.me") ? "whatsapp" : "secondary"}
                  size="lg"
                  dataGtm={secondary.track ?? "hero_secondary"}
                >
                  {secondary.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
