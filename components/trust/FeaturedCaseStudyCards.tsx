"use client"

import Image from "next/image"
import Link from "next/link"

export interface CaseStudyCard {
  _id?: string
  slug?: string
  title: string
  customer?: string
  department?: string
  state?: string
  industry?: string
  problem?: string
  solution?: string
  results?: string
  images?: string[]
  published?: boolean
}

interface Props {
  studies: CaseStudyCard[]
  heading?: string
  maxVisible?: number
  showViewAll?: boolean
}

const FALLBACK_IMAGE = "/images/case-study-default.jpg"

function StudyCard({ study }: { study: CaseStudyCard }) {
  const href = study.slug ? `/case-studies/${study.slug}` : "/case-studies"
  const img = study.images?.[0]

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-brand-300 transition-all duration-200 group flex flex-col">
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {img ? (
          <Image
            src={img}
            alt={study.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl">🏛</div>
          </div>
        )}
        {study.state && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 rounded-full">
            {study.state}
          </span>
        )}
        {study.department && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-brand-600/90 backdrop-blur-sm text-xs font-semibold text-white rounded-full">
            {study.department}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-brand-700 transition-colors">
          {study.title}
        </h3>

        {study.problem && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Challenge</p>
            <p className="text-xs text-gray-600 line-clamp-2">{study.problem}</p>
          </div>
        )}

        {study.results && (
          <div className="mb-4">
            <p className="text-[11px] font-600 text-brand-600 uppercase tracking-wide mb-1">Results</p>
            <p className="text-xs text-gray-700 line-clamp-2">{study.results}</p>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100">
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
          >
            Read Full Case Study
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function FeaturedCaseStudyCards({ studies, heading = "Deployment Success Stories", maxVisible = 3, showViewAll = true }: Props) {
  const visible = studies.slice(0, maxVisible)

  if (visible.length === 0) return null

  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-1">Proven Results</p>
          <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
        </div>
        {showViewAll && studies.length > maxVisible && (
          <Link
            href="/case-studies"
            className="text-sm text-brand-600 font-semibold hover:underline shrink-0"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((s, i) => (
          <StudyCard key={s._id || i} study={s} />
        ))}
      </div>
    </section>
  )
}
