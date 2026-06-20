"use client"

import Link from "next/link"

const BUYER_CATEGORIES = [
  {
    code: "MC",
    title: "Municipal Corporations",
    subtitle: "Nagar Nigams & Nagar Palikas",
    desc: "Vector control, dengue & malaria prevention, seasonal fogging operations across wards.",
    route: "GeM direct purchase or open tender",
    count: "Largest buyer segment",
    color: "border-blue-500/20 hover:border-blue-500/60",
    accent: "bg-blue-500/10 text-blue-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M6 21V10.85M18 21V10.85M3 7l9-4 9 4" />
      </svg>
    ),
  },
  {
    code: "HD",
    title: "Health Departments",
    subtitle: "State & District Health Offices",
    desc: "NVBDCP programs, vector-borne disease control, emergency health deployments.",
    route: "GeM direct purchase or district tender",
    count: "NVBDCP funded",
    color: "border-emerald-500/20 hover:border-emerald-500/60",
    accent: "bg-emerald-500/10 text-emerald-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    code: "SC",
    title: "Smart City Missions",
    subtitle: "AMRUT & Smart City Projects",
    desc: "Urban sanitation programmes, smart city implementation, outbreak response.",
    route: "Project-based procurement",
    count: "100 Smart Cities",
    color: "border-violet-500/20 hover:border-violet-500/60",
    accent: "bg-violet-500/10 text-violet-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    code: "VCP",
    title: "Vector Control Programs",
    subtitle: "NHM & NVBDCP Programmes",
    desc: "National Health Mission vector control operations at district and block level.",
    route: "Centrally sponsored scheme procurement",
    count: "National coverage",
    color: "border-cyan-500/20 hover:border-cyan-500/60",
    accent: "bg-cyan-500/10 text-cyan-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    code: "RW",
    title: "Railways & PSUs",
    subtitle: "Indian Railways & Public Sector Units",
    desc: "Station premises, colony maintenance, yard and workshop sanitation fogging.",
    route: "Rate contract or DGS&D route",
    count: "17 Railway zones",
    color: "border-orange-500/20 hover:border-orange-500/60",
    accent: "bg-orange-500/10 text-orange-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="13" rx="2" /><path d="M4 13h16M7 21h10M9 21V16M15 21V16M7 8h4M13 8h4" />
      </svg>
    ),
  },
  {
    code: "DF",
    title: "Defence & Cantonments",
    subtitle: "Army, Navy, Air Force & Cantonment Boards",
    desc: "Cantonment area fogging, military station sanitation, defence colony vector control.",
    route: "Direct inquiry, rate contract",
    count: "62 Cantonment Boards",
    color: "border-slate-500/20 hover:border-slate-500/60",
    accent: "bg-slate-500/10 text-slate-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    code: "AP",
    title: "Airports & AAI",
    subtitle: "Airport Authority of India",
    desc: "Apron, terminal, and perimeter fogging for bird hazard and pest control.",
    route: "AAI tender or direct procurement",
    count: "137 AAI airports",
    color: "border-sky-500/20 hover:border-sky-500/60",
    accent: "bg-sky-500/10 text-sky-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5c-1.5-1.5-3.5-1.5-5 0L11 6 2.8 4.2 1.4 5.6l7 3.5-2.3 2.3-3-.3-1.4 1.4 3 2 2 3 1.4-1.4-.3-3 2.3-2.3 3.5 7 1.4-1.4z" />
      </svg>
    ),
  },
  {
    code: "UNI",
    title: "Universities & Institutions",
    subtitle: "Central & State Universities, IITs, NITs",
    desc: "Campus sanitation, hostel area fogging, seasonal mosquito control operations.",
    route: "GeM or institutional procurement",
    count: "1,100+ universities",
    color: "border-indigo-500/20 hover:border-indigo-500/60",
    accent: "bg-indigo-500/10 text-indigo-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    code: "GP",
    title: "Gram Panchayats",
    subtitle: "Panchayati Raj Institutions",
    desc: "Rural vector control, MGNREGS-funded sanitation operations, seasonal outbreaks.",
    route: "Direct purchase below GeM threshold",
    count: "250,000+ GPs",
    color: "border-lime-500/20 hover:border-lime-500/60",
    accent: "bg-lime-500/10 text-lime-400",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
]

export default function WhoProcturesFrom() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="max-w-3xl mb-12">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Buyer Segments</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Who Procures From 100X Circle
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Government departments, public institutions, and statutory bodies across India procure our fogging machines
            through GeM, tenders, and direct supply routes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUYER_CATEGORIES.map((cat) => (
            <div
              key={cat.code}
              className={`group relative bg-slate-900 border ${cat.color} rounded-2xl p-6 transition-all duration-300 hover:bg-slate-800/80`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${cat.accent} group-hover:scale-110 transition-transform duration-300`}>
                {cat.icon}
              </div>

              {/* Content */}
              <h3 className="text-white font-bold text-base mb-1">{cat.title}</h3>
              <p className="text-slate-500 text-xs mb-3">{cat.subtitle}</p>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{cat.desc}</p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span className="text-xs text-slate-500">{cat.route}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.accent} border border-current/30`}>
                  {cat.count}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-6 bg-slate-900 rounded-2xl border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-white font-semibold mb-1">Identify your procurement category?</p>
            <p className="text-slate-400 text-sm">Share your tender specification or GeM bid number. We'll provide L1 quotation and full OEM documentation within 24 hours.</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/fogging-machine-government-procurement"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Procurement Guide
            </Link>
            <Link
              href="/past-performance-government"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Past Performance
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
