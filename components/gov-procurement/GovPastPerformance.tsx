"use client"

import Image from "next/image"

interface Props {
  customerLogos: string[]
}

// Real org_type values from fogging_buyers collection in DB
const BUYER_CATEGORIES = [
  {
    label: "State Local Bodies",
    examples: "Municipal Corporations, Nagar Nigams, Nagar Panchayats",
    products: "Thermal & vehicle-mounted foggers, double-barrel foggers",
    use: "Ward-level mosquito control, dengue/malaria prevention drives",
    icon: "🏙",
  },
  {
    label: "State Government",
    examples: "Health Departments, NHM, NVBDCP district offices",
    products: "Portable & vehicle-mounted thermal foggers",
    use: "District outbreak response, NVBDCP programme deployments",
    icon: "🏥",
  },
  {
    label: "Central Government",
    examples: "Cantonment Boards, Central agencies, PSUs",
    products: "IS 14855-compliant portable & vehicle-mounted foggers",
    use: "Campus sanitation, residential vector control",
    icon: "🛡",
  },
]

const METRICS = [
  { value: "12+", label: "Years Manufacturing", sub: "Since 2014" },
  { value: "15+", label: "States", sub: "Government supply" },
  { value: "50+", label: "Active Dealers", sub: "Pan-India network" },
  { value: "5–10", label: "Day Dispatch", sub: "From Gurugram factory" },
  { value: "8+", label: "GeM Models", sub: "Listed on gem.gov.in" },
  { value: "10", label: "Tender Docs", sub: "Ready on request" },
]

export default function GovPastPerformance({ customerLogos }: Props) {
  const activeLogos = customerLogos.filter(Boolean)

  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-gray-800 mb-1">
        Trusted by Government &amp; Public Health Institutions
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Supplying municipal corporations, health departments, and cantonment boards across India
        with IS 14855-compliant fogging equipment.
      </p>

      {/* LAYER 1 — Customer Logo Wall */}
      {activeLogos.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Our Clients</p>
          <div className="flex flex-wrap items-center gap-4 p-5 bg-gray-50 border border-gray-200 rounded-xl">
            {activeLogos.map((url, i) => (
              <div
                key={i}
                className="group relative w-20 h-12 flex-shrink-0 flex items-center justify-center"
              >
                <Image
                  src={url}
                  alt="Government client"
                  fill
                  className="object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  sizes="80px"
                  unoptimized
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Client logos are displayed with permission. Contact us for formal reference letters.
          </p>
        </div>
      )}

      {/* LAYER 2 — Past Performance Snapshot */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Past Performance Snapshot
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Verified case: Nagar Nigam Muzaffarpur */}
          <div className="border border-brand-200 bg-brand-50 rounded-xl p-4 sm:col-span-2">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-xs font-bold text-gray-800">Nagar Nigam Muzaffarpur</p>
                <p className="text-[11px] text-gray-500">Bihar &middot; Municipal Corporation</p>
              </div>
              <span className="flex-shrink-0 text-[10px] font-600 text-brand-700 bg-brand-100 border border-brand-200 px-2 py-0.5 rounded-full">
                ★ Verified
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Product</p>
                <p className="text-xs text-gray-700">100XDB600 Double Barrel Fogger</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Programme</p>
                <p className="text-xs text-gray-700">Swachh Bharat Mission</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Department</p>
                <p className="text-xs text-gray-700">Swachh Bharat / Health</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Use Case</p>
                <p className="text-xs text-gray-700">City-wide mosquito control, 49 wards</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Vehicle-mounted double-barrel configuration covering all 49 municipal wards. Media-covered
              inauguration. Full IS 14855 compliance. Procured via GeM.
            </p>
          </div>

          {/* Buyer category cards — real org_types from DB, not specific fabricated customers */}
          {BUYER_CATEGORIES.map(cat => (
            <div key={cat.label} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg flex-shrink-0">{cat.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{cat.label}</p>
                  <p className="text-[11px] text-gray-500">{cat.examples}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-600">
                  <span className="font-medium">Products:</span> {cat.products}
                </p>
                <p className="text-[11px] text-gray-600">
                  <span className="font-medium">Use:</span> {cat.use}
                </p>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic">
                Reference details available on request.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* LAYER 3 — Procurement Confidence Metrics */}
      <div className="bg-brand-700 rounded-xl p-5">
        <p className="text-xs font-semibold text-brand-200 uppercase tracking-wide mb-4">
          Procurement Confidence Metrics
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {METRICS.map(m => (
            <div key={m.label} className="text-center">
              <p className="text-2xl font-bold text-white">{m.value}</p>
              <p className="text-[11px] font-medium text-brand-200 mt-0.5">{m.label}</p>
              <p className="text-[10px] text-brand-300">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
