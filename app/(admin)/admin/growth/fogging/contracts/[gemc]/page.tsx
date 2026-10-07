"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Building2, MapPin, Calendar, Tag, Package, User, ChevronRight } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`
  return `₹${Math.round(v).toLocaleString("en-IN")}`
}
const fmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

interface ContractDoc {
  gemc_no: string
  buyer_display_name: string
  buyer_canonical: string
  buyer_state: string | null
  dept_name?: string
  gem_office_name?: string
  oem_canonical: string
  oem_short_brand: string | null
  is_100x: boolean
  model_raw: string | null
  model_normalized: string | null
  contract_date: string | null
  contract_value_num: number | null
  quantity: number | null
  unit_price: number | null
  has_unit_price: boolean
  seller_gst: string | null
  seller_name: string | null
  buying_mode: string | null
  contract_status: string | null
  org_type: string | null
  ministry: string | null
}

interface GemSrc {
  product_name?: string
  org_name?: string
  dept_name?: string
  office_name?: string
  seller_msme_category?: string
  unit_rate?: number | null
  contract_status?: string | null
  buying_mode?: string | null
}

interface ApiResponse {
  contract: ContractDoc
  gem_src: GemSrc | null
  gem_url: string
}

function Field({ label, value, children, wide }: { label: string; value?: string | null; children?: React.ReactNode; wide?: boolean }) {
  const content = children ?? <span className="text-sm text-gray-800 leading-snug">{value ?? "—"}</span>
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      {content}
    </div>
  )
}

