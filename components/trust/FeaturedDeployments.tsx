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
        : "bg-white border-gray-200 hover:border-brand-300 hover:shadow-lg"
    }`}>
      {/* Large image — primary visual element */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-900">
        {img ? (
          <Image
            src={img}
            alt={d.department || d.location || "Deployment"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <svg className="w-14 h-14 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
        {/* Organization overlay — top-left */}
        {d.department && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent px-4 pt-3 pb-6">
            <span className="inline-block px-2.5 py-1 bg-brand-600/90 backdrop-blur-sm text-xs font-700 text-white rounded-full">
              {d.department}
            </span>
          </div>
        )}
        {/* Video badge */}
        {d.videos && d.videos.length > 0 && (
          <span className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
            <svg className="w-3.5 h-3.5 text-gray-800 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </span>
        )}
        {/* Location badge — bottom-left */}
        {d.location && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-6">
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-xs font-700 text-white">{d.location}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {d.product && (
          <p className="text-[11px] font-700 text-brand-500 uppercase tracking-wide mb-1.5">{d.product}</p>
        )}
        {d.description && (
          <p className={`text-xs leading-relaxed line-clamp-2 ${darkBg ? "text-gray-400" : "text-gray-500"}`}>{d.description}</p>
        )}
        <div className={`mt-3 pt-3 border-t ${darkBg ? "border-white/[0.06]" : "border-gray-100"}`}>
          <Link href="/deployments" className={`inline-flex items-center gap-1.5 text-xs font-600 transition-colors ${
            darkBg ? "text-brand-400 hover:text-brand-300" : "text-brand-600 hover:text-brand-800"
          }`}>
            View Deployment Gallery
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
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className={`text-xs font-700 uppercase tracking-widest mb-2 ${darkBg ? "text-brand-400" : "text-brand-600"}`}>
            From the Field
          </p>
          <h2 className={`text-2xl md:text-3xl font-bold ${darkBg ? "text-white" : "text-gray-900"}`}>{heading}</h2>
          <p className={`text-sm mt-1.5 ${darkBg ? "text-gray-500" : "text-gray-500"}`}>
            Visual proof — real installations across India showing Customer · Location · Product.
          </p>
        </div>
        {showViewAll && (
          <Link href="/deployments"
            className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-600 transition-colors ${
              darkBg ? "text-brand-400 hover:text-brand-300" : "text-brand-600 hover:text-brand-700"
            }`}>
            View all
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((d, i) => (
          <DeploymentCard key={d._id || i} d={d} darkBg={darkBg} />
        ))}
      </div>
    </section>
  )
}
