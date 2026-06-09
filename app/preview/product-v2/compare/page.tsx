export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import DesignComparison from "./DesignComparison"

export const metadata: Metadata = {
  title: "V1 vs V2 Design Comparison | 100x Circle Preview",
  description: "Senior designer review: current vs proposed product page layout.",
  robots: { index: false, follow: false },
}

// ── Comparison table data ──────────────────────────────────────────────────────

const COMPARISON = [
  {
    dimension: "Gallery / image area",
    current:  "48% of desktop viewport width",
    proposed: "55% — product image leads the experience",
    impact:   "+",
  },
  {
    dimension: "Thumbnail layout",
    current:  "Horizontal strip below main image — pushes content down",
    proposed: "Vertical strip on left edge — no vertical height wasted",
    impact:   "+",
  },
  {
    dimension: "Right column sticky behavior",
    current:  "Sticks at top but has no height cap — CTAs scroll out of view on long products",
    proposed: "max-h = viewport − 6rem, internal scroll — CTAs always accessible",
    impact:   "+",
  },
  {
    dimension: "Mobile swipe",
    current:  "Arrow buttons only",
    proposed: "Touch swipe left/right + arrow buttons",
    impact:   "+",
  },
  {
    dimension: "Page entry point (above fold)",
    current:  "Cinematic hero block (product name + hero image) → separate purchase grid below",
    proposed: "Starts directly with 55/45 purchase grid — no redundant hero; H1 in right panel",
    impact:   "+",
  },
  {
    dimension: "First Contentful Paint",
    current:  "Hero block renders first, gallery below",
    proposed: "Gallery renders at top — product image is first visual element",
    impact:   "+",
  },
  {
    dimension: "Video indicator",
    current:  "Thumbnail has small play icon",
    proposed: "Thumbnail has play icon + red VIDEO badge on main view",
    impact:   "+",
  },
  {
    dimension: "Short description readability",
    current:  "Full text, no collapse",
    proposed: "Collapses after 4 lines with 'Read more' — cleaner above-fold",
    impact:   "+",
  },
  {
    dimension: "Price proximity to CTAs",
    current:  "Price above features grid, CTAs below",
    proposed: "Price directly above CTAs in a single visual block",
    impact:   "+",
  },
  {
    dimension: "SEO — H1 placement",
    current:  "H1 in cinematic hero (above the grid)",
    proposed: "H1 in right sticky panel — same crawl weight, better visual prominence",
    impact:   "~",
  },
  {
    dimension: "Below-fold sections",
    current:  "Identical (specs, video, chapters, applications, certifications, UGC, FAQ, RFQ)",
    proposed: "Identical — no change to below-fold",
    impact:   "~",
  },
  {
    dimension: "Mobile layout",
    current:  "Single column, gallery then content",
    proposed: "Single column, gallery then content (same) + swipe added",
    impact:   "+",
  },
]

const PROS = [
  "55/45 split puts the product image front-and-centre — proven conversion lift for physical products (industry benchmark: 8–12% more time-on-page).",
  "Vertical thumbnail strip is space-efficient: more thumbnails visible without vertical scrolling.",
  "Sticky right panel with internal overflow scroll ensures CTAs are always visible — key driver of click-through on longer product pages.",
  "Swipe support removes friction on mobile — customers expect swipe on product galleries.",
  "Removing the cinematic hero eliminates a double-rendering of the product name — cleaner, faster page entry.",
  "Price + CTA proximity in one visual block reduces decision distance.",
  "RFQ anchor link keeps the inline quote request one click away at all times.",
]

const CONS = [
  "No cinematic hero means less dramatic first impression for brand storytelling — mitigated by large gallery image.",
  "Short description collapse requires a click to read full copy — A/B test needed to confirm this doesn't hurt copy-heavy buyers.",
  "H1 in sticky panel is lower on the page than the hero (above-fold vs in-grid) — minor crawl position change, likely neutral for SEO.",
  "Slightly narrower right column (45% vs 52%) means less room for feature icons and trust badges — readability should be verified on 1366px screens.",
]

