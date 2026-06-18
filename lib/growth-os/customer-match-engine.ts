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
  firstName:    string
  lastName:     string
  email:        string
  phone:        string
  company:      string
  city:         string
  state:        string
  country:      string
  postalCode:   string
  source:       string
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

// ── Source builders ───────────────────────────────────────────────────────────

async function buildCrmLeads(db: Db): Promise<NormalizedRecord[]> {
  const [brochure, rfq] = await Promise.all([
    db.collection("brochure_leads").find({}).limit(5000).toArray(),
    db.collection("rfq_popup_leads").find({}).limit(5000).toArray(),
  ])

  const records: NormalizedRecord[] = []

  for (const lead of brochure) {
    const nameParts = String(lead.name || "").trim().split(/\s+/)
    const email     = String(lead.email || "").toLowerCase().trim()
    const phone     = normalizePhone(String(lead.phone || ""))
    records.push({
      recordId:     String(lead._id),
      firstName:    nameParts[0] || "",
      lastName:     nameParts.slice(1).join(" "),
      email,
      phone,
      company:      String(lead.organization || lead.company || ""),
      city:         "",
      state:        String(lead.state || ""),
      country:      "IN",
      postalCode:   "",
      source:       "brochure_leads",
      missingEmail: !email,
      missingPhone: !phone,
    })
  }

  for (const lead of rfq) {
    const answers = (lead.answers || {}) as Record<string, unknown>
    const { email, phone, name } = extractFromAnswers(answers)
    const nameParts = name.split(/\s+/)
    const normPhone = normalizePhone(phone)
    if (email || normPhone) {
      records.push({
        recordId:     String(lead._id),
        firstName:    nameParts[0] || "",
        lastName:     nameParts.slice(1).join(" "),
        email,
        phone:        normPhone,
        company:      "",
        city:         "",
        state:        "",
        country:      "IN",
        postalCode:   "",
        source:       "rfq_popup_leads",
        missingEmail: !email,
        missingPhone: !normPhone,
      })
    }
  }

  return records
}

async function buildDealers(db: Db): Promise<NormalizedRecord[]> {
  // Primary: dealer_prospects (real contacts from acquisition engine)
  const [prospects, crmDealers] = await Promise.all([
    db.collection("dealer_prospects")
      .find({ status: { $ne: "rejected" } })
      .limit(5000)
      .toArray(),
    db.collection("crm_dealers").find({}).limit(500).toArray(),
  ])

  const records: NormalizedRecord[] = []

  for (const d of prospects) {
    const nameParts = String(d.contact_person || d.dealer_name || "").trim().split(/\s+/)
    const email     = String(d.email  || "").toLowerCase().trim()
    const phone     = normalizePhone(String(d.mobile || ""))
    records.push({
      recordId:     String(d._id),
      firstName:    nameParts[0] || "",
      lastName:     nameParts.slice(1).join(" "),
      email,
      phone,
      company:      String(d.dealer_name || ""),
      city:         String(d.city  || ""),
      state:        String(d.state || ""),
      country:      "IN",
      postalCode:   "",
      source:       "dealer_prospects",
      missingEmail: !email,
      missingPhone: !phone,
    })
  }

  // Supplement with any crm_dealers records that have contact data
  for (const d of crmDealers) {
    const email = String(d.email || "").toLowerCase().trim()
    const phone = normalizePhone(String(d.phone || ""))
    if (!email && !phone) continue  // skip pipeline-only records
    const nameParts = String(d.name || "").trim().split(/\s+/)
    records.push({
      recordId:     String(d._id),
      firstName:    nameParts[0] || "",
      lastName:     nameParts.slice(1).join(" "),
      email,
      phone,
      company:      String(d.company || ""),
      city:         String(d.city || ""),
      state:        String(d.state || ""),
      country:      "IN",
      postalCode:   String(d.pincode || ""),
      source:       "crm_dealers",
      missingEmail: !email,
      missingPhone: !phone,
    })
  }

  return records
}

async function buildGovernmentBuyers(db: Db): Promise<AudienceResult> {
  // Query gem_contracts for buyer contact data extracted from PDFs.
  // buyer_email and buyer_contact (phone) are populated by the enrichment pipeline.
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

    // Deduplicate: email-keyed first, then phone-keyed for email-less records
    if (email && seenEmail.has(email)) continue
    if (!email && phone && seenPhone.has(phone)) continue
    if (email) seenEmail.add(email)
    if (phone) seenPhone.add(phone)

    const designation = String(c.buyer_designation || "")
    const parts = designation.split(/\s+/).filter(Boolean)

    records.push({
      recordId:     String(c._id),
      firstName:    parts[0] || "",
      lastName:     parts.slice(1).join(" "),
      email,
      phone,
      company:      org,
      city:         "",
      state:        String(c.buyer_state || ""),
      country:      "IN",
      postalCode:   "",
      source:       "gem_contracts",
      missingEmail: !email,
      missingPhone: !phone,
    })
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
    records.push({
      recordId:     String(c._id),
      firstName:    "",
      lastName:     "",
      email:        "",
      phone:        "",
      company,
      city:         "",
      state:        String(c.buyer_state || ""),
      country:      "IN",
      postalCode:   "",
      source:       "fogging_contracts",
      missingEmail: true,
      missingPhone: true,
    })
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

  // Deduplicate by email; fall back to a composite key for no-email records
  const seen = new Set<string>()
  const deduped = records!.filter(r => {
    const key = r.email || `${r.company}::${r.source}::${r.recordId}`
    if (seen.has(key)) return false
    seen.add(key)
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

  // Google matching: ~50% of valid emails, ~35% of valid phones
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

// ── Plain CSV (for Google Ads UI upload / manual review) ─────────────────────

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
