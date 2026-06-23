export const revalidate = 120

import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Government & Institutional Deployments | 100x Circle",
  description:
    "See where 100x Circle thermal fogging machines have been deployed — government health departments, municipalities, and institutions across India.",
  alternates: { canonical: `${SITE_URL}/deployments` },
}

async function getDeployments() {
  try {
    const client = await clientPromise
    const db = client.db()
    return await db.collection("deployments").find({ images: { $exists: true, $ne: [] } }).sort({ createdAt: -1 }).toArray()
  } catch {
    return []
  }
}

export default async function DeploymentsPage() {
  const deployments = await getDeployments()

  return (
    <div className="min-h-screen bg-white">
      {/* Cinematic Hero */}
      <section className="bg-gray-950 pt-24 pb-14 md:pt-28 md:pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Deployments</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-4">Field Deployments</p>
            <h1 className="text-4xl md:text-5xl font-800 text-white mb-5 leading-tight text-balance">
              Deployed across India.
            </h1>
            <p className="text-cinema-300 text-lg leading-relaxed">
              Government health departments, municipalities, and institutions trust 100X Circle machines for vector control and public health programs.
            </p>
          </div>
        </div>
      </section>
      <div className="bg-gray-50">

      <div className="max-w-6xl mx-auto px-4 py-12">
        {deployments.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-xl mb-2">Deployments coming soon</p>
            <p className="text-sm">We are documenting our field deployments. Check back soon.</p>
            <Link href="/contact-us" className="mt-6 inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors">
              Contact Us
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {deployments.map((d: any) => (
              <div
                key={String(d._id)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {d.images?.[0] && (
                  <img
                    src={d.images[0]}
                    alt={d.location || "Deployment"}
                    className="w-full h-52 object-cover"
                  />
                )}
                {d.images?.length > 1 && (
                  <div className="flex gap-1.5 px-4 pt-3">
                    {d.images.slice(1, 4).map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="w-16 h-12 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {d.department && (
                      <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-medium">
                        {d.department}
                      </span>
                    )}
                    {d.product && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                        {d.product}
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold text-gray-900 text-lg mb-2">
                    {d.location || "Deployment"}
                  </h2>
                  {d.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">{d.description}</p>
                  )}
                  {d.videos?.length > 0 && (
                    <div className="mt-4">
                      {d.videos.slice(0, 1).map((url: string, i: number) => {
                        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
                        if (ytMatch) {
                          return (
                            <div key={i} className="aspect-video rounded-lg overflow-hidden">
                              <iframe
                                src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                                title="Deployment video"
                                className="w-full h-full"
                                allowFullScreen
                              />
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* CTA */}
      <section className="bg-brand-700 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow text-brand-200 mb-3">Government Procurement</p>
          <h2 className="text-2xl md:text-3xl font-700 text-white mb-3">
            Need fogging machines for your institution?
          </h2>
          <p className="text-brand-100 mb-7 max-w-xl mx-auto">
            Government bodies, municipalities, health departments, and agricultural organizations can procure directly via GeM or contact us for a customised quote.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 px-7 py-3 bg-white text-brand-700 font-700 rounded-full hover:bg-brand-50 transition-all text-sm shadow-lg"
            >
              Request a Quote
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-7 py-3 border-2 border-white/40 text-white font-600 rounded-full hover:border-white hover:bg-white/10 transition-all text-sm"
            >
              View Products
            </Link>
          </div>
        </div>
      </section>

      {/* Internal links */}
      <section className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 text-center">Related Pages</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { href: "/case-studies", label: "Case Studies" },
              { href: "/past-performance-government", label: "Government Track Record" },
              { href: "/fogging-machine-government-procurement", label: "Procurement Guide" },
              { href: "/gem-approved-fogging-machine-oem", label: "Dealer Partnership" },
              { href: "/products", label: "All Products" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="px-4 py-2 border border-gray-200 rounded-full text-gray-600 hover:border-brand-400 hover:text-brand-700 text-xs font-medium transition-all">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
