import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import OemAuthForm from "@/components/oem/OemAuthForm"

export const revalidate = 60

export const metadata: Metadata = {
  title: "OEM Authorization Letter for Government Tenders — Free | 100X Circle",
  description:
    "Get OEM Authorization Letter from 100X Circle Pvt Ltd for government fogging machine tenders. IS 14855 certified, GeM OEM. Free tender documentation pack within 24 hours. Dealers, resellers, and GeM partners supported.",
  keywords: [
    "OEM authorization letter fogging machine",
    "OEM letter for government tender",
    "fogging machine tender authorization",
    "GeM OEM authorization letter India",
    "IS 14855 OEM authorization",
    "tender support fogging machine dealer",
  ],
  alternates: { canonical: `${SITE_URL}/oem-authorization-letter` },
  openGraph: {
    title: "OEM Authorization Letter for Government Tenders | 100X Circle",
    description: "Free OEM Authorization Letter for fogging machine tenders. IS 14855, GeM OEM, ISO 9001. 4-hour response.",
    url: `${SITE_URL}/oem-authorization-letter`,
  },
  robots: { index: true, follow: true },
}

const TRUST_ITEMS = [
  { label: "IS 14855 Certified", sub: "BIS Indian Standard" },
  { label: "GeM OEM Seller", sub: "gem.gov.in verified" },
  { label: "ISO 9001:2015", sub: "Quality Management" },
  { label: "MSME / UDYAM", sub: "Ministry of MSME, GoI" },
]

const STEPS = [
  { n: 1, label: "Submit Request", sub: "Fill form below — 2 minutes" },
  { n: 2, label: "Eligibility Review", sub: "Team reviews in 4 hours" },
  { n: 3, label: "Letter Prepared", sub: "Company letterhead, same day" },
  { n: 4, label: "PDF Delivered", sub: "To your email within 24 hours" },
]

const WA = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100X Circle, I need OEM Authorization Letter for a government tender. Please assist."
)}`

export default function OemAuthorizationLetterPage() {
  return (
    <main className="min-h-screen bg-slate-950 pt-16">
      {/* ── Hero ── */}
      <section className="bg-slate-950 py-14 md:py-20 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left — headline + trust */}
            <div>
              <div className="flex flex-wrap gap-2 mb-6">
                {["Free Authorization", "4-Hour Response", "GeM OEM", "IS 14855"].map((t) => (
                  <span key={t} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">{t}</span>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-black text-white leading-tight mb-5">
                Get OEM Authorization Letter for Government Tenders
              </h1>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-8">
                100X Circle Pvt Ltd issues OEM Authorization Letters to dealers, resellers, and GeM partners for government
                fogging machine tenders — on company letterhead, free of charge, within 24 hours.
              </p>

              {/* 4-step process — compact */}
              <div className="space-y-3 mb-8">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-black shrink-0">{s.n}</div>
                    <div>
                      <span className="text-white font-bold text-sm">{s.label}</span>
                      <span className="text-slate-500 text-sm"> — {s.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust certs */}
              <div className="grid grid-cols-2 gap-3">
                {TRUST_ITEMS.map((t) => (
                  <div key={t.label} className="flex items-center gap-3 bg-slate-900 border border-white/[0.06] rounded-xl p-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">{t.label}</p>
                      <p className="text-slate-500 text-[10px]">{t.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick contact */}
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={WA} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-xl text-sm transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  WhatsApp Now
                </a>
                <a href={`tel:${BUSINESS.phonePrimary}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.22 2 2 0 012 .01h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                  {BUSINESS.phonePrimary}
                </a>
              </div>
            </div>

            {/* Right — form */}
            <div id="oem-auth-form" className="bg-slate-900 border border-white/[0.08] rounded-2xl p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-black text-white mb-1">Request OEM Authorization Letter</h2>
                <p className="text-slate-400 text-sm">Fill the form — our team responds within 4 business hours.</p>
              </div>
              <OemAuthForm source="oem_authorization_letter_page" />
            </div>
          </div>
        </div>
      </section>

      {/* ── What's Included ── */}
      <section className="py-16 bg-slate-900 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">What's Included in the Authorization Pack</h2>
            <p className="text-slate-400 text-sm">All documents delivered to your email within 24 hours</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "OEM Authorization Letter", desc: "On company letterhead, naming your firm as authorized reseller for the specific tender." },
              { title: "IS 14855 Compliance Certificate", desc: "BIS Indian Standard certification for thermal fogging machines — mandatory for most government tenders." },
              { title: "ISO 9001:2015 Certificate", desc: "Quality Management System certification for 100X Circle manufacturing." },
              { title: "MSME / UDYAM Certificate", desc: "Ministry of MSME registration confirming our MSME status." },
              { title: "Technical Datasheet", desc: "Product specifications, capacity, spray range, pressure, and compliance details." },
              { title: "GeM Seller Extract", desc: "GeM OEM seller verification confirming our enrollment on gem.gov.in." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 bg-slate-800/60 border border-white/[0.06] rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{item.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Track Record ── */}
      <section className="py-12 bg-slate-950 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { n: "80+", label: "Government Departments Served" },
              { n: "15+", label: "States Covered" },
              { n: "500+", label: "Government Orders Fulfilled" },
              { n: "12+", label: "Years Manufacturing" },
            ].map((s) => (
              <div key={s.label} className="text-center p-5 bg-slate-900 border border-white/[0.06] rounded-xl">
                <p className="text-3xl font-black text-emerald-400 mb-1">{s.n}</p>
                <p className="text-slate-400 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-black text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Is there a fee for OEM Authorization?",
                a: "No. OEM Authorization Letters are provided free of charge to all dealers and resellers participating in government tenders. No registration, no annual fees.",
              },
              {
                q: "How long does it take to receive the letter?",
                a: "We confirm eligibility within 4 business hours and send the complete documentation pack (OEM letter + all certificates) within 24 hours of approval.",
              },
              {
                q: "Do I need a GeM Seller ID to get authorization?",
                a: "No. GeM Seller ID is optional. Authorization is available to any dealer or reseller participating in government tenders through any procurement route — GeM, open tender, limited tender, or direct procurement.",
              },
              {
                q: "Is the letter valid for multiple tenders?",
                a: "By default, authorization letters are issued per-tender. If you need an annual blanket authorization for multiple tenders, mention this in your request message and we will accommodate where possible.",
              },
              {
                q: "Which products are covered by the authorization?",
                a: "All 100X Circle thermal fogging machines are covered: Single Barrel, Double Barrel, Vehicle Mounted, Hand Carried, and ULV Cold Fogging models — all IS 14855-compliant.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-slate-800/60 border border-white/[0.06] rounded-xl p-5">
                <p className="text-white font-bold text-sm mb-2">{faq.q}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-14 bg-slate-950 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">Ready to Request Authorization?</h2>
          <p className="text-slate-400 text-sm mb-6">Submit the form above or contact us directly on WhatsApp.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="#oem-auth-form"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-colors">
              Submit Request Form
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
              WhatsApp Now
            </a>
          </div>
          <p className="mt-6 text-slate-600 text-xs">
            Looking for more? View{" "}
            <Link href="/gem-approved-fogging-machine-oem" className="text-slate-400 hover:text-white underline">GeM OEM page</Link>
            {" "}or{" "}
            <Link href="/past-performance-government" className="text-slate-400 hover:text-white underline">Past Performance</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
