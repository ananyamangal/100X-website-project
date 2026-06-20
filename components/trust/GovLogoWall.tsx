"use client"

import { useState } from "react"
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

const CATEGORIES = [
  "All",
  "Municipal Bodies",
  "Health Departments",
  "Defence",
  "Railways",
  "Agriculture",
  "Smart Cities",
  "Other",
]

const CAT_COLORS: Record<string, string> = {
  "Municipal Bodies":    "from-blue-900 to-blue-700",
  "Health Departments":  "from-emerald-900 to-emerald-700",
  "Defence":             "from-slate-800 to-slate-600",
  "Railways":            "from-orange-900 to-orange-700",
  "Agriculture":         "from-lime-900 to-lime-700",
  "Smart Cities":        "from-violet-900 to-violet-700",
  "Other":               "from-zinc-800 to-zinc-600",
}

const CAT_TEXT: Record<string, string> = {
  "Municipal Bodies":    "text-blue-300",
  "Health Departments":  "text-emerald-300",
  "Defence":             "text-slate-300",
  "Railways":            "text-orange-300",
  "Agriculture":         "text-lime-300",
  "Smart Cities":        "text-violet-300",
  "Other":               "text-zinc-300",
}

const PLACEHOLDER_LOGOS: GovLogo[] = [
  { name: "Nagar Nigam Muzaffarpur", logo: "", category: "Municipal Bodies", state: "Bihar" },
  { name: "Greater Hyderabad MC", logo: "", category: "Municipal Bodies", state: "Telangana" },
  { name: "Municipal Corporation Delhi", logo: "", category: "Municipal Bodies", state: "Delhi" },
  { name: "BBMP Bengaluru", logo: "", category: "Municipal Bodies", state: "Karnataka" },
  { name: "Nagar Palika Lucknow", logo: "", category: "Municipal Bodies", state: "Uttar Pradesh" },
  { name: "State Health Dept. UP", logo: "", category: "Health Departments", state: "Uttar Pradesh" },
  { name: "District Health Office Bihar", logo: "", category: "Health Departments", state: "Bihar" },
  { name: "NVBDCP Program Office", logo: "", category: "Health Departments", state: "Delhi" },
  { name: "Cantonment Board Delhi", logo: "", category: "Defence", state: "Delhi" },
  { name: "Indian Railways — NR", logo: "", category: "Railways", state: "Delhi" },
  { name: "Smart City Mission", logo: "", category: "Smart Cities", state: "Haryana" },
  { name: "Municipal Haryana", logo: "", category: "Municipal Bodies", state: "Haryana" },
]

function InitialAvatar({ name, category }: { name: string; category: string }) {
  const words = name.trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.trim().slice(0, 2).toUpperCase()
  const gradient = CAT_COLORS[category] || CAT_COLORS["Other"]
  return (
    <div className={`w-full h-full rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-white font-black text-base tracking-tight">{initials}</span>
    </div>
  )
}

export default function GovLogoWall({ logos }: Props) {
  const [activeTab, setActiveTab] = useState("All")

  const activeLogos = logos.filter((l) => l.isActive !== false)
  const display = activeLogos.length > 0 ? activeLogos : PLACEHOLDER_LOGOS

  const filtered = activeTab === "All" ? display : display.filter((l) => l.category === activeTab)

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "All" ? display.length : display.filter((l) => l.category === cat).length
    return acc
  }, {})

  const availableCats = ["All", ...CATEGORIES.slice(1).filter((c) => counts[c] > 0)]

  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Client Organisations</p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Trusted By Government Departments
              <br className="hidden md:block" /> Across India
            </h2>
            <p className="text-slate-400 mt-3 text-sm max-w-lg leading-relaxed">
              Municipal corporations, health departments, defence establishments, and public institutions
              have procured 100X Circle fogging machines through GeM, tenders, and direct supply.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-white font-black text-3xl">{display.length}+</p>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Clients</p>
            </div>
          </div>
        </div>

        {/* Category filter tabs */}
        {availableCats.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {availableCats.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  activeTab === cat
                    ? "bg-white text-slate-900 border-white"
                    : "bg-slate-900 text-slate-400 border-white/[0.08] hover:border-white/[0.20] hover:text-slate-200"
                }`}
              >
                {cat}
                {counts[cat] > 0 && (
                  <span className={`ml-1.5 ${activeTab === cat ? "text-slate-600" : "text-slate-600"}`}>
                    {counts[cat]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Logo grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((logo, i) => {
            const textColor = CAT_TEXT[logo.category] || "text-zinc-400"

            const card = (
              <div
                className="group relative bg-slate-900 border border-white/[0.06] hover:border-white/[0.20] rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-slate-800/60 transition-all duration-300 cursor-default"
                style={{ minHeight: 110 }}
              >
                {/* Logo or avatar */}
                <div className="w-14 h-10 relative flex items-center justify-center shrink-0">
                  {logo.logo ? (
                    <Image
                      src={logo.logo}
                      alt={logo.name}
                      fill
                      className="object-contain filter grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                      sizes="56px"
                      unoptimized
                    />
                  ) : (
                    <InitialAvatar name={logo.name} category={logo.category} />
                  )}
                </div>

                {/* Name */}
                <div className="text-center">
                  <p className="text-slate-200 text-[11px] font-semibold leading-tight line-clamp-2 group-hover:text-white transition-colors">
                    {logo.name}
                  </p>
                  {logo.state && (
                    <p className={`text-[10px] mt-1 font-medium ${textColor}`}>{logo.state}</p>
                  )}
                </div>

                {/* Case study link indicator */}
                {logo.caseStudyLink && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            )

            return logo.caseStudyLink ? (
              <Link key={i} href={logo.caseStudyLink} className="block">
                {card}
              </Link>
            ) : (
              <div key={i}>{card}</div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">
            Supplied via GeM direct purchase, open tenders, rate contracts, and dealer procurement networks.
          </p>
          <Link
            href="/past-performance-government"
            className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
          >
            View full procurement records
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
