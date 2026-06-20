"use client"

import Image from "next/image"
import Link from "next/link"

export interface DeploymentRecord {
  _id?: string
  location?: string
  department?: string
  product?: string
  images?: string[]
  videos?: string[]
  description?: string
}

interface Props {
  deployments: DeploymentRecord[]
  heading?: string
  maxVisible?: number
  showViewAll?: boolean
  darkBg?: boolean
}

function DeploymentCard({ d, darkBg }: { d: DeploymentRecord; darkBg: boolean }) {
  const img = d.images?.[0]
  return (
    <div className={`group rounded-2xl overflow-hidden border transition-all ${
      darkBg
        ? "bg-white/[0.04] border-white/[0.08] hover:border-brand-500/40 hover:bg-white/[0.07]"
        : "bg-white border-gray-200 hover:border-brand-300 hover:shadow-md"
    }`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-900">
        {img ? (
          <Image
            src={img}
            alt={d.location || "Deployment"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <svg className="w-12 h-12 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
        {d.department && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-brand-600/90 backdrop-blur-sm text-xs font-semibold text-white rounded-full">
            {d.department}
          </span>
        )}
        {d.videos && d.videos.length > 0 && (
          <span className="absolute top-3 right-3 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-800 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </span>
        )}
      </div>
      <div className="p-4">
        {d.location && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg className={`w-3 h-3 shrink-0 ${darkBg ? "text-gray-500" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <p className={`text-xs font-700 ${darkBg ? "text-gray-300" : "text-gray-700"}`}>{d.location}</p>
          </div>
        )}
        {d.product && (
          <p className="text-[11px] text-brand-500 font-600 mb-1.5">{d.product}</p>
        )}
        {d.description && (
          <p className={`text-xs leading-relaxed line-clamp-2 ${darkBg ? "text-gray-500" : "text-gray-500"}`}>{d.description}</p>
        )}
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <Link href="/deployments" className={`inline-flex items-center gap-1.5 text-xs font-600 transition-colors ${
            darkBg ? "text-brand-400 hover:text-brand-300" : "text-brand-600 hover:text-brand-800"
          }`}>
            View Details
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M1.5 5h7M5 1.5l3.5 3.5L5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function FeaturedDeployments({
  deployments,
  heading = "Real World Deployments",
  maxVisible = 4,
  showViewAll = true,
  darkBg = false,
}: Props) {
  const visible = deployments.slice(0, maxVisible)

  if (visible.length === 0) return null

  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className={`text-xs font-700 uppercase tracking-widest mb-1.5 ${darkBg ? "text-brand-400" : "text-brand-600"}`}>
            From the Field
          </p>
          <h2 className={`text-2xl font-bold ${darkBg ? "text-white" : "text-gray-900"}`}>{heading}</h2>
          <p className={`text-sm mt-1 ${darkBg ? "text-gray-500" : "text-gray-500"}`}>
            Visual proof — real installations and field operations.
          </p>
        </div>
        {showViewAll && (
          <Link href="/deployments"
            className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-600 transition-colors ${
              darkBg ? "text-brand-400 hover:text-brand-300" : "text-brand-600 hover:text-brand-700"
            }`}>
            View all deployments
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((d, i) => (
          <DeploymentCard key={d._id || i} d={d} darkBg={darkBg} />
        ))}
      </div>
    </section>
  )
}
