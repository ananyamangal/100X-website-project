// Display helpers and labels for the CRM screens (client-safe; lib/crm/model has no server imports).
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, LEAD_SOURCES, STAGES, STAGE_LABEL, type CustomerType, type LeadSource, type Stage } from "@/lib/crm/model"

export { CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, LEAD_SOURCES, STAGES, STAGE_LABEL }
export type { CustomerType, LeadSource, Stage }

export const SOURCE_LABEL: Record<LeadSource, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  website: "Website",
  gem: "GeM",
  referral: "Referral",
  existing_dealer: "Existing dealer",
}

export const stageLabel = (s: string | null | undefined) => (s && s in STAGE_LABEL ? STAGE_LABEL[s as Stage] : s ?? "")
export const sourceLabel = (s: string | null | undefined) => (s && s in SOURCE_LABEL ? SOURCE_LABEL[s as LeadSource] : s ?? "")
export const typeLabel = (s: string | null | undefined) => (s && s in CUSTOMER_TYPE_LABEL ? CUSTOMER_TYPE_LABEL[s as CustomerType] : s ?? "")

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
]

/** +919876543210 -> +91 98765 43210 ; other numbers are shown as stored. */
export function prettyPhone(e164: string | null | undefined): string {
  if (!e164) return ""
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164)
  return m ? `+91 ${m[1]} ${m[2]}` : e164
}

export const telHref = (e164: string) => `tel:${e164}`
export const waHref = (e164: string) => `https://wa.me/${e164.replace(/\D/g, "")}`

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "No activity yet"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function fullTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

export interface UserRefView {
  userId: string
  name: string
}

export const displayName = (c: { name?: string | null; waProfileName?: string | null; phoneE164?: string }) =>
  c.name || c.waProfileName || prettyPhone(c.phoneE164) || "Unknown"
