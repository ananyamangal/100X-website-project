/**
 * Answer-first summaries (SEO/AEO program item E3, 2026-10).
 *
 * One 40-60 word plain-English answer per key page, shown as a NEW visible
 * block near the top of the page (components/seo/AnswerSummary.tsx) with a
 * "Last updated" date and an organisation byline. The block never replaces a
 * title, H1 or existing paragraph.
 *
 * Facts: docs/FACTS.md and each product's own database spec (checked
 * 2026-10-09). Published site claims may be used (owner rule 2026-10-09); IS 14855 wording follows
 * FACTS ("built to the requirements of IS 14855; test report on request");
 * ISI only on the two models the owner confirmed (100XHM20, 100XHBL22).
 *
 * Keys are URL paths exactly as served (no trailing slash).
 */

export interface AnswerSummaryEntry {
  summary: string
  /** YYYY-MM-DD: the day this summary text was written or last checked. */
  updated: string
}

const D = "2026-10-09"

export const ANSWER_SUMMARIES: Readonly<Record<string, AnswerSummaryEntry>> = {
  // ── Key topic pages ───────────────────────────────────────────────────
  "/gem-approved-fogging-machine-oem": {
    summary:
      "100X Circle Pvt Ltd manufactures thermal and cold fogging machines in Gurugram and sells them on the Government e-Marketplace (GeM). Government buyers can order our listed models on GeM. Resellers can ask us for an OEM authorization letter to offer our machines in GeM bids; a GeM Seller ID is optional. We reply within 24 hours on working days.",
    updated: D,
  },
  "/is-14855-fogging-machine": {
    summary:
      "IS 14855 is the Indian Standard that many government tenders cite for thermal fogging machines. 100X Circle builds its thermal foggers to the requirements of IS 14855, and the test report is available on request. Our HDPE-tank models 100XHM20 and 100XHBL22 carry the ISI mark. Ask for these documents together with your quotation.",
    updated: D,
  },
  "/thermal-vs-cold-fogging-machine": {
    summary:
      "Thermal fogging heats the formulation into a dense, visible fog that drifts into vegetation, drains and open ground, so it suits outdoor mosquito control. Cold (ULV) fogging breaks the liquid into fine droplets without heat, which suits indoor disinfection, hospitals and food facilities. Teams that need both can use the dual-mode 100XTFS50 machine.",
    updated: D,
  },
  "/fogging-machine-government-procurement": {
    summary:
      "Government departments in India can buy 100X Circle fogging machines through the Government e-Marketplace (GeM) or through their own tenders. We supply thermal, cold and vehicle-mounted models, issue OEM authorization letters to resellers, and share technical documents and the IS 14855 test report with quotations. We respond within 24 hours on working days.",
    updated: D,
  },

  // ── Product landing pages ─────────────────────────────────────────────
  "/thermal-and-cold-fogging-machine-100xtfs50": {
    summary:
      "The 100XTFS50 is a pulse-jet fogging machine that runs in thermal or cold mode. It has a 7-litre chemical tank and a 7-litre water tank, push-button start from a 12V battery, an output rate of 50-100 litres per hour and an empty weight of 8 kg. It is available on GeM for government buyers.",
    updated: D,
  },
  "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400": {
    summary:
      "The 100XDB400 is a double-barrel, vehicle-mountable pulse-jet thermal fogging machine for municipal vector control. It carries a 100-litre stainless steel chemical tank and a 16-litre fuel tank, outputs 80-100 litres per hour, starts electrically from the vehicle's 12V battery and is run by wired remote from the driver's cabin.",
    updated: D,
  },
  "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20": {
    summary:
      "The 100XSSMA20 is a hand-carried pulse-jet thermal fogging machine with a 7-litre stainless steel chemical tank, a 1.5-litre fuel tank, 12V electric auto-start and an output of up to 40 litres per hour. The stainless steel tank resists corrosion from chemical formulations. It is available on GeM for government buyers.",
    updated: D,
  },

  // ── Product pages (/products/<slug>) ──────────────────────────────────
  "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde": {
    summary:
      "The 100XHM20 is an ISI-marked, hand-carried pulse-jet thermal fogging machine with HDPE tanks: a 5.5-litre solution tank and a 2-litre fuel tank. It has manual start, an adjustable output of 30-40 litres per hour and weighs 7.5 kg. It is used for municipal mosquito and vector control and is available on GeM.",
    updated: D,
  },
  "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75": {
    summary:
      "The 100XHBL22 is an ISI-marked, hand-carried pulse-jet thermal fogging machine with HDPE tanks: a 6-litre solution tank and a 2-litre fuel tank. It has manual start with replaceable dry-cell batteries, an adjustable output of 30-40 litres per hour and weighs 7.5 kg. It is available on GeM for government buyers.",
    updated: D,
  },
  "/products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1": {
    summary:
      "The 100XMCF42 is a cold fogger driven by a 2-stroke petrol engine. It needs no heat source, carries a 14-litre chemical tank, has an adjustable droplet size of 20-100 microns and sprays 8-16 metres. It accepts water-based and oil-based formulations and suits disinfection and vector control. It is available on GeM.",
    updated: D,
  },
  "/products/ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv": {
    summary:
      "The 100XULV22 is an electric ULV cold fogger that runs on 230V single-phase AC power. It has a 7-litre chemical tank, a counter-rotating vortex nozzle, adjustable droplets of 0.5-30 microns and a spray distance of 20-40 feet. With no heat, it suits disinfection in hospitals and food facilities. It is available on GeM.",
    updated: D,
  },
  "/products/100xulvss10-5e46c5": {
    summary:
      "The 100XULVSS10 is an electric ULV cold fogger and mist sprayer that runs on 240V single-phase AC power. It has a 5-litre chemical tank, one counter-rotating vortex nozzle, adjustable droplets of 0.5-30 microns and a spray distance of 20-40 feet. It takes water-based and oil-based liquids and suits disinfection work.",
    updated: D,
  },
  "/products/mini-fogger-100xbf102-2d9887": {
    summary:
      "The 100XBF102 mini fogger is a 1.2 kg hand-held fogger that runs on butane gas and starts with an ignition switch. It has a 2.5-litre PE chemical tank and an output of 2.5 litres per hour, which suits mosquito control in small areas such as gardens, lawns, farmhouses and warehouses.",
    updated: D,
  },
}

export function getAnswerSummary(path: string): AnswerSummaryEntry | undefined {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path
  return ANSWER_SUMMARIES[clean]
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** "2026-10-09" -> "9 October 2026" (no locale/timezone dependence). */
export function formatUpdated(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!m) return isoDate
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}
