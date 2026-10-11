/**
 * Inbound automation settings (STEP 8; DATA_MODEL §1.17, §8 "Automation on inbound"), stored on
 * crm_settings (_id = workspace). Absent fields fall back to AUTOMATION_DEFAULTS: both automatic
 * replies are OFF until the owner switches them on; no keyword rules are seeded.
 */
import type { Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, CUSTOMER_TYPES } from "../model"
import { DEFAULT_STOP_KEYWORDS } from "../outbound/optout"
import { Checker, isPlainObject, type FieldErrors } from "../validate"

export interface BusinessHours { tz: "Asia/Kolkata"; days: number[]; open: string; close: string }
export interface KeywordRule { keyword: string; field: "customerType" | "interestTag"; value: string }
export interface AutomationSettings {
  businessHours: BusinessHours
  autoAck: { enabled: boolean; text: string | null; textHi: string | null }
  afterHoursReply: { enabled: boolean; text: string | null; textHi: string | null; minIntervalHours: number }
  keywordRules: KeywordRule[]
  stopKeywords: string[]
}

/** days: 0 = Sunday … 6 = Saturday (IST). */
export const AUTOMATION_DEFAULTS: AutomationSettings = {
  businessHours: { tz: "Asia/Kolkata", days: [1, 2, 3, 4, 5, 6], open: "09:30", close: "18:30" },
  autoAck: { enabled: false, text: null, textHi: null },
  afterHoursReply: { enabled: false, text: null, textHi: null, minIntervalHours: 12 },
  keywordRules: [],
  stopKeywords: [...DEFAULT_STOP_KEYWORDS],
}

/** Offered in the editor; the owner decides. */
export const SUGGESTED_KEYWORD_RULES: KeywordRule[] = [
  { keyword: "dealer", field: "customerType", value: "dealer" },
  { keyword: "distributor", field: "customerType", value: "dealer" },
  { keyword: "GeM", field: "interestTag", value: "gem" },
  { keyword: "tender", field: "interestTag", value: "tender" },
  { keyword: "nagar nigam", field: "customerType", value: "govt_dept" },
  { keyword: "AMC", field: "interestTag", value: "amc" },
]

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export async function loadAutomationSettings(crm: CrmDb): Promise<AutomationSettings> {
  const s = await crm.collection<Document & { _id: string }>(COLL.settings).findOne({ _id: crm.workspace }, { projection: { businessHours: 1, autoAck: 1, afterHoursReply: 1, keywordRules: 1, stopKeywords: 1 } })
  return mergeSettings(s)
}

/** Defaults filled in field by field (a partial or older document never breaks automation). */
export function mergeSettings(s: Document | null | undefined): AutomationSettings {
  const d = AUTOMATION_DEFAULTS
  const bh = isPlainObject(s?.businessHours) ? (s.businessHours as Document) : {}
  const ack = isPlainObject(s?.autoAck) ? (s.autoAck as Document) : {}
  const ah = isPlainObject(s?.afterHoursReply) ? (s.afterHoursReply as Document) : {}
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null)
  return {
    businessHours: {
      tz: "Asia/Kolkata",
      days: Array.isArray(bh.days) && bh.days.every((x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6) ? (bh.days as number[]) : d.businessHours.days,
      open: typeof bh.open === "string" && TIME.test(bh.open) ? bh.open : d.businessHours.open,
      close: typeof bh.close === "string" && TIME.test(bh.close) ? bh.close : d.businessHours.close,
    },
    autoAck: { enabled: ack.enabled === true, text: str(ack.text), textHi: str(ack.textHi) },
    afterHoursReply: {
      enabled: ah.enabled === true,
      text: str(ah.text),
      textHi: str(ah.textHi),
      minIntervalHours: Number.isInteger(ah.minIntervalHours) && ah.minIntervalHours >= 1 && ah.minIntervalHours <= 168 ? ah.minIntervalHours : d.afterHoursReply.minIntervalHours,
    },
    keywordRules: Array.isArray(s?.keywordRules) ? (s.keywordRules as KeywordRule[]).filter(r => r && typeof r.keyword === "string" && typeof r.value === "string") : [],
    stopKeywords: Array.isArray(s?.stopKeywords) && s.stopKeywords.length ? (s.stopKeywords as unknown[]).map(String) : d.stopKeywords,
  }
}

const TEXT_MAX = 1000

