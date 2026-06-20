import { BUSINESS } from "@/lib/seo/site-config"

const DOCUMENTS = [
  {
    title: "OEM Authorization Letter",
    desc: "Company letterhead authorization naming the dealer/bidder as authorized reseller for specific tender.",
    tag: "On Request",
    color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    tagColor: "bg-emerald-500/20 text-emerald-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="16 13 12 17 8 13" />
      </svg>
    ),
  },
  {
    title: "Technical Datasheet",
    desc: "Full product specification sheet with capacity, pressure, spray range, weight, and compliance details.",
    tag: "Instant",
    color: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    tagColor: "bg-blue-500/20 text-blue-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    title: "IS 14855 Compliance Certificate",
    desc: "Bureau of Indian Standards IS 14855 (Part 1) certification for thermal fogging machines.",
    tag: "On Request",
    color: "border-violet-500/20 bg-violet-500/5 text-violet-400",
    tagColor: "bg-violet-500/20 text-violet-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    title: "ISO 9001:2015 Certificate",
    desc: "Quality Management System certification for 100X Circle manufacturing operations.",
    tag: "On Request",
    color: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    tagColor: "bg-amber-500/20 text-amber-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    title: "MSME / UDYAM Certificate",
    desc: "Ministry of MSME Udyam registration certificate confirming MSME status and registered address.",
    tag: "On Request",
    color: "border-orange-500/20 bg-orange-500/5 text-orange-400",
    tagColor: "bg-orange-500/20 text-orange-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "GeM Seller Registration",
    desc: "GeM seller verification extract and product listing URLs confirming GeM OEM enrollment.",
    tag: "On Request",
    color: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    tagColor: "bg-cyan-500/20 text-cyan-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Warranty Certificate Template",
    desc: "Manufacturer warranty certificate template for submission with tender bid, specifying coverage and service terms.",
    tag: "On Request",
    color: "border-rose-500/20 bg-rose-500/5 text-rose-400",
    tagColor: "bg-rose-500/20 text-rose-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z" />
      </svg>
    ),
  },
  {
    title: "Test / Inspection Reports",
    desc: "Factory acceptance test reports and quality inspection certificates for specific product batches.",
    tag: "On Request",
    color: "border-lime-500/20 bg-lime-500/5 text-lime-400",
    tagColor: "bg-lime-500/20 text-lime-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
]

const WA = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100X Circle, I need tender documentation for a government bid. Please share the document pack."
)}`

export default function TenderDocSupport() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Document Support</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Tender Participation Support
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              All documents required for government tender submissions provided free of cost within 24 hours.
              No registration required — just share your tender requirements.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
              Request Documents
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOCUMENTS.map((doc) => (
            <div
              key={doc.title}
              className={`group p-5 rounded-2xl border ${doc.color} hover:bg-white/[0.03] transition-all duration-300`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${doc.color}`}>
                  {doc.icon}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${doc.tagColor} border border-current/30 shrink-0`}>
                  {doc.tag}
                </span>
              </div>
              <h3 className="text-white font-bold text-sm mb-2">{doc.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{doc.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-white font-bold mb-1">Complete Tender Documentation Pack</p>
            <p className="text-slate-400 text-sm">All 8 documents prepared and delivered to your email within 24 hours — at no charge.</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors">
              WhatsApp Request
            </a>
            <a href={`mailto:${BUSINESS.email}?subject=Tender Documentation Request`}
              className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-colors">
              Email Request
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
