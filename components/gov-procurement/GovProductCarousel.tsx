"use client"

const GOV_BADGE_PRIORITY = ["BIS Approved","ISI","GeM","GeM Registered","Made in India","Heavy Duty"]
const GOV_CATEGORIES = ["Fogging Machines","Thermal Fogging Machines"]
const EXCLUDE_TERMS = ["trolley","baggage","power tiller","tiller","sprayer"]

export interface ProductSlim {
  _id: string
  name: string
  slug: string
  imageUrls: string[]
  badges: string[]
  category: string
}

function govScore(p: ProductSlim): number {
  const n = p.name.toLowerCase()
  if (p.badges.includes("BIS Approved")) return 10
  if (n.includes("double barrel")) return 8
  if (n.includes("vehicle") || n.includes("heavy")) return 7
  if (n.includes("isi") || n.includes("hdpe")) return 6
  if (p.badges.includes("Best Seller")) return 5
  if (p.badges.some(b => ["GeM","GeM Registered"].includes(b))) return 4
  return 1
}

function specLine(p: ProductSlim): string {
  const n = p.name.toLowerCase()
  if (n.includes("double barrel")) return "Vehicle-mountable · Dual output · City-wide coverage"
  if (n.includes("vehicle")) return "Vehicle-mounted · High-capacity · Municipal-grade"
  if (n.includes("isi") || n.includes("hdpe")) return "ISI marked · IS 14855 (Part 1) · HDPE tank"
  if (n.includes("stainless") || n.includes("ss")) return "Stainless steel tank · Heavy-duty"
  if (n.includes("mini") || n.includes("small")) return "Portable · Single operator · Gram Panchayat use"
  if (n.includes("cold")) return "Cold ULV fogging · Indoor & outdoor"
  return "IS 14855 compliant · GeM listed"
}

export default function GovProductCarousel({ products }: { products: ProductSlim[] }) {
  const filtered = products
    .filter(p =>
      (GOV_CATEGORIES.includes(p.category) || p.badges.some(b => ["GeM","GeM Registered"].includes(b))) &&
      !EXCLUDE_TERMS.some(t => p.name.toLowerCase().includes(t))
    )
    .sort((a, b) => govScore(b) - govScore(a))
    .slice(0, 6)

  if (filtered.length === 0) return null

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map(p => {
        const img = p.imageUrls?.[0]
        const govBadges = p.badges.filter(b => GOV_BADGE_PRIORITY.includes(b)).slice(0, 3)
        const cleanName = p.name.trim().replace(/\s+/g, " ")
        return (
          <div key={p._id || p.slug} className="border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:border-brand-300 transition-colors">
            {img ? (
              <div className="h-40 bg-gray-50 flex items-center justify-center p-2">
                <img src={img} alt={cleanName} className="max-h-full max-w-full object-contain" loading="lazy" />
              </div>
            ) : (
              <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No image</div>
            )}
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">{cleanName}</h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{specLine(p)}</p>
              {govBadges.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {govBadges.map(b => (
                    <span key={b} className="text-[10px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded-full font-medium">
                      {b}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex gap-2">
                <a
                  href={`/${p.slug}`}
                  className="flex-1 text-center text-xs border border-gray-300 text-gray-700 px-2 py-2 rounded-lg hover:border-brand-400 hover:text-brand-600 transition-colors"
                >
                  View Details
                </a>
                <a
                  href="#gov-rfq-form"
                  className="flex-1 text-center text-xs bg-brand-600 text-white px-2 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Request Quote
                </a>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
