/**
 * Customer Match Engine
 * Builds normalized audience records from 4 source collections and generates
 * Google-compliant Customer Match CSV (SHA-256 hashed per Google requirements).
 */

import crypto from "crypto"
import type { Db } from "mongodb"

// ── Types ─────────────────────────────────────────────────────────────────────

export type AudienceType =
  | "government_buyers"
  | "dealers"
  | "existing_customers"
  | "crm_leads"

export interface NormalizedRecord {
  recordId:     string
  // Identity
  firstName:    string
  lastName:     string
  fullName:     string
  // Contact
  email:        string
  altEmail:     string
  phone:        string
  altMobile:    string
  whatsapp:     string
  // Business
  company:      string
  designation:  string
  department:   string
  dealerType:   string
  oemStatus:    string
  gemSellerStatus: string
  // Location
  city:         string
  district:     string
  state:        string
  country:      string
  postalCode:   string  // used by Google format (Zip)
  // GeM Intelligence
  gemSellerId:      string
  gemVendorName:    string
  gemRegDate:       string
  gemCategories:    string
  orderCount:       string
  totalOrderValue:  string
  lastTenderDate:   string
  // Marketing
  source:           string
  segment:          string
  leadScore:        string
  lastActivityDate: string
  createdDate:      string
  updatedDate:      string
  // Internal flags
  missingEmail: boolean
  missingPhone: boolean
}

export interface QualityScore {
  totalRecords:        number
  withEmail:           number
  withPhone:           number
  withBoth:            number
  missingEmail:        number
  missingPhone:        number
  missingBoth:         number
  estimatedMatchRate:  number
  matchBasis:          string
  // government_buyers extras
  organizationsCount?: number
  contactsExtracted?:  number
  contractsScanned?:   number
}

export interface AudienceResult {
  records: NormalizedRecord[]
  extras?: {
    contractsScanned?:   number
    contactsExtracted?:  number
    organizationsCount?: number
  }
}

export interface AudienceDoc {
  audienceId:              string
  audienceType:            AudienceType
  displayName:             string
  qualityScore:            QualityScore | null
  uploadStatus:            "not_uploaded" | "uploading" | "uploaded" | "failed"
  googleUserListName?:     string
  googleUserListResource?: string
  googleJobResource?:      string
  lastBuiltAt:             string | null
  lastUploadedAt?:         string
  uploadError?:            string
}

// ── Audience metadata ─────────────────────────────────────────────────────────

export const AUDIENCE_META: Record<AudienceType, {
  displayName:  string
  description:  string
  colorClass:   string
  sourceHint:   string
}> = {
  government_buyers:  {
    displayName: "Government Buyers",
    description: "Buyer contacts (email + phone) extracted from GeM contract PDFs",
    colorClass:  "blue",
    sourceHint:  "gem_contracts — buyer_email + buyer_contact from PDF enrichment",
  },
  dealers: {
    displayName: "Dealers",
    description: "CRM dealer pipeline — active, prospective, and authorized",
    colorClass:  "emerald",
    sourceHint:  "crm_dealers — email + phone available",
  },
  existing_customers: {
    displayName: "Existing Customers",
    description: "Unique organizations that have purchased 100X products via GeM",
    colorClass:  "violet",
    sourceHint:  "fogging_contracts (is_100x) — org names only; enrichment required",
  },
  crm_leads: {
    displayName: "CRM Leads",
    description: "Brochure download and RFQ form submissions",
    colorClass:  "amber",
    sourceHint:  "brochure_leads + rfq_popup_leads — email + phone available",
  },
}

// ── Hashing ───────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

// ── Phone normalization (E.164) ───────────────────────────────────────────────

export function normalizePhone(raw: string): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10)                              return `+91${digits}`
  if (digits.startsWith("91") && digits.length === 12)  return `+${digits}`
  if (digits.startsWith("0") && digits.length === 11)   return `+91${digits.slice(1)}`
  if (digits.length >= 11)                               return `+${digits}`
  return ""
}

// ── Company name normalization (for dedup) ────────────────────────────────────

