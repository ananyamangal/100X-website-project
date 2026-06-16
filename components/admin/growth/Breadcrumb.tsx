"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const SEGMENT_LABELS: Record<string, string> = {
  director:                  "Revenue Director",
  dashboard:                 "Executive Dashboard",
  operations:                "Operations Center",
  reports:                   "Reporting Center",
  ads:                       "Ads",
  seo:                       "SEO",
  content:                   "Content",
  "landing-pages":           "Landing Pages",
  analytics:                 "Analytics",
  fogging:                   "Fogging Intelligence",
  dealers:                   "Dealer Intelligence",
  procurement:               "Procurement Intel",
  geo:                       "GEO / AI Search",
  "contact-this-week":       "Leads",
  opportunities:             "Opportunities",
  users:                     "Users",
  permissions:               "Permissions",
  security:                  "Security",
  logs:                      "Logs",
  "market-intelligence":     "Market Intelligence",
  competitors:               "Competitor Intel",
  founder:                   "Revenue Dashboard",
  launch:                    "Launch Status",
  agents:                    "Agents",
  "health-check":            "Health Check",
  "platform-registry":       "Platform Registry",
  automation:                "Automation",
  gem:                       "GeM Intel",
  "page-sections":           "Page Sections",
  paid:                      "Paid",
  audit:                     "Audit",
  setup:                     "Search Console",
  offpage:                   "Off-Page SEO",
  validate:                  "Validation",
  "creative-director":       "Creative Director",
  "approval-queue":          "Approval Queue",
  "campaign-factory":        "Campaign Factory",
  revenue:                   "Revenue Attribution",
  "remarketing-readiness":   "Remarketing Readiness",
  buyer:                     "Buyer Profile",
  oem:                       "OEM Profile",
  organizations:             "Organizations",
  sellers:                   "Sellers",
  contracts:                 "Contracts",
  model:                     "Model",
  state:                     "State",
  sales:                     "Sales",
  search:                    "Search",
  "data-quality":            "Data Quality",
  queue:                     "Queue",
  sessions:                  "Sessions",
  "audit-log":               "Audit Log",
  "email-templates":         "Email Templates",
  "auth-diagnostics":        "Auth Diagnostics",
  orphans:                   "Orphans",
  "email-diagnostics":       "Email Diagnostics",
  "auth-health":             "Auth Health",
  "session-center":          "Session Center",
  "google-auth-diagnostics": "Google Auth Diagnostics",
  edit:                      "Edit",
}

interface Crumb { label: string; href: string }

export function Breadcrumb() {
  const pathname = usePathname() ?? ""
  const segments = pathname.split("/").filter(Boolean)

  const crumbs: Crumb[] = []
  let runningPath = ""

  for (const seg of segments) {
    runningPath += "/" + seg
    if (seg === "admin" || seg === "growth") continue
    const label =
      SEGMENT_LABELS[seg] ??
      seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    crumbs.push({ label, href: runningPath })
  }

  if (crumbs.length === 0) {
    return <span className="text-xs text-gray-500 font-medium">Growth OS</span>
  }

  return (
    <nav className="flex items-center gap-1 text-xs overflow-hidden min-w-0" aria-label="Breadcrumb">
      <span className="text-gray-400 hidden sm:inline flex-shrink-0">Growth OS</span>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1 min-w-0">
          <ChevronRight size={11} className="text-gray-300 flex-shrink-0 hidden sm:block" />
          {i === crumbs.length - 1 ? (
            <span className="text-gray-700 font-medium truncate">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-400 hover:text-gray-700 truncate hidden sm:block transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
