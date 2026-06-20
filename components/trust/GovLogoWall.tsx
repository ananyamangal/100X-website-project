"use client"

import Image from "next/image"
import Link from "next/link"

export interface GovLogo {
  _id?: string
  name: string
  logo: string
  category: string
  state?: string
  caseStudyLink?: string
  isActive?: boolean
  order?: number
}

interface Props {
  logos: GovLogo[]
}

const PLACEHOLDER_LOGOS: GovLogo[] = [
  { name: "Municipal Corporation", logo: "", category: "Municipal Bodies", state: "Haryana" },
  { name: "Nagar Nigam Muzaffarpur", logo: "", category: "Municipal Bodies", state: "Bihar" },
  { name: "State Health Department", logo: "", category: "Health Departments", state: "Uttar Pradesh" },
  { name: "Nagar Panchayat", logo: "", category: "Municipal Bodies", state: "Rajasthan" },
  { name: "Cantonment Board", logo: "", category: "Defence", state: "Delhi" },
  { name: "District Health Office", logo: "", category: "Health Departments", state: "Punjab" },
]

function InitialAvatar({ name, category }: { name: string; category: string }) {
  const initial = name.trim()[0]?.toUpperCase() || "G"
  const colors: Record<string, string> = {
    "Municipal Bodies": "from-blue-600 to-blue-800",
    "Health Departments": "from-green-600 to-green-800",
    "Defence": "from-slate-600 to-slate-800",
    "Railways": "from-orange-600 to-orange-800",
    "Agriculture": "from-emerald-600 to-emerald-800",
    "Other": "from-purple-600 to-purple-800",
  }
  const gradient = colors[category] || "from-gray-600 to-gray-800"
  return (
    <div className={`w-full h-full rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-white font-bold text-lg">{initial}</span>
    </div>
  )
}

export default function GovLogoWall({ logos }: Props) {
  const active = logos.filter((l) => l.isActive !== false && l.logo)
  const display = active.length > 0 ? active : PLACEHOLDER_LOGOS

  return (
    <section className="py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Track Record</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Trusted by Government Departments, Municipal Bodies &amp; Public Institutions
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
            100X Circle products have been supplied through GeM, tenders, dealer networks and institutional
            procurement channels across India.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {display.map((logo, i) => {
            const card = (
              <div
                className="group relative bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-brand-300 hover:bg-brand-50 hover:shadow-md transition-all duration-200 cursor-default"
                style={{ minHeight: 100 }}
              >
                <div className="w-16 h-12 relative flex items-center justify-center">
                  {logo.logo ? (
                    <Image
                      src={logo.logo}
                      alt={logo.name}
                      fill
                      className="object-contain grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all duration-300"
                      sizes="64px"
                      unoptimized
                    />
                  ) : (
                    <InitialAvatar name={logo.name} category={logo.category} />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-700 leading-tight line-clamp-2">{logo.name}</p>
                  {logo.state && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{logo.state}</p>
                  )}
                </div>
                {logo.caseStudyLink && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4h6M4 1l3 3-3 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
            )
            return logo.caseStudyLink ? (
              <Link key={i} href={logo.caseStudyLink}>
                {card}
              </Link>
            ) : (
              <div key={i}>{card}</div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Supplied via GeM direct purchase, open tenders, and dealer procurement channels across India.{" "}
          <Link href="/past-performance-government" className="text-brand-600 hover:underline">
            View full past performance →
          </Link>
        </p>
      </div>
    </section>
  )
}
