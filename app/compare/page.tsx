import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import { COMPARISONS } from "@/lib/comparisons/data"

export const metadata: Metadata = {
  title: "Fogging Machine Comparisons & Buyer Guides — 100X Circle",
  description:
    "20+ in-depth comparisons and buyer guides for thermal fogging machines in India. Indian OEM vs imports, vehicle-mounted vs portable, municipal vs agricultural, GeM procurement guides.",
  alternates: { canonical: `${SITE_URL}/compare` },
}

const CATEGORY_LABELS: Record<string, string> = {
  "Comparison": "Brand & Origin Comparisons",
  "Buyer Guide": "Buyer Guides",
  "Municipal": "Municipal & Government",
  "Agriculture": "Agricultural Use",
  "GeM": "GeM Procurement",
  "PCO": "Pest Control Operators",
}

const FEATURED_SLUGS = [
  "100x-circle-vs-korean-fogging-machines",
  "vehicle-mounted-vs-portable-thermal-fogger",
  "fogging-machine-buyer-guide-india",
  "gem-fogging-machines-india",
  "best-thermal-fogging-machine-for-municipal-use",
  "fogging-machine-price-guide-india-2026",
]

export default function CompareHubPage() {
  const featured = COMPARISONS.filter((c) => FEATURED_SLUGS.includes(c.slug))
  const rest = COMPARISONS.filter((c) => !FEATURED_SLUGS.includes(c.slug))

  return (
    <>
      {/* Cinematic hero */}
      <section className="bg-gray-950 pt-24 pb-12 md:pt-28 md:pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-6">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Compare</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Comparisons & Buyer Guides</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Choose the right fogging machine.
            </h1>
            <p className="text-cinema-300 leading-relaxed">
              In-depth comparisons and buyer guides — brand, use-case, procurement routes, and total cost of ownership.
            </p>
          </div>
        </div>
      </section>
    <main className="max-w-5xl mx-auto px-4 py-10">

      <section className="mb-12">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Featured Guides</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="group border border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all"
            >
              <div className="flex flex-wrap gap-1 mb-2">
                {c.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 text-sm leading-snug mb-1">
                {c.h1}
              </h3>
              <p className="text-xs text-gray-400">{c.readTime} read</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">All Comparisons & Guides</h2>
        <div className="divide-y divide-gray-100">
          {rest.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="group flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded-lg transition-colors"
            >
              <div>
                <span className="font-medium text-gray-800 group-hover:text-brand-700 text-sm">
                  {c.h1}
                </span>
                <div className="flex gap-1 mt-1">
                  {c.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0 ml-4">{c.readTime}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-12 bg-brand-50 border border-brand-200 rounded-xl p-5 text-sm">
        <p className="font-semibold text-brand-800 mb-2">Get a Custom Recommendation</p>
        <p className="text-brand-700 mb-3">
          Not sure which fogging machine fits your specific requirement? Contact 100X Circle
          directly — we help municipal officers, farmers, and PCOs choose the right equipment.
        </p>
        <div className="flex flex-wrap gap-4 text-brand-800 font-medium">
          <span>+91-7827229116</span>
          <span>100xcircle@gmail.com</span>
        </div>
      </div>
    </main>
    </>
  )
}