/** PUT body → full settings (every field required; the editor always sends the whole object). */
export function parseAutomationSettings(body: Record<string, unknown>): { ok: true; settings: AutomationSettings } | { ok: false; fields: FieldErrors } {
  const c = new Checker()
  for (const k of Object.getOwnPropertyNames(body)) if (!["businessHours", "autoAck", "afterHoursReply", "keywordRules", "stopKeywords"].includes(k)) c.fail(k, "unknown_field")
  const obj = (k: string) => (isPlainObject(body[k]) ? (body[k] as Record<string, unknown>) : (c.fail(k, "invalid_object"), {} as Record<string, unknown>))
  const bh = obj("businessHours")
  const days = bh.days
  if (!Array.isArray(days) || days.length > 7 || !days.every(x => Number.isInteger(x) && x >= 0 && x <= 6) || new Set(days).size !== days.length) c.fail("businessHours.days", "invalid")
  for (const k of ["open", "close"]) if (typeof bh[k] !== "string" || !TIME.test(bh[k] as string)) c.fail(`businessHours.${k}`, "invalid_time")
  if (typeof bh.open === "string" && typeof bh.close === "string" && TIME.test(bh.open) && TIME.test(bh.close) && bh.open >= bh.close) c.fail("businessHours.close", "must_be_after_open")
  const texts = (o: Record<string, unknown>, prefix: string) => {
    const out: { text: string | null; textHi: string | null } = { text: null, textHi: null }
    for (const k of ["text", "textHi"] as const) {
      const v = c.str(o, k, TEXT_MAX, { multiline: true })
      if (Object.hasOwn(c.errors, k)) { c.fail(`${prefix}.${k}`, c.errors[k]); delete c.errors[k] }
      out[k] = v
    }
    return out
  }
  const ack = obj("autoAck")
  if (typeof ack.enabled !== "boolean") c.fail("autoAck.enabled", "invalid")
  const ackT = texts(ack, "autoAck")
  const ah = obj("afterHoursReply")
  if (typeof ah.enabled !== "boolean") c.fail("afterHoursReply.enabled", "invalid")
  const ahT = texts(ah, "afterHoursReply")
  const mih = ah.minIntervalHours
  if (!Number.isInteger(mih) || (mih as number) < 1 || (mih as number) > 168) c.fail("afterHoursReply.minIntervalHours", "invalid_number")
  const rules: KeywordRule[] = []
  const kr = body.keywordRules
  if (!Array.isArray(kr) || kr.length > 100) c.fail("keywordRules", "invalid_list")
  else kr.forEach((r, i) => {
    if (!isPlainObject(r)) return c.fail(`keywordRules.${i}`, "invalid")
    const keyword = typeof r.keyword === "string" ? r.keyword.trim() : ""
    if (!keyword || keyword.length > 60 || /[\u0000-\u001F]/.test(keyword)) return c.fail(`keywordRules.${i}.keyword`, "invalid")
    if (r.field !== "customerType" && r.field !== "interestTag") return c.fail(`keywordRules.${i}.field`, "invalid_enum")
    const value = typeof r.value === "string" ? r.value.trim().toLowerCase() : ""
    if (r.field === "customerType" && !(CUSTOMER_TYPES as readonly string[]).includes(value)) return c.fail(`keywordRules.${i}.value`, "invalid_enum")
    if (r.field === "interestTag" && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(value)) return c.fail(`keywordRules.${i}.value`, "invalid_tag")
    rules.push({ keyword, field: r.field, value })
  })
  const sk = body.stopKeywords
  let stop: string[] = []
  if (!Array.isArray(sk) || sk.length < 1 || sk.length > 20 || !sk.every(x => typeof x === "string" && x.trim() && x.trim().length <= 40)) c.fail("stopKeywords", "invalid_list")
  else stop = (sk as string[]).map(x => x.trim())
  if (!c.ok) return { ok: false, fields: c.errors }
  return {
    ok: true,
    settings: {
      businessHours: { tz: "Asia/Kolkata", days: [...(days as number[])].sort(), open: bh.open as string, close: bh.close as string },
      autoAck: { enabled: ack.enabled as boolean, ...ackT },
      afterHoursReply: { enabled: ah.enabled as boolean, ...ahT, minIntervalHours: mih as number },
      keywordRules: rules,
      stopKeywords: stop,
    },
  }
}

// ── business hours (IST) ──

const IST = 5.5 * 3600_000
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function isWithinBusinessHours(bh: BusinessHours, at: Date): boolean {
  const t = new Date(at.getTime() + IST)
  if (!bh.days.includes(t.getUTCDay())) return false
  const hm = `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`
  return hm >= bh.open && hm < bh.close
}

const ampm = (hm: string) => {
  const [h, m] = hm.split(":").map(Number)
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`
}

/** "Mon–Sat, 9:30 AM–6:30 PM" (consecutive days collapse to a range). */
export function formatBusinessHours(bh: BusinessHours): string {
  const days = [...bh.days].sort((a, b) => a - b)
  const runs: string[] = []
  let i = 0
  while (i < days.length) {
    let j = i
    while (j + 1 < days.length && days[j + 1] === days[j] + 1) j++
    runs.push(j - i >= 2 ? `${DAY_SHORT[days[i]]}–${DAY_SHORT[days[j]]}` : days.slice(i, j + 1).map(d => DAY_SHORT[d]).join(", "))
    i = j + 1
  }
  return `${runs.join(", ")}, ${ampm(bh.open)}–${ampm(bh.close)}`
}
