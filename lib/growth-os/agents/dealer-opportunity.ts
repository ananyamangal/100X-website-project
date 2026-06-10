import clientPromise from "@/lib/mongodb"
import type { Db } from "mongodb"
import {
  classifyText, taxonomyMatchRegexSource, recencyScore, daysSince,
  finalizeAndPersist, type RawRow,
} from "@/lib/growth-os/opportunity-core"
import { DEALER_WEIGHTS, FIT_TIER_VALUE } from "@/lib/growth-os/opportunity-config"

const AGENT = "Dealer Opportunity Engine"
const FIELDS = ["product_name", "product_desc", "category_name"]
const fmtCr = (n: number) => `₹${((n || 0) / 1e7).toFixed(3)} Cr`

interface DealerAgg {
  name: string; tierA: boolean; contracts: number; gmv: number; last: string | null
  states: Set<string>; products: Set<string>; buyers: Set<string>
  phone: string | null; gst: string | null; msme: string | null
}

/**
 * Dealer Opportunity Engine — equipment SELLERS (Tier A/B).
 * Objective: expand the 100X dealer network + OEM authorizations.
 * A seller only qualifies via a genuine equipment match (config taxonomy),
 * so consumer/medical/cleaning false positives never enter the list.
 */
export async function runDealerOpportunityAgent() {
  const db: Db = (await clientPromise).db()
  const re = new RegExp(taxonomyMatchRegexSource(), "i")
  const rows = await db.collection("gem_contracts")
    .find({ $or: FIELDS.map((f) => ({ [f]: { $regex: re } })) })
    .toArray()

  const dealers = new Map<string, DealerAgg>()
  for (const r of rows) {
    const text = FIELDS.map((f) => (r as Record<string, unknown>)[f] || "").join("  ")
    const cls = classifyText(text)
    if (cls !== "A" && cls !== "B") continue // dealer stream = equipment sellers only
    const name = r.seller_name_canonical as string
    if (!name) continue
    const d = dealers.get(name) || {
      name, tierA: false, contracts: 0, gmv: 0, last: null,
      states: new Set<string>(), products: new Set<string>(), buyers: new Set<string>(),
      phone: null, gst: null, msme: null,
    }
    if (cls === "A") d.tierA = true
    d.contracts++
    d.gmv += (r.contract_value_num as number) || 0
    const cd = r.contract_date_dt as string | null
    if (cd && (!d.last || cd > d.last)) d.last = cd
    if (r.seller_state) d.states.add(String(r.seller_state))
    if (r.product_name) d.products.add(String(r.product_name).slice(0, 80))
    if (r.org_name && r.org_name !== "N/A") d.buyers.add(String(r.org_name))
    d.phone = d.phone || (r.seller_phone as string) || null
    d.gst = d.gst || (r.seller_gst as string) || null
    d.msme = d.msme || (r.seller_msme_category as string) || null
    dealers.set(name, d)
  }

  const all = Array.from(dealers.values())
  const logMaxGmv = Math.log1p(Math.max(...all.map((d) => d.gmv), 1))

  const rawRows: RawRow[] = all.map((d) => {
    const fit = d.tierA ? FIT_TIER_VALUE.A : FIT_TIER_VALUE.B
    const vol = Math.log1p(d.gmv) / logMaxGmv
    const days = daysSince(d.last)
    const rec = recencyScore(days)
    const contactability = (d.phone ? 0.5 : 0) + (d.gst ? 0.3 : 0) + (d.msme ? 0.2 : 0)
    const score = Math.round(
      (DEALER_WEIGHTS.fit * fit + DEALER_WEIGHTS.volume * vol +
        DEALER_WEIGHTS.recency * rec + DEALER_WEIGHTS.contact * contactability) * 10
    ) / 10

    // OEM authorization probability (bonus signal): strong fit + recent + MSME + volume sweet spot
    const msmeBoost = d.msme && /micro|small|medium/i.test(d.msme) ? 1 : 0.4
    const volumeSweet = vol > 0.25 && vol < 0.85 ? 1 : 0.5
    const oemAuthProbability = Math.round(Math.min(100, 40 * fit + 25 * rec + 20 * msmeBoost + 15 * volumeSweet))

    const tierLabel = d.tierA ? "Tier A (fogging/sprayer machine)" : "Tier B (agri/vector equipment)"
    const productSample = Array.from(d.products).slice(0, 2).join(" | ")
    return {
      entityKey: d.name,
      entityName: d.name,
      score,
      topSignal: d.tierA,
      hasContact: !!d.phone,
      geography: Array.from(d.states)[0] || null,
      reason: `${tierLabel} — fit ${Math.round(fit * 100)}%, ${fmtCr(d.gmv)} GeM, OEM-intent ${oemAuthProbability}%${days != null ? `, last active ${days}d ago` : ""}`,
      fitExplanation: d.tierA
        ? `Already sells fogging/sprayer machines on GeM: ${productSample}`
        : `Sells adjacent agri machinery in the 100X range: ${productSample}`,
      gemActivity: `${d.contracts} contract${d.contracts > 1 ? "s" : ""}, ${fmtCr(d.gmv)}${days != null ? `, last ${days}d ago` : ""}${d.states.size ? `, ${Array.from(d.states).join("/")}` : ""}`,
      contact: { phone: d.phone, gst: d.gst, msme: d.msme },
      nextAction: d.tierA
        ? "OEM authorization proposal + dealer onboarding (proven fogging/sprayer seller)"
        : "Introduce 100X fogging/sprayer range to this agri-equipment channel",
      extra: { tier: d.tierA ? "A" : "B", oemAuthProbability, buyersServed: Array.from(d.buyers).slice(0, 3) },
    }
  })

  const result = await finalizeAndPersist(db, "dealer", rawRows, AGENT)
  return { segment: "dealer" as const, considered: all.length, ...result }
}
