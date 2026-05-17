import Link from "next/link"
import { ArrowRight, MessageCircle } from "lucide-react"
import type {
  HeroAccent,
  HeroBlock as HeroBlockData,
  HeroHeadlinePart,
  LandingTheme,
} from "@/lib/seo/landing-types"

type Props = {
  hero: HeroBlockData
  theme: LandingTheme
}

const ACCENT_CLASS: Record<HeroAccent, string> = {
  default: "",
  green:
    "text-green-700 [[data-theme=dark-industrial]_&]:text-green-400",
  yellow:
    "text-amber-600 [[data-theme=dark-industrial]_&]:text-yellow-300",
}

function renderHeadline(headline: HeroBlockData["headline"]) {
  if (typeof headline === "string") {
    return <span>{headline}</span>
  }
  return (
    <>
      {headline.map((part: HeroHeadlinePart, i) => (
        <span key={i} className={ACCENT_CLASS[part.accent ?? "default"]}>
          {part.text}
          {i < headline.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  )
}

/**
 * Single hero shared by light and dark themes — colour, gradient mesh,
 * and motion-on-scroll are driven by the data-theme attribute set on
 * the parent `<LandingThemeProvider>`.
 *
 * Motion (pulse dot + fade-up on hero copy) only activates on the
 * dark-industrial theme and respects prefers-reduced-motion via the
 * tailwindcss-animate `motion-safe:` variant.
 */
export default function HeroBlock({ hero, theme }: Props) {
  const isDark = theme === "dark-industrial"
  return (
    <section
      className={
        isDark
          ? "relative z-10 px-6 pt-20 pb-14 md:pt-28 md:pb-20 text-center"
          : "relative z-10 px-6 pt-24 pb-14 md:pt-32 md:pb-20 text-center"
      }
    >
      <div className="mx-auto max-w-3xl">
        {hero.eyebrow ? (
          <span
            className={
              isDark
                ? "inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-green-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
                : "inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-green-700"
            }
          >
            {isDark ? (
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-green-400 motion-safe:animate-pulse"
              />
            ) : null}
            {hero.eyebrow}
          </span>
        ) : null}

        <h1
          className={
            isDark
              ? "mt-7 text-4xl md:text-6xl font-bold leading-[1.05] text-white motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700"
              : "mt-6 text-4xl md:text-5xl font-bold leading-tight text-gray-900"
          }
        >
          {renderHeadline(hero.headline)}
        </h1>

        <p
          className={
            isDark
              ? "mx-auto mt-6 max-w-2xl text-base md:text-lg text-slate-300 leading-relaxed motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
              : "mx-auto mt-5 max-w-2xl text-base md:text-lg text-gray-600 leading-relaxed"
          }
        >
          {hero.sub}
        </p>

        {hero.primary || hero.secondary ? (
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {hero.primary ? (
              <Link
                href={hero.primary.href}
                data-gtm={hero.primary.track ?? "hero_primary"}
                className={
                  isDark
                    ? "inline-flex items-center gap-2 rounded-lg bg-green-500 px-7 py-3.5 text-base font-semibold text-black shadow-[0_4px_24px_rgba(0,200,83,0.3)] transition-all hover:-translate-y-0.5 hover:bg-green-400 hover:shadow-[0_8px_32px_rgba(0,200,83,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]"
                    : "inline-flex items-center gap-2 rounded-lg bg-green-600 px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                }
              >
                {hero.primary.label}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : null}

            {hero.secondary ? (
              <Link
                href={hero.secondary.href}
                target={hero.secondary.href.startsWith("http") ? "_blank" : undefined}
                rel={hero.secondary.href.startsWith("http") ? "noopener noreferrer" : undefined}
                data-gtm={hero.secondary.track ?? "hero_secondary"}
                className={
                  isDark
                    ? "inline-flex items-center gap-2 rounded-lg bg-[#25d366] px-6 py-3.5 text-base font-semibold text-white shadow-[0_4px_24px_rgba(37,211,102,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(37,211,102,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]"
                    : "inline-flex items-center gap-2 rounded-lg border-2 border-green-600 px-6 py-3.5 text-base font-semibold text-green-700 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                }
              >
                <MessageCircle size={18} aria-hidden="true" />
                {hero.secondary.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