export default function Contract360() {
  const { gemc } = useParams<{ gemc: string }>()
  const gemcNo = decodeURIComponent(gemc)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/fogging/contracts/${encodeURIComponent(gemcNo)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => { if (d) { setData(d); setLoading(false) } })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [gemcNo])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading contract…</div>
    </div>
  )

  if (notFound || !data) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="text-2xl font-semibold text-gray-700">Contract not found</div>
      <div className="font-mono text-sm text-gray-400">{gemcNo}</div>
      <Link href="/admin/growth/fogging/contracts" className="text-sm text-blue-600 hover:underline">
        ← Back to Contract Directory
      </Link>
    </div>
  )

  const { contract, gem_src, gem_url } = data

  // Entity hierarchy: builder output (buyer_display_name) is always primary
  // gem_src.org_name shown only if it adds context beyond the primary entity
  const DEPT_ORG_RE = /^urban development and housing department$/i
  const primaryEntity = contract.buyer_display_name
  const gemOrgName = gem_src?.org_name && gem_src.org_name !== "N/A" && !DEPT_ORG_RE.test(gem_src.org_name)
    ? gem_src.org_name : null
  const showParentOrg = gemOrgName && gemOrgName.toLowerCase() !== primaryEntity.toLowerCase()
  const deptName = contract.dept_name || gem_src?.dept_name || null
  // Hide numeric office zone codes (GeM internal codes like "803213")
  const rawOffice = contract.gem_office_name || gem_src?.office_name || null
  const officeName = rawOffice && !/^\d+$/.test(rawOffice) ? rawOffice : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/growth/fogging/contracts"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Contract 360</div>
              <div className="font-mono text-sm font-semibold text-gray-800 select-all">{gemcNo}</div>
            </div>
          </div>
          <a href={gem_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <ExternalLink size={13} /> Open on GeM
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header KPIs ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Contract Value</div>
            <div className="text-2xl font-bold text-blue-700">{INR(contract.contract_value_num)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">OEM / Brand</div>
            <div className={`text-lg font-bold ${contract.is_100x ? "text-blue-700" : "text-gray-800"}`}>
              {contract.oem_short_brand ?? contract.oem_canonical}
              {contract.is_100x && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">100X</span>}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Contract Date</div>
            <div className="text-lg font-bold text-gray-800">{fmt(contract.contract_date)}</div>
          </div>
        </div>

        {/* ── Entity Hierarchy ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide mb-4">
            <Building2 size={14} /> Entity Hierarchy
          </div>
          <div className="space-y-3">
            {/* Organization (primary — builder output) */}
            <div className="flex items-start gap-3">
              <div className="w-24 text-xs text-gray-400 pt-0.5 shrink-0">Organization</div>
              <div>
                <Link href={`/admin/growth/fogging/buyer/${encodeURIComponent(contract.buyer_canonical)}`}
                  className="text-sm font-semibold text-indigo-700 hover:underline leading-snug">
                  {primaryEntity}
                </Link>
                {contract.buyer_state && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <MapPin size={11} /> {contract.buyer_state}
                  </div>
                )}
              </div>
            </div>
            {/* Parent org (only if different from primary entity and adds context) */}
            {showParentOrg && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-xs text-gray-400 pt-0.5 shrink-0">Parent Org</div>
                <div className="text-sm text-gray-600 leading-snug">{gemOrgName}</div>
              </div>
            )}
            {/* Department (secondary) */}
            {deptName && deptName !== primaryEntity && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-xs text-gray-400 pt-0.5 shrink-0">Department</div>
                <div className="text-sm text-gray-700 leading-snug">{deptName}</div>
              </div>
            )}
            {/* Office (tertiary — numeric zone codes hidden) */}
            {officeName && officeName !== primaryEntity && officeName !== deptName && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-xs text-gray-400 pt-0.5 shrink-0">Office</div>
                <div className="text-sm text-gray-600 leading-snug">{officeName}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Contract Details ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide mb-4">
            <Tag size={14} /> Contract Details
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Model">
              {contract.model_raw ? (
                contract.model_normalized ? (
                  <Link href={`/admin/growth/fogging/model/${encodeURIComponent(contract.model_normalized)}`}
                    className="text-sm text-blue-700 hover:underline">{contract.model_raw}</Link>
                ) : <span className="text-sm text-gray-800">{contract.model_raw}</span>
              ) : <span className="text-sm text-gray-400">—</span>}
            </Field>
            <Field label="OEM">
              <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(contract.oem_canonical)}`}
                className={`text-sm font-medium hover:underline ${contract.is_100x ? "text-blue-700" : "text-gray-800"}`}>
                {contract.oem_short_brand ?? contract.oem_canonical}
              </Link>
            </Field>
            <Field label="Buying Mode" value={contract.buying_mode} />
            <Field label="Status" value={contract.contract_status} />
            <Field label="Quantity" value={contract.quantity != null ? String(contract.quantity) : null} />
            <Field label="Unit Price">
              {contract.has_unit_price
                ? <span className="text-sm font-medium text-green-700">{INR(contract.unit_price)}</span>
                : <span className="text-sm text-gray-400">Lump sum</span>}
            </Field>
            {gem_src?.product_name && (
              <Field label="Product" wide>
                <span className="text-sm text-gray-800">{gem_src.product_name}</span>
              </Field>
            )}
          </div>
        </div>

        {/* ── Seller / Dealer ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide mb-4">
            <User size={14} /> Seller / Dealer
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1.5">
            <div className="font-semibold text-gray-800">{contract.seller_name ?? "—"}</div>
            {contract.seller_gst && (
              <div className="font-mono text-xs text-gray-500 select-all">{contract.seller_gst}</div>
            )}
            {gem_src?.seller_msme_category && (
              <div className="text-xs text-amber-700 bg-amber-100 inline-block px-2 py-0.5 rounded">
                {gem_src.seller_msme_category}
              </div>
            )}
          </div>
          {contract.seller_gst && (
            <Link href={`/admin/growth/fogging/sellers/${encodeURIComponent(contract.seller_gst)}`}
              className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 hover:underline transition-colors">
              View Seller 360 <ChevronRight size={12} />
            </Link>
          )}
        </div>

        {/* ── Quick Links ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Quick Links</div>
          <div className="grid grid-cols-2 gap-2">
            <a href={gem_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <ExternalLink size={14} /> Open on GeM Portal
            </a>
            <Link href={`/admin/growth/fogging/buyer/${encodeURIComponent(contract.buyer_canonical)}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
              <Building2 size={14} /> Buyer 360
            </Link>
            {contract.model_normalized && (
              <Link href={`/admin/growth/fogging/model/${encodeURIComponent(contract.model_normalized)}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                <Package size={14} /> Model 360
              </Link>
            )}
            <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(contract.oem_canonical)}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
              <Tag size={14} /> OEM 360
            </Link>
          </div>
        </div>

        {/* ── GeM Reference ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">GeM Reference</div>
          <a href={gem_url} target="_blank" rel="noreferrer"
            className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group">
            <div>
              <div className="font-mono text-sm font-medium text-blue-700 select-all">{gemcNo}</div>
              <div className="text-xs text-gray-400 mt-0.5">{gem_url}</div>
            </div>
            <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600" />
          </a>
          <p className="text-xs text-gray-400 mt-2">View brochure, delivery terms, and download contract PDF on GeM.</p>
        </div>

      </div>
    </div>
  )
}
