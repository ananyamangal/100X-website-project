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
    return await db.collection("deployments").find({}).sort({ createdAt: -1 }).toArray()
  } catch {
    return []
  }
}

export default async function DeploymentsPage() {
  const deployments = await getDeployments()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-green-300 text-sm font-medium uppercase tracking-wider mb-3">Deployments</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Field Deployments Across India
          </h1>
          <p className="text-green-100 text-lg max-w-2xl">
            Government health departments, municipalities, and institutions trust 100x Circle
            thermal fogging machines for vector control and public health programs.
          </p>
        </div>
      </div>

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
            <Link href="/contact-us" className="mt-6 inline-block bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors">
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
                      <span className="text-xs bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
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

      {/* CTA */}
      <div className="bg-white border-t border-gray-100 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Need thermal fogging for your institution?
          </h2>
          <p className="text-gray-600 mb-6">
            Government bodies, municipalities, health departments, and agricultural organizations
            can procure directly via GeM or contact us for a quote.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/contact-us"
              className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Request a Quote
            </Link>
            <Link
              href="/products"
              className="border border-green-600 text-green-700 px-8 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors"
            >
              View Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
