import Link from "next/link"
import type { CtaBandData } from "@/lib/seo/landing-types"

type Props = {
  band: CtaBandData
}

/**
 * Wide CTA banner. Sits between dense content and the FAQ, restating
 * the page's primary action with a contrasting background.
 */
export default function CtaBandBlock({ band }: Props) {
  if (!band?.heading) return null
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-10 md:px-12 md:py-14 shadow-xl text-white [[data-theme=dark-industrial]_&]:from-green-500 [[data-theme=dark-industrial]_&]:to-brand-700">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                {band.heading}
              </h2>
              {band.sub ? (
                <p className="mt-2 text-green-50/90 leading-relaxed">
                  {band.sub}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={band.primary.href}
                data-gtm="cta_band_primary"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-600"
              >
                {band.primary.label}
              </Link>
              {band.secondary ? (
                <Link
                  href={band.secondary.href}
                  data-gtm="cta_band_secondary"
                  className="inline-flex items-center justify-center rounded-md border border-white/70 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-600"
                >
                  {band.secondary.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