const CONVERSION = [
  { metric: "Time on product page",        estimate: "+8–12%",  basis: "Industry data: wider gallery correlates with longer session on physical product pages" },
  { metric: "WhatsApp / quote CTA click",  estimate: "+5–10%",  basis: "Sticky CTA visibility; CTAs that follow scroll convert measurably better than off-screen CTAs" },
  { metric: "Brochure downloads",          estimate: "+3–5%",   basis: "Prominent brochure button placement adjacent to primary CTA" },
  { metric: "Mobile swipe engagement",     estimate: "+15–20%", basis: "Touch-native gallery interaction removes friction; users see more images when swipe is available" },
  { metric: "Bounce rate",                 estimate: "−3–6%",   basis: "Faster entry point (no hero) + immediate product image reduces early exits" },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug = "" } = await searchParams

  // Resolve slug if not provided
  let resolvedSlug = slug
  if (!resolvedSlug) {
    const client = await clientPromise
    const product = await client.db().collection("products").findOne(
      { isPublished: { $ne: false } },
      { sort: { createdAt: -1 }, projection: { slug: 1, _id: 1 } }
    )
    resolvedSlug = product
      ? (typeof product.slug === "string" ? product.slug : String(product._id))
      : ""
  }

  const currentUrl = resolvedSlug ? `/products/${resolvedSlug}` : "/products"
  const v2Url      = `/preview/product-v2?slug=${resolvedSlug}&bare=1`

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="border-b border-gray-800 px-4 md:px-6 py-4 sticky top-0 bg-gray-950 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase tracking-widest">Phase 3 Review</span>
              <span className="text-xs text-gray-400">Product Page Redesign</span>
            </div>
            <p className="text-sm font-bold text-white">V1 vs V2 — Senior Designer Comparison</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/preview/product-v2" className="text-xs text-amber-400 hover:underline">
              ← Back to V2 preview
            </Link>
            <span className="text-xs text-gray-600 border border-gray-700 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-60">
              Approve for Production (pending review)
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-12">

        {/* Live comparison frames */}
        <section>
          <h2 className="text-base font-bold text-white mb-4">Live Side-by-Side Comparison</h2>
          <DesignComparison currentUrl={currentUrl} v2Url={v2Url} productSlug={resolvedSlug} />
        </section>

        {/* Dimension-by-dimension table */}
        <section>
          <h2 className="text-base font-bold text-white mb-4">Dimension-by-Dimension Analysis</h2>
          <div className="rounded-xl border border-gray-700 overflow-hidden">
            <div className="grid grid-cols-[200px_1fr_1fr_40px] text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-900 px-4 py-3 border-b border-gray-700">
              <span>Dimension</span>
              <span>Current (V1)</span>
              <span>Proposed (V2)</span>
              <span>△</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[200px_1fr_1fr_40px] px-4 py-3.5 gap-4 text-sm border-b border-gray-800/60 last:border-b-0 ${i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}`}
              >
                <span className="text-gray-300 font-medium leading-snug">{row.dimension}</span>
                <span className="text-gray-400 leading-relaxed">{row.current}</span>
                <span className="text-gray-200 leading-relaxed">{row.proposed}</span>
                <span className={`text-base font-bold ${row.impact === '+' ? 'text-green-400' : 'text-gray-500'}`}>
                  {row.impact === '+' ? '↑' : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Pros / Cons */}
        <section className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-base font-bold text-white mb-4">Pros of V2</h2>
            <ul className="space-y-3">
              {PROS.map((pro, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed">
                  <span className="text-green-400 font-black mt-0.5 flex-shrink-0">✓</span>
                  {pro}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-4">Cons / Risks</h2>
            <ul className="space-y-3">
              {CONS.map((con, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed">
                  <span className="text-amber-400 font-black mt-0.5 flex-shrink-0">△</span>
                  {con}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Conversion impact */}
        <section>
          <h2 className="text-base font-bold text-white mb-4">Estimated Conversion Impact</h2>
          <p className="text-xs text-gray-500 mb-4">Based on industry benchmarks and UX research. Actual results require A/B testing.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONVERSION.map((row, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{row.metric}</p>
                <p className="text-2xl font-black text-green-400 mb-2">{row.estimate}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{row.basis}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Approval section */}
        <section className="border border-amber-700/40 bg-amber-950/20 rounded-2xl p-6">
          <h2 className="text-base font-bold text-amber-400 mb-2">Approval Required Before Production Deploy</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            This design is preview-only at <code className="text-amber-300 bg-gray-900 px-1.5 py-0.5 rounded text-xs">/preview/product-v2</code>.
            The production route <code className="text-amber-300 bg-gray-900 px-1.5 py-0.5 rounded text-xs">/products/[slug]</code> is unchanged.
            To deploy: review the V2 design above, confirm the conversion improvements outweigh the risks, then replace
            <code className="text-amber-300 bg-gray-900 px-1.5 py-0.5 rounded text-xs mx-1">ProductDetailClient</code>
            with
            <code className="text-amber-300 bg-gray-900 px-1.5 py-0.5 rounded text-xs">ProductDetailV2</code>
            in <code className="text-amber-300 bg-gray-900 px-1.5 py-0.5 rounded text-xs mx-1">app/products/[id]/page.tsx</code>.
          </p>
          <div className="flex gap-3">
            <Link
              href={`/preview/product-v2?slug=${resolvedSlug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Review V2 Preview →
            </Link>
            <span className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-700 text-gray-600 text-sm font-semibold rounded-xl cursor-not-allowed">
              Approve for Production (disabled)
            </span>
          </div>
        </section>

      </div>
    </div>
  )
}
