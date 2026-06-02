'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, Building2 } from 'lucide-react'
import ScrollReveal from '@/components/cinematic/ScrollReveal'

interface Props {
  productId: string
  productName: string
}

export default function RealWorldDeployments({ productId, productName }: Props) {
  const [studies, setStudies] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/case-studies/by-product?productId=${productId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setStudies(data); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [productId])

  if (!loaded || studies.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal animation="fade-up" className="mb-10">
          <p className="eyebrow text-brand-600 mb-3">Real World Deployments</p>
          <h2 className="text-display-xs text-gray-900 text-balance">
            {productName} — deployed in the field.
          </h2>
          <p className="text-gray-500 text-sm mt-2">Verified supply history with results from real government and institutional buyers.</p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {studies.map((cs, i) => (
            <ScrollReveal key={cs._id} animation="fade-up" delay={i * 60}>
              <Link
                href={`/case-studies/${cs.slug}`}
                className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-300"
              >
                {cs.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cs.images[0]}
                    alt={cs.title}
                    className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-brand-900 to-cinema-800 flex items-center justify-center">
                    <Building2 size={36} className="text-brand-400/50" />
                  </div>
                )}
                <div className="p-5">
                  {(cs.industry || cs.state) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {cs.industry && <span className="text-[10px] font-600 uppercase tracking-wide bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full">{cs.industry}</span>}
                      {cs.state && <span className="text-[10px] font-600 uppercase tracking-wide bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{cs.state}</span>}
                    </div>
                  )}
                  <h3 className="font-700 text-gray-900 text-sm leading-snug mb-2 group-hover:text-brand-700 transition-colors line-clamp-2">
                    {cs.title}
                  </h3>
                  {cs.customer && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                      <MapPin size={11} className="shrink-0" />
                      {cs.customer}{cs.city ? ` · ${cs.city}` : ""}
                    </p>
                  )}
                  {cs.results && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{cs.results}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-brand-600 text-xs font-600 group-hover:gap-2 transition-all">
                    Read case study <ArrowRight size={11} />
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
