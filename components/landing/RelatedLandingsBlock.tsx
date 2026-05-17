import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  getAllLandingPages,
  getLandingDisplayName,
  getLandingPage,
} from "@/lib/seo/landing-pages"
import SectionHeader from "./SectionHeader"

type Props = {
  eyebrow?: string
  title?: string
  /** Explicit slug list; falls back to currentSlug's registry-level relatedLandingSlugs. */
  slugs?: string[]
  /** Current landing slug — used to exclude self and resolve fallback. */
  currentSlug: string
  /** Cap; defaults to 4. */
  limit?: number
}

const SECTION_LABEL_BY_FALLBACK = "More guides & resources"

export default function RelatedLandingsBlock({
  eyebrow = "Related",
  title = SECTION_LABEL_BY_FALLBACK,
  slugs,
  currentSlug,
  limit = 4,
}: Props) {
  // Resolve which slugs to surface.
  let pickList = slugs?.length ? slugs : undefined
  if (!pickList) {
    const def = getLandingPage(currentSlug)
    pickList = def?.relatedLandingSlugs?.length
      ? def.relatedLandingSlugs
      : undefined
  }
  if (!pickList) {
    // Final fallback — pull top other landings registry-wide.
    pickList = getAllLandingPages()
      .map((d) => d.slug)
      .filter((s) => s !== currentSlug)
  }

  const items: { slug: string; title: string; description: string; type: string }[] = []
  for (const s of pickList) {
    if (items.length >= limit) break
    if (s === currentSlug) continue
    const def = getLandingPage(s)
    if (!def) continue
    items.push({
      slug: s,
      title: getLandingDisplayName(s) ?? s,
      description: def.metadata.description.slice(0, 120),
      type: def.type,
    })
  }

  if (items.length === 0) return null

  return (
    <section className="py-14 md:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-2 gap-4 list-none">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/${item.slug}`}
                className="group flex h-full items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 [[data-theme=dark-industrial]_&]:bg-white/[0.04] [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:hover:border-green-500/40"
              >
                <div>
                  <span className="inline-block mb-2 text-[11px] font-semibold uppercase tracking-wider text-green-700 [[data-theme=dark-industrial]_&]:text-green-400">
                    {item.type.replace("-", " ")}
                  </span>
                  <h3 className="text-base md:text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors [[data-theme=dark-industrial]_&]:text-white [[data-theme=dark-industrial]_&]:group-hover:text-green-400">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2 [[data-theme=dark-industrial]_&]:text-slate-300">
                    {item.description}
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-green-600 transition-transform group-hover:translate-x-0.5 [[data-theme=dark-industrial]_&]:text-green-400"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
