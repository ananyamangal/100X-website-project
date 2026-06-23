"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

interface Study {
  _id: string
  title: string
  slug?: string
  customer?: string
  department?: string
  state?: string
  industry?: string
  problem?: string
  results?: string
  images?: string[]
  published?: boolean
}

function StudyCard({ s }: { s: Study }) {
  const href = s.slug ? `/case-studies/${s.slug}` : "/case-studies"
  const img = s.images?.[0]

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-brand-200 transition-all group flex flex-col">
      {/* Image area */}
      <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {img ? (
          <Image src={img} alt={s.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M6 21V10.85M18 21V10.85M3 7l9-4 9 4" />
            </svg>
          </div>
        )}
        {s.state && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 rounded-full">{s.state}</span>
        )}
        {s.department && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-brand-600/90 text-xs font-semibold text-white rounded-full">{s.department}</span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {s.industry && (
          <p className="text-[10px] font-700 text-brand-600 uppercase tracking-widest mb-1.5">{s.industry}</p>
        )}
        <h3 className="font-700 text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-brand-700 transition-colors">
          {s.customer || s.title}
        </h3>
        {s.problem && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{s.problem}</p>
        )}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-600 text-brand-600 hover:text-brand-800 transition-colors">
            Read Deployment Story
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function HomeCaseStudiesSection({ initialData }: { initialData?: Study[] } = {}) {
  const [studies, setStudies] = useState<Study[]>(initialData?.slice(0, 6) ?? [])
  const [loaded, setLoaded] = useState(!!initialData)

  useEffect(() => {
    if (initialData && initialData.length > 0) return
    fetch("/api/case-studies")
      .then((r) => r.json())
      .then((data: Study[]) => {
        const visible = Array.isArray(data) ? data.slice(0, 6) : []
        setStudies(visible)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [initialData])

  if (!loaded || studies.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-700 text-brand-600 uppercase tracking-widest mb-2">Government Deployments</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Government Success Stories</h2>
            <p className="text-gray-500 text-sm max-w-lg">
              Real fogging machine deployments with Indian government organizations and public institutions.
            </p>
          </div>
          <Link
            href="/case-studies"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-600 text-brand-600 hover:text-brand-700 transition-colors"
          >
            View all case studies
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {studies.map((s, i) => (
            <StudyCard key={s._id || i} s={s} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/past-performance-government"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-full text-sm hover:bg-gray-100 transition-colors"
          >
            View Full Past Performance Record
          </Link>
        </div>
      </div>
    </section>
  )
}