export function normalizeCompanyName(raw: string): string {
  if (!raw) return ""
  return raw
    .toLowerCase()
    .replace(/\bprivate\b/g,   "pvt")
    .replace(/\blimited\b/g,   "ltd")
    .replace(/\bpvt\b\s*\.\s*\bltd\b/g, "pvtltd")
    .replace(/\bpvt\s+ltd\b/g, "pvtltd")
    .replace(/[^a-z0-9]/g, "")  // strip all non-alphanum
    .trim()
}

// ── Safe date formatter ───────────────────────────────────────────────────────

function safeDate(raw: unknown): string {
  if (!raw) return ""
  try {
    const d = new Date(String(raw))
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]
  } catch {
    return ""
  }
}

// ── CSV field escaper ─────────────────────────────────────────────────────────

function csvField(value: string | number | undefined | null): string {
  const s = String(value ?? "")
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// ── Extract contact fields from rfq_popup_leads answers object ────────────────

function extractFromAnswers(answers: Record<string, unknown>): {
  email: string; phone: string; name: string
} {
  let email = "", phone = "", name = ""
  for (const val of Object.values(answers)) {
    const s = String(val ?? "").trim()
    if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
      email = s.toLowerCase()
    } else if (!phone && /^\d{10}$/.test(s.replace(/\D/g, ""))) {
      phone = s
    } else if (!name && s.length >= 3 && s.length <= 60 && /^[a-zA-Z\s'.]+$/.test(s)) {
      name = s
    }
  }
  return { email, phone, name }
}

// ── Blank record factory ──────────────────────────────────────────────────────

function blankRecord(overrides: Partial<NormalizedRecord> & Pick<NormalizedRecord, "recordId" | "source" | "segment">): NormalizedRecord {
  return {
    firstName:    "",
    lastName:     "",
    fullName:     "",
    email:        "",
    altEmail:     "",
    phone:        "",
    altMobile:    "",
    whatsapp:     "",
    company:      "",
    designation:  "",
    department:   "",
    dealerType:   "",
    oemStatus:    "",
    gemSellerStatus: "",
    city:         "",
    district:     "",
    state:        "",
    country:      "IN",
    postalCode:   "",
    gemSellerId:      "",
    gemVendorName:    "",
    gemRegDate:       "",
    gemCategories:    "",
    orderCount:       "",
    totalOrderValue:  "",
    lastTenderDate:   "",
    leadScore:        "",
    lastActivityDate: "",
    createdDate:      "",
    updatedDate:      "",
    missingEmail: true,
    missingPhone: true,
    ...overrides,
  }
}

// ── Source builders ───────────────────────────────────────────────────────────

async function buildCrmLeads(db: Db): Promise<NormalizedRecord[]> {
  const [brochure, rfq] = await Promise.all([
    db.collection("brochure_leads").find({}).limit(5000).toArray(),
    db.collection("rfq_popup_leads").find({}).limit(5000).toArray(),
  ])

  const records: NormalizedRecord[] = []

  for (const lead of brochure) {
    const rawName    = String(lead.name || "").trim()
    const nameParts  = rawName.split(/\s+/)
    const firstName  = nameParts[0] || ""
    const lastName   = nameParts.slice(1).join(" ")
    const email      = String(lead.email || "").toLowerCase().trim()
    const phone      = normalizePhone(String(lead.phone || ""))
    const createdDate = safeDate(lead.createdAt)
    records.push(blankRecord({
      recordId:     String(lead._id),
      firstName,
      lastName,
      fullName:     rawName || [firstName, lastName].filter(Boolean).join(" "),
      email,
      phone,
      company:      String(lead.organization || lead.company || ""),
      state:        String(lead.state || ""),
      country:      "IN",
      source:       "brochure_leads",
      segment:      "crm_leads",
      gemSellerStatus: "CRM Lead",
      createdDate,
      missingEmail: !email,
      missingPhone: !phone,
    }))
  }

  for (const lead of rfq) {
    const answers    = (lead.answers || {}) as Record<string, unknown>
    const { email, phone, name } = extractFromAnswers(answers)
    const nameParts  = name.split(/\s+/)
    const normPhone  = normalizePhone(phone)
    if (email || normPhone) {
      const createdDate = safeDate(lead.createdAt)
      records.push(blankRecord({
        recordId:     String(lead._id),
        firstName:    nameParts[0] || "",
        lastName:     nameParts.slice(1).join(" "),
        fullName:     name,
        email,
        phone:        normPhone,
        country:      "IN",
        source:       "rfq_popup_leads",
        segment:      "crm_leads",
        gemSellerStatus: "CRM Lead",
        createdDate,
        missingEmail: !email,
        missingPhone: !normPhone,
      }))
    }
  }

  return records
}

async function buildDealers(db: Db): Promise<NormalizedRecord[]> {
  const [prospects, crmDealers] = await Promise.all([
    db.collection("dealer_prospects")
      .find({ status: { $ne: "rejected" } })
      .limit(5000)
      .toArray(),
    db.collection("crm_dealers").find({}).limit(500).toArray(),
  ])

  const records: NormalizedRecord[] = []

  for (const d of prospects) {
    const rawName   = String(d.contact_person || d.dealer_name || "").trim()
    const nameParts = rawName.split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName  = nameParts.slice(1).join(" ")
    const email     = String(d.email  || "").toLowerCase().trim()
    const phone     = normalizePhone(String(d.mobile || ""))
    const createdDate = safeDate(d.created_at)
    records.push(blankRecord({
      recordId:     String(d._id),
      firstName,
      lastName,
      fullName:     rawName || [firstName, lastName].filter(Boolean).join(" "),
      email,
      phone,
      company:      String(d.dealer_name || ""),
      city:         String(d.city  || ""),
      state:        String(d.state || ""),
      country:      "IN",
      postalCode:   String(d.pincode || ""),
      gemSellerId:  String(d.gst || ""),
      source:       "dealer_prospects",
      segment:      "dealers",
      dealerType:   String(d.dealer_type || d.source || ""),
      leadScore:    d.dealer_score != null ? String(d.dealer_score) : "",
      gemSellerStatus: "Dealer Prospect",
      createdDate,
      missingEmail: !email,
      missingPhone: !phone,
    }))
  }

  for (const d of crmDealers) {
    const email   = String(d.email || "").toLowerCase().trim()
    const phone   = normalizePhone(String(d.phone || ""))
    if (!email && !phone) continue
    const rawName   = String(d.name || "").trim()
    const nameParts = rawName.split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName  = nameParts.slice(1).join(" ")
    records.push(blankRecord({
      recordId:     String(d._id),
      firstName,
      lastName,
      fullName:     rawName || [firstName, lastName].filter(Boolean).join(" "),
      email,
      phone,
      company:      String(d.company || ""),
      city:         String(d.city || ""),
      state:        String(d.state || ""),
      country:      "IN",
      postalCode:   String(d.pincode || ""),
      source:       "crm_dealers",
      segment:      "dealers",
      dealerType:   String(d.dealer_type || ""),
      gemSellerStatus: "Dealer (CRM)",
      missingEmail: !email,
      missingPhone: !phone,
    }))
  }

  return records
}

async function buildGovernmentBuyers(db: Db): Promise<AudienceResult> {
  const raw = await db.collection("gem_contracts")
    .find({
      $or: [
        { buyer_email:   { $exists: true, $nin: [null, ""] } },
        { buyer_contact: { $exists: true, $nin: [null, ""] } },
      ],
    })
    .project({
      buyer_name: 1, buyer_email: 1, buyer_contact: 1,
      buyer_designation: 1, buyer_state: 1,
      buyer_dept: 1, buyer_ministry: 1,
      gem_order_id: 1, contract_date: 1, order_value: 1,
    })
    .limit(20000)
    .toArray()

  const contractsScanned = raw.length
  const orgs = new Set<string>()
  let contactsExtracted = 0

  const seenEmail = new Set<string>()
  const seenPhone = new Set<string>()
  const records: NormalizedRecord[] = []

  for (const c of raw) {
    const email = String(c.buyer_email   || "").toLowerCase().trim()
    const phone = normalizePhone(String(c.buyer_contact || ""))
    if (!email && !phone) continue

    contactsExtracted++
    const org = String(c.buyer_name || c.buyer_dept || c.buyer_ministry || "")
    if (org) orgs.add(org)

    if (email && seenEmail.has(email)) continue
    if (!email && phone && seenPhone.has(phone)) continue
    if (email) seenEmail.add(email)
    if (phone) seenPhone.add(phone)

    const designation = String(c.buyer_designation || "")
    const parts = designation.split(/\s+/).filter(Boolean)
    const rawName = String(c.buyer_name || "").trim()
    const contractDate = safeDate(c.contract_date)

    records.push(blankRecord({
      recordId:     String(c._id),
      firstName:    parts[0] || "",
      lastName:     parts.slice(1).join(" "),
      fullName:     rawName || designation,
      email,
      phone,
      company:      org,
      state:        String(c.buyer_state || ""),
      country:      "IN",
      designation,
      department:   String(c.buyer_dept || ""),
      source:       "gem_contracts",
      segment:      "government_buyers",
      gemSellerStatus: "Government Buyer",
      lastActivityDate: contractDate,
      missingEmail: !email,
      missingPhone: !phone,
    }))
  }

  return {
    records,
    extras: { contractsScanned, contactsExtracted, organizationsCount: orgs.size },
  }
}

async function buildExistingCustomers(db: Db): Promise<NormalizedRecord[]> {
  const contracts = await db.collection("fogging_contracts")
    .find({ is_100x: true })
    .limit(5000)
    .toArray()
  const seen = new Set<string>()
  const records: NormalizedRecord[] = []
  for (const c of contracts) {
    const company = String(c.buyer_display_name || c.buyer_canonical || "")
    if (!company || seen.has(company)) continue
    seen.add(company)
    const contractDate = safeDate(c.contract_date)
    records.push(blankRecord({
      recordId:     String(c._id),
      company,
      state:        String(c.buyer_state || ""),
      country:      "IN",
      source:       "fogging_contracts",
      segment:      "existing_customers",
      gemSellerStatus: "Existing Customer",
      lastActivityDate: contractDate,
      missingEmail: true,
      missingPhone: true,
    }))
  }
  return records
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildAudienceRecords(
  audienceType: AudienceType,
  db: Db,
): Promise<AudienceResult> {
  let records: NormalizedRecord[]
  let extras: AudienceResult["extras"]

  if (audienceType === "government_buyers") {
    const result = await buildGovernmentBuyers(db)
    records = result.records
    extras  = result.extras
  } else {
    switch (audienceType) {
      case "crm_leads":          records = await buildCrmLeads(db);          break
      case "dealers":            records = await buildDealers(db);           break
      case "existing_customers": records = await buildExistingCustomers(db); break
    }
  }

  // Priority deduplication: email → phone → company (normalized)
  const seenEmails    = new Set<string>()
  const seenPhones    = new Set<string>()
  const seenCompanies = new Set<string>()

  const deduped = records!.filter(r => {
    if (r.email) {
      if (seenEmails.has(r.email)) return false
      seenEmails.add(r.email)
      if (r.phone) seenPhones.add(r.phone)
      return true
    }
    if (r.phone) {
      if (seenPhones.has(r.phone)) return false
      seenPhones.add(r.phone)
      return true
    }
    if (r.company) {
      const normalized = normalizeCompanyName(r.company)
      if (normalized && seenCompanies.has(normalized)) return false
      if (normalized) seenCompanies.add(normalized)
      return true
    }
    return true
  })

  return { records: deduped, extras }
}

// ── Quality scoring ───────────────────────────────────────────────────────────

export function computeQualityScore(
  records: NormalizedRecord[],
  extras?: AudienceResult["extras"],
): QualityScore {
  const withEmail   = records.filter(r => r.email).length
  const withPhone   = records.filter(r => r.phone).length
  const withBoth    = records.filter(r => r.email && r.phone).length
  const missingEmail = records.filter(r => !r.email).length
  const missingPhone = records.filter(r => !r.phone).length
  const missingBoth  = records.filter(r => !r.email && !r.phone).length

  const emailMatch  = withEmail * 0.50
  const phoneMatch  = withPhone * 0.35
  const unionMatch  = emailMatch + phoneMatch - (withBoth * 0.40)
  const estimatedMatchRate = records.length > 0
    ? Math.min(95, Math.max(0, Math.round((unionMatch / records.length) * 100)))
    : 0

  return {
    totalRecords: records.length,
    withEmail,
    withPhone,
    withBoth,
    missingEmail,
    missingPhone,
    missingBoth,
    estimatedMatchRate,
    matchBasis: withEmail >= withPhone ? "Email-based" : "Phone-based",
    ...(extras?.organizationsCount !== undefined ? { organizationsCount: extras.organizationsCount } : {}),
    ...(extras?.contactsExtracted  !== undefined ? { contactsExtracted:  extras.contactsExtracted  } : {}),
    ...(extras?.contractsScanned   !== undefined ? { contractsScanned:   extras.contractsScanned   } : {}),
  }
}

// ── Full CSV (all enrichment fields for internal use / CRM import) ────────────

export function generateFullCSV(records: NormalizedRecord[]): string {
  const header = [
    "Full Name", "First Name", "Last Name", "Company Name",
    "Email", "Alternate Email", "Mobile Number", "Alternate Mobile Number", "WhatsApp Number",
    "Organization", "Designation", "Department", "Dealer Type", "OEM Status", "GeM Seller Status",
    "City", "District", "State", "Country", "Pincode",
    "GeM Seller ID", "GeM Vendor Name", "GeM Registration Date", "GeM Categories",
    "Order Count", "Total Order Value", "Last Tender Activity",
    "Source", "Segment", "Lead Score", "Last Activity Date", "Created Date", "Updated Date",
  ].map(csvField).join(",")

  const rows = records.map(r => [
    r.fullName      || [r.firstName, r.lastName].filter(Boolean).join(" "),
    r.firstName,
    r.lastName,
    r.company,
    r.email,
    r.altEmail,
    r.phone,
    r.altMobile,
    r.whatsapp,
    r.company,          // Organization = Company for now
    r.designation,
    r.department,
    r.dealerType,
    r.oemStatus,
    r.gemSellerStatus,
    r.city,
    r.district,
    r.state,
    r.country || "IN",
    r.postalCode,
    r.gemSellerId,
    r.gemVendorName,
    r.gemRegDate,
    r.gemCategories,
    r.orderCount,
    r.totalOrderValue,
    r.lastTenderDate,
    r.source,
    r.segment,
    r.leadScore,
    r.lastActivityDate,
    r.createdDate,
    r.updatedDate,
  ].map(csvField).join(","))

  return [header, ...rows].join("\r\n")
}

// ── Google Customer Match CSV (6 fields, for Google Ads UI upload) ────────────

export function generatePlainCSV(records: NormalizedRecord[]): string {
  const header   = "Email,Phone,First Name,Last Name,Country,Zip"
  const matchable = records.filter(r => r.email || r.phone)
  const rows = matchable.map(r =>
    [r.email, r.phone, r.firstName, r.lastName, r.country || "IN", r.postalCode || ""].join(",")
  )
  return [header, ...rows].join("\r\n")
}

// ── Hashed CSV (SHA-256 per Google OfflineUserDataJob requirements) ───────────

export function generateGoogleCSV(records: NormalizedRecord[]): string {
  const header  = "Email,Phone,First Name,Last Name,Country,Zip"
  const matchable = records.filter(r => r.email || r.phone)

  const rows = matchable.map(r => {
    const email   = r.email      ? sha256(r.email)                      : ""
    const phone   = r.phone      ? sha256(r.phone)                      : ""
    const first   = r.firstName  ? sha256(r.firstName.toLowerCase())    : ""
    const last    = r.lastName   ? sha256(r.lastName.toLowerCase())     : ""
    return [email, phone, first, last, r.country || "IN", r.postalCode || ""].join(",")
  })

  return [header, ...rows].join("\r\n")
}

// ── Member list for Google Ads API upload ─────────────────────────────────────

export interface GoogleMember {
  hashedEmail?:       string
  hashedPhone?:       string
  hashedFirstName?:   string
  hashedLastName?:    string
  countryCode?:       string
  postalCode?:        string
}

export function toGoogleMembers(records: NormalizedRecord[]): GoogleMember[] {
  return records
    .filter(r => r.email || r.phone)
    .map(r => {
      const m: GoogleMember = {}
      if (r.email)     m.hashedEmail     = sha256(r.email)
      if (r.phone)     m.hashedPhone     = sha256(r.phone)
      if (r.firstName) m.hashedFirstName = sha256(r.firstName.toLowerCase())
      if (r.lastName)  m.hashedLastName  = sha256(r.lastName.toLowerCase())
      m.countryCode = r.country || "IN"
      if (r.postalCode) m.postalCode = r.postalCode
      return m
    })
}
