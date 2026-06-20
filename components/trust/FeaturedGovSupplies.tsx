import Link from "next/link"

export interface SupplyRecord {
  _id?: string
  organization?: string
  department?: string
  state?: string
  product?: string
  category?: string
  status?: string
  orderYear?: number
  quantity?: number
  verified?: boolean
}

interface Props {
  records: SupplyRecord[]
  maxVisible?: number
  showViewAll?: boolean
  heading?: string
  subheading?: string
}

const DEMO_RECORDS: SupplyRecord[] = [
  { organization: "Municipal Corporation", department: "Mosquito Control", product: "Thermal Fogging Machines", category: "Municipal", state: "Punjab", status: "Completed", verified: false },
  { organization: "Health Department", department: "Vector Control Division", product: "Vector Control Equipment", category: "Health", state: "Haryana", status: "Completed", verified: false },
  { organization: "Municipal Council", department: "Sanitation Department", product: "Fogging Machines", category: "Municipal", state: "Uttar Pradesh", status: "Completed", verified: false },
  { organization: "Nagar Nigam Muzaffarpur", department: "Swachh Bharat Unit", product: "Double Barrel Thermal Fogger", category: "Municipal", state: "Bihar", status: "Completed", verified: true },
  { organization: "Municipal Corporation", department: "Public Health", product: "Vehicle-Mounted Fogging System", category: "Municipal", state: "Maharashtra", status: "Completed", verified: false },
  { organization: "State Health Department", department: "Disease Control", product: "Thermal Fogging System", category: "Health", state: "Delhi", status: "Completed", verified: false },
]

const CAT_ICONS: Record<string, React.ReactNode> = {
  Municipal: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M6 21V10.85M18 21V10.85M3 7l9-4 9 4" />
    </svg>
  ),
  Health: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Defence: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z" />
    </svg>
  ),
  Other: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
    </svg>
  ),
}

const CAT_BG: Record<string, string> = {
  Municipal: "bg-blue-500/15 text-blue-300",
  Health: "bg-brand-500/15 text-brand-300",
  Defence: "bg-gray-500/15 text-gray-300",
  Other: "bg-gray-500/10 text-gray-400",
}

function SupplyCard({ r, demo }: { r: SupplyRecord; demo: boolean }) {
  const catBg = CAT_BG[r.category || "Other"] || CAT_BG.Other
  const icon = CAT_ICONS[r.category || "Other"] || CAT_ICONS.Other
  const name = r.organization || r.department || "Government Organisation"

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100/80 hover:border-brand-200 transition-all group">
      {/* Top row: category + verified + state */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-700 ${catBg} bg-opacity-60`}
          style={{ background: "rgba(255,255,255,0.0)" }}>
          <span className="opacity-70">{icon}</span>
          {r.category || "Government"}
        </div>
        <div className="flex items-center gap-1.5">
          {r.verified && (
            <span className="text-[9px] font-700 uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              ★ Verified
            </span>
          )}
          {demo && !r.verified && (
            <span className="text-[9px] font-600 text-gray-300 uppercase tracking-widest">Representative</span>
          )}
        </div>
      </div>

      {/* Organization name */}
      <h3 className="font-700 text-gray-900 text-sm leading-snug mb-1 group-hover:text-brand-700 transition-colors">
        {name}
      </h3>

      {/* Department (if different from org) */}
      {r.department && r.organization && r.department !== r.organization && (
        <p className="text-[11px] text-gray-400 mb-2 truncate">{r.department}</p>
      )}

      {/* Product */}
      <p className="text-xs text-gray-600 mb-3 leading-snug">{r.product}</p>

      {/* Bottom: state + status + year */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 flex-wrap">
        {r.state && (
          <span className="text-[10px] font-600 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {r.state}
          </span>
        )}
        {r.orderYear && (
          <span className="text-[10px] text-gray-400">{r.orderYear}</span>
        )}
        {r.status === "Completed" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-600 text-brand-600">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
            Completed
          </span>
        )}
      </div>
    </div>
  )
}

export default function FeaturedGovSupplies({
  records,
  maxVisible = 6,
  showViewAll = true,
  heading = "Featured Government Supplies",
  subheading = "A sample of government procurement orders fulfilled across India.",
}: Props) {
  const isDemo = records.length === 0
  const source = isDemo ? DEMO_RECORDS : records
  const visible = source.slice(0, maxVisible)

  return (
    <div>
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-display-xs font-700 text-white mb-2">{heading}</h2>
          <p className="text-gray-400 text-sm max-w-xl">{subheading}</p>
          {isDemo && (
            <p className="text-gray-600 text-xs mt-1">Representative examples. Actual records imported from procurement register.</p>
          )}
        </div>
        {showViewAll && (
          <Link
            href="/past-performance-government"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-600 text-brand-400 hover:text-brand-300 transition-colors"
          >
            View full register
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((r, i) => (
          <SupplyCard key={r._id || i} r={r} demo={isDemo} />
        ))}
      </div>
    </div>
  )
}
