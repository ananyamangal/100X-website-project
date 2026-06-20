const BENEFITS = [
  {
    title: "OEM Authorization Support",
    desc: "Official OEM Authorization Letter on company letterhead, valid for specific tenders or annual authorization.",
    color: "border-emerald-500/20 bg-emerald-500/5",
    accent: "text-emerald-400 bg-emerald-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="16 13 12 17 8 13" /><line x1="12" y1="17" x2="12" y2="7" />
      </svg>
    ),
  },
  {
    title: "Tender Documentation Pack",
    desc: "IS 14855 compliance certificate, ISO 9001:2015, MSME/UDYAM, test reports — complete documentation pack within 24 hours.",
    color: "border-blue-500/20 bg-blue-500/5",
    accent: "text-blue-400 bg-blue-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    title: "GeM Participation Support",
    desc: "Product listing assistance, catalog support, and technical specification upload guidance for GeM portal.",
    color: "border-violet-500/20 bg-violet-500/5",
    accent: "text-violet-400 bg-violet-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Competitive Dealer Pricing",
    desc: "Wholesale manufacturer pricing with margin for resellers. Volume-based discount slabs for regular dealers.",
    color: "border-amber-500/20 bg-amber-500/5",
    accent: "text-amber-400 bg-amber-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    title: "Fast Technical Responses",
    desc: "Dedicated technical support line for dealer queries. Pre-bid meeting clarification, BOQ preparation assistance.",
    color: "border-cyan-500/20 bg-cyan-500/5",
    accent: "text-cyan-400 bg-cyan-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Product & Technical Training",
    desc: "Product operation training, maintenance guidance, and technical certification for dealer field teams.",
    color: "border-lime-500/20 bg-lime-500/5",
    accent: "text-lime-400 bg-lime-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    title: "Marketing Support",
    desc: "Product brochures, technical datasheets, demo videos, and co-branded marketing material for dealer proposals.",
    color: "border-rose-500/20 bg-rose-500/5",
    accent: "text-rose-400 bg-rose-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    title: "Direct OEM Relationship",
    desc: "Work directly with the manufacturer. No intermediaries. Faster decisions, better support, and direct communication.",
    color: "border-orange-500/20 bg-orange-500/5",
    accent: "text-orange-400 bg-orange-500/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

export default function DealerBenefits() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="max-w-3xl mb-12">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Dealer Program</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Why Dealers Choose 100X Circle
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            We support dealers, resellers, and GeM partners with everything needed to win government tenders —
            from OEM authorization to technical documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className={`group p-5 rounded-2xl border ${b.color} hover:bg-white/[0.03] transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${b.accent} group-hover:scale-110 transition-transform duration-300`}>
                {b.icon}
              </div>
              <h3 className="text-white font-bold text-sm mb-2">{b.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
