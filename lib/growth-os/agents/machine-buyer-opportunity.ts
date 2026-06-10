import clientPromise from "@/lib/mongodb"
import type { Db } from "mongodb"
import {
  classifyText, taxonomyMatchRegexSource, recencyScore, daysSince,
  finalizeAndPersist, type RawRow, type FitClass,
} from "@/lib/growth-os/opportunity-core"
import {
  BUYER_WEIGHTS, BUYER_INTENT_VALUE, BUYER_TYPE_PATTERN,
  BUYER_TYPE_MATCH_VALUE, BUYER_TYPE_DEFAULT_VALUE,
} from "@/lib/growth-os/opportunity-config"

const AGENT = "Machine Buyer Opportunity Engine"
const FIELDS = ["product_name", "product_desc", "category_name"]
const fmtCr = (n: number) => `₹${((n || 0) / 1e7).toFixed(3)} Cr`
const BUYER_TYPE_RE = new RegExp(BUYER_TYPE_PATTERN, "i")

const SIGNAL_LABEL: Record<"chemical" | "machine" | "equipment", string> = {
  chemical: "fogging chemicals / ULV", machine: "fogging/sprayer machine", equipment: "agri/vector equipment",
}
function intentKey(cls: FitClass): "chemical" | "machine" | "equipment" {
  return cls === "CHEM" ? "chemical" : cls === "A" ? "machine" : "equipment"
}

interface BuyerAgg {
  key: string; dept: string | null; bestIntent: number; signals: Set<string>
  contracts: number; gmv: number; last: string | null
  state: string | null; email: string | null; phone: string | null; products: Set<string>
}

/**
 * Machine Buyer Opportunity Engine — government BUYERS of fogging chemicals,
 * ULV, larvicides, and fogging/sprayer machines.
 * Objective: sell machines directly (different buying journey from dealers —
 * kept as a separate ranking, never mixed).
 */
export async function runMachineBuyerOpportunityAgent() {
  const db: Db = (await clientPromise).db()
  const re = new RegExp(taxonomyMatchRegexSource(), "i")
  const rows = await db.collection("gem_contracts")
    .find({ $or: FIELDS.map((f) => ({ [f]: { $regex: re } })) })
    .toArray()

  const buyers = new Map<string, BuyerAgg>()
  for (const r of rows) {
    const text = FIELDS.map((f) => (r as Record<string, unknown>)[f] || "").join("  ")
    const cls = classifyText(text)
    if (!cls) continue
    const org = r.org_name as string | undefined
    const key = (org && org !== "N/A") ? org : (r.dept_name as string) || (r.office_name as string)
    if (!key) continue
    const ik = intentKey(cls)
    const b = buyers.get(key) || {
      key, dept: (r.dept_name as string) || null, bestIntent: 0, signals: new Set<string>(),
      contracts: 0, gmv: 0, last: null, state: null, email: null, phone: null, products: new Set<string>(),
    }
    b.bestIntent = Math.max(b.bestIntent, BUYER_INTENT_VALUE[ik])
    b.signals.add(SIGNAL_LABEL[ik])
    b.contracts++
    b.gmv += (r.contract_value_num as number) || 0
    const cd = r.contract_date_dt as string | null
    if (cd && (!b.last || cd > b.last)) b.last = cd
    b.state = b.state || (r.buyer_state as string) || (r.seller_state as string) || null
    b.email = b.email || (r.buyer_email as string) || null
    b.phone = b.phone || (r.buyer_contact as string) || null
    if (r.product_name) b.products.add(String(r.product_name).slice(0, 80))
    buyers.set(key, b)
  }

  const rawRows: RawRow[] = Array.from(buyers.values()).map((b) => {
    const intent = b.bestIntent
    const typeFit = BUYER_TYPE_RE.test(`${b.key} ${b.dept || ""}`) ? BUYER_TYPE_MATCH_VALUE : BUYER_TYPE_DEFAULT_VALUE
    const days = daysSince(b.last)
    const rec = recencyScore(days)
    const contactability = (b.phone ? 0.5 : 0) + (b.email ? 0.3 : 0) + (b.state ? 0.2 : 0)
    const score = Math.round(
      (BUYER_WEIGHTS.intent * intent + BUYER_WEIGHTS.typeFit * typeFit +
        BUYER_WEIGHTS.recency * rec + BUYER_WEIGHTS.contact * contactability) * 10
    ) / 10

    const buysChemical = b.signals.has(SIGNAL_LABEL.chemical)
    const productSample = Array.from(b.products).slice(0, 2).join(" | ")
    return {
      entityKey: b.key,
      entityName: b.key,
      score,
      topSignal: intent >= BUYER_INTENT_VALUE.machine, // chemical or proven machine buyer
      hasContact: !!(b.phone || b.email),
      geography: b.state,
      reason: `Buying intent ${Math.round(intent * 100)}% (${Array.from(b.signals).join(", ")})${days != null ? `, last ${days}d ago` : ""}`,
      fitExplanation: buysChemical
        ? `Procures fogging chemicals/ULV — needs machines to apply them: ${productSample}`
        : `Already procures fogging/sprayer equipment on GeM: ${productSample}`,
      gemActivity: `${b.contracts} contract${b.contracts > 1 ? "s" : ""}, ${fmtCr(b.gmv)}${days != null ? `, last ${days}d ago` : ""}`,
      contact: { phone: b.phone, email: b.email },
      nextAction: buysChemical
        ? "Direct machine sale — buys fogging chemicals, likely lacks/needs machines"
        : "Direct machine sale — already operates machines (repeat / AMC / upgrade)",
      extra: { dept: b.dept, signals: Array.from(b.signals), intentPct: Math.round(intent * 100) },
    }
  })

  const result = await finalizeAndPersist(db, "machine_buyer", rawRows, AGENT)
  return { segment: "machine_buyer" as const, considered: buyers.size, ...result }
}
