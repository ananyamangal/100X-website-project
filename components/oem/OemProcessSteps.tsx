const STEPS = [
  {
    n: 1,
    title: "Share Tender Details",
    desc: "Fill the authorization request form with your company details, GeM Seller ID (if any), and tender name / closing date.",
    timeline: "2 minutes",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    n: 2,
    title: "Technical Eligibility Review",
    desc: "Our team reviews your tender specifications against our IS 14855-compliant product range and confirms eligibility within 4 hours.",
    timeline: "Within 4 hours",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><polyline points="9 11 11 13 15 9" />
      </svg>
    ),
  },
  {
    n: 3,
    title: "Authorization Approval",
    desc: "We prepare OEM Authorization Letter on company letterhead with product specifications, compliance certificates, and your company details.",
    timeline: "Same business day",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    n: 4,
    title: "Receive Authorization Letter",
    desc: "OEM Authorization Letter, technical datasheets, compliance certificates, and tender support documents delivered to your email.",
    timeline: "PDF within 24 hours",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.22 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
]

export default function OemProcessSteps() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Authorization Process</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            How to Get OEM Authorization
          </h2>
          <p className="text-slate-400 text-base">
            Simple 4-step process to receive your OEM Authorization Letter — no registration fees, no delays.
          </p>
        </div>

        <div className="relative">
          {/* Connector line — desktop */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" style={{ top: "2.75rem" }} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step) => (
              <div key={step.n} className="relative flex flex-col">
                {/* Step header */}
                <div className="flex lg:flex-col items-start lg:items-center gap-4 lg:gap-0 mb-5 lg:mb-6">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 lg:mx-auto">
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 border-2 border-slate-900 flex items-center justify-center text-white text-xs font-black">
                      {step.n}
                    </div>
                  </div>
                  <div className="lg:mt-5 lg:text-center">
                    <h3 className="text-white font-black text-base leading-snug">{step.title}</h3>
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {step.timeline}
                    </span>
                  </div>
                </div>

                <div className="lg:text-center lg:px-2">
                  <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom guarantee */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "No Registration Fee", icon: "✓" },
            { label: "No Hidden Charges", icon: "✓" },
            { label: "4-Hour Response Guarantee", icon: "✓" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-slate-800/60 border border-white/[0.06] rounded-xl px-5 py-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
                {item.icon}
              </div>
              <span className="text-white font-semibold text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
