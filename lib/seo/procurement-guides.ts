/**
 * Procurement guides (SEO/AEO program item E5, 2026-10). New pages only.
 *
 * Cannibalisation rule (docs/AGENCY_PROTECTED.md + protected_pages_union.csv
 * + top_queries_union.csv): the four requested topics were checked against
 * pages that already rank.
 *  - "How to buy a fogging machine on GeM": already targeted by
 *    /gem-approved-fogging-machine-oem (Tier A, "fogging machine on gem" pos ~3),
 *    /knowledge/government-procurement-guide (Tier A) and
 *    /blog/how-to-buy-fogging-machines-on-gem-portal-a-complete-guide (Tier B).
 *    -> NOT a page of its own: a step-by-step section inside the delivery /
 *    acceptance checklist below, linking prominently to those pages.
 *  - "IS 14855 explained": /is-14855-fogging-machine and
 *    /blog/is-14855-government-fogging-machine-tenders-india (both Tier B).
 *    -> a procurement-officer section inside the tender specification checklist.
 *  - "Thermal vs cold for municipalities": /thermal-vs-cold-fogging-machine
 *    (Tier A) and several Tier A blogs rank at positions 1-3.
 *    -> a short "what to write / what to check" section in each page, linking
 *    to the comparison page.
 *  - "Specifications checklist for tenders": no page targets it -> page 1.
 *  So two new URLs, each aimed at a query no existing page targets
 *  ("tender specification checklist", "delivery inspection / acceptance checklist").
 *
 * Facts: docs/FACTS.md and product DB specs (2026-10-09). Unknowns are said so.
 * Inline links use [text](/path) and are rendered by components/guides/GuidePage.tsx.
 */

export interface GuideSection {
  h2: string
  paragraphs?: string[]
  list?: string[]
  ordered?: boolean
  /** Optional closing paragraphs after the list. */
  after?: string[]
}

export interface GuideFaq {
  q: string
  a: string
}

export interface GuidePageDef {
  path: string
  title: string
  description: string
  h1: string
  breadcrumbLabel: string
  summary: string
  datePublished: string
  dateModified: string
  sections: GuideSection[]
  faqs: GuideFaq[]
  related: { href: string; label: string }[]
}

const D = "2026-10-09"

export const TENDER_SPEC_CHECKLIST: GuidePageDef = {
  path: "/fogging-machine-tender-specification-checklist",
  title: "Fogging Machine Specification Checklist for Tenders | 100X",
  description:
    "What to write into a fogging machine tender or GeM bid: machine type, tanks, output, droplet size, power, IS 14855, documents, warranty, spares and training.",
  h1: "Fogging Machine Specifications Checklist for Tenders",
  breadcrumbLabel: "Tender Specification Checklist",
  summary:
    "A fogging machine tender should state the machine type (thermal or cold/ULV), the form factor, tank capacities, output rate, droplet-size range, power and start system, the standard the machine must meet (IS 14855 for thermal foggers), the documents bidders must upload, warranty, spares and operator training. The checklist below turns each point into a line you can copy.",
  datePublished: D,
  dateModified: D,
  sections: [
    {
      h2: "Why the specification decides what you receive",
      paragraphs: [
        "In a tender or a GeM bid, the lowest compliant offer usually wins. If the specification is vague, a machine that is cheaper but wrong for the job can still be compliant. A clear specification protects the department: it lets every bidder quote the same thing, and it gives the inspection team a list to check on delivery.",
        "Write each requirement so it can be checked: a number with a unit, a yes/no feature, or a named document. Avoid brand names and avoid copying one maker's brochure word for word, which narrows competition.",
      ],
    },
    {
      h2: "The checklist",
      paragraphs: ["Copy the lines that apply and fill in your own values."],
      list: [
        "Application: outdoor mosquito and vector control, indoor disinfection, or both. This decides thermal, cold (ULV) or dual-mode.",
        "Form factor: hand-carried, vehicle-mountable, or hand-held mini fogger. For vehicle units, name the vehicle type it must fit (for example a pickup or other flat-bed vehicle).",
        "Chemical (solution) tank capacity in litres, and fuel tank capacity for engine or pulse-jet machines. For reference, our hand-carried thermal models carry 5.5-7 litre chemical tanks and the vehicle-mounted [100XDB400](/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400) carries 100 litres.",
        "Output rate in litres per hour, as a range if the machine is adjustable.",
        "Droplet size range in microns, and whether it is adjustable. Ask bidders to state the figure for the quoted model, not a generic range.",
        "Power and start: pulse-jet with 12V battery start, manual start, petrol engine, mains electricity (230-240V AC for electric ULV units) or gas.",
        "Tank and body material: HDPE, stainless steel or other, based on the chemicals you will use.",
        "Formulations: oil-based, water-based or both. Thermal fogging normally uses oil-based carriers; check the label of the insecticide you plan to buy.",
        "Weight limit for hand-carried units, so one operator can work a full shift.",
        "Standard and marking: for thermal fogging machines, IS 14855 (see the section below). State whether you need the ISI mark or a test report.",
        "Documents to upload with the bid: technical datasheet, test report against the named standard, OEM authorization letter if the bidder is a reseller, warranty terms, and GST registration.",
        "Warranty period and what it covers, and the supplier's service contact.",
        "Spares: a starter kit of wear parts with the machine, and the time to dispatch spares after an order.",
        "Training: an operator demonstration on delivery, and a printed manual.",
        "Delivery: consignee address, delivery period, and the acceptance test you will run (see our [delivery and acceptance checklist](/fogging-machine-delivery-inspection-checklist)).",
      ],
      ordered: true,
    },
    {
      h2: "IS 14855 explained for procurement officers",
      paragraphs: [
        "IS 14855 is the Indian Standard that many government tenders in India cite for thermal fogging machines. Naming it in the specification sets a common baseline for construction, safety and performance, and it gives you a document to ask for: a test report against the standard, or the BIS licence details where the machine carries the ISI mark.",
        "What to ask bidders for: the test report for the quoted model, and, if the ISI mark is required, the BIS licence number so you can verify it with BIS. Check that the model on the report is the model in the bid.",
        "Our position: 100X Circle builds its thermal fogging machines to the requirements of IS 14855 and shares the test report on request. Our HDPE-tank models 100XHM20 and 100XHBL22 carry the ISI mark. Licence and certificate numbers are not published on this page; ask us and we will send them with the quotation.",
        "For the standard itself and the models we build to it, see [IS 14855 fogging machines](/is-14855-fogging-machine) and our article on [IS 14855 in government fogging machine tenders](/blog/is-14855-government-fogging-machine-tenders-india).",
      ],
    },
    {
      h2: "Thermal or cold: write the right one into the specification",
      paragraphs: [
        "A thermal fogger makes a dense, visible fog for outdoor work such as streets, drains and parks. A cold (ULV) fogger makes fine droplets without heat for indoor and sensitive spaces such as hospitals and food facilities. If the department needs both, a dual-mode machine such as the [100XTFS50](/thermal-and-cold-fogging-machine-100xtfs50) can be specified instead of two machines.",
        "For a full comparison, read [thermal vs cold fogging machine](/thermal-vs-cold-fogging-machine).",
      ],
    },
    {
      h2: "Common gaps we see in fogging machine tenders",
      list: [
        "No droplet-size or output figure, so any machine qualifies.",
        "A standard is named but no document is asked for, so compliance cannot be checked.",
        "No spares or training clause, so the machines stand idle after the first breakdown.",
      ],
    },
  ],
  faqs: [
    {
      q: "What should a fogging machine tender specification include?",
      a: "The machine type (thermal, cold/ULV or dual-mode), form factor, chemical and fuel tank capacities, output rate, droplet-size range, power and start system, materials, the standard to meet (IS 14855 for thermal foggers), the documents bidders must upload, warranty, spares and operator training.",
    },
    {
      q: "Which standard applies to thermal fogging machines in India?",
      a: "Many government tenders cite IS 14855 for thermal fogging machines. Ask bidders for a test report against IS 14855 for the quoted model, and for the BIS licence number if you require the ISI mark.",
    },
    {
      q: "Do 100X Circle machines meet IS 14855?",
      a: "100X Circle builds its thermal fogging machines to the requirements of IS 14855 and shares the test report on request. The HDPE-tank models 100XHM20 and 100XHBL22 carry the ISI mark.",
    },
    {
      q: "What documents can 100X Circle provide for a tender?",
      a: "A technical datasheet, the IS 14855 test report on request, warranty terms, a GST invoice on supply, and an OEM authorization letter for resellers bidding with our machines. We respond within 24 hours on working days.",
    },
  ],
  related: [
    { href: "/is-14855-fogging-machine", label: "IS 14855 fogging machines" },
    { href: "/gem-approved-fogging-machine-oem", label: "Fogging machines on GeM" },
    { href: "/oem-authorization-letter", label: "OEM authorization letter" },
    { href: "/gem-tender-support", label: "GeM tender support for dealers" },
    { href: "/fogging-machine-buying-guide", label: "Fogging machine buying guide" },
    { href: "/fogging-machine-delivery-inspection-checklist", label: "Delivery and acceptance checklist" },
    { href: "/products", label: "All fogging machines" },
  ],
}

export const DELIVERY_ACCEPTANCE_CHECKLIST: GuidePageDef = {
  path: "/fogging-machine-delivery-inspection-checklist",
  title: "Fogging Machine Delivery Inspection Checklist | 100X Circle",
  description:
    "Checklist for government buyers receiving fogging machines: match the order, check parts and documents, run a start-up test, train operators, accept on GeM.",
  h1: "Fogging Machine Delivery and Acceptance Checklist",
  breadcrumbLabel: "Delivery and Acceptance Checklist",
  summary:
    "When fogging machines arrive, check the delivery against the order before you accept it: model and quantity, serial numbers, accessories and manuals, markings and documents, a start-up and fogging test, and operator training. On GeM the consignee then issues the receipt and acceptance certificates so that the seller can be paid.",
  datePublished: D,
  dateModified: D,
  sections: [
    {
      h2: "Where acceptance fits in a GeM purchase, step by step",
      paragraphs: [
        "Acceptance is the last step of the purchase, and it is where problems are cheapest to fix. The usual order of steps for a department buying fogging machines on the Government e-Marketplace (GeM) is:",
      ],
      list: [
        "Define the need and write the specification (see our [tender specification checklist](/fogging-machine-tender-specification-checklist)).",
        "Find the product on GeM and choose the buying route the GeM rules allow for the order value: direct purchase, L1 purchase or a bid / reverse auction.",
        "Place the order or award the contract; the seller ships to the consignee named in it.",
        "The consignee inspects the goods and issues the Provisional Receipt Certificate (PRC) on GeM.",
        "After inspection and any test, the consignee issues the Consignee Receipt and Acceptance Certificate (CRAC).",
        "The buyer's paying authority releases payment under GeM terms.",
      ],
      ordered: true,
      after: [
        "GeM's thresholds and timelines change, so check the current GeM terms for your order. For the buying side in detail, see our [government procurement guide](/knowledge/government-procurement-guide), [fogging machines on GeM](/gem-approved-fogging-machine-oem) and [how to buy fogging machines on the GeM portal](/blog/how-to-buy-fogging-machines-on-gem-portal-a-complete-guide).",
      ],
    },
    {
      h2: "On delivery: match the consignment to the order",
      list: [
        "Model and quantity match the contract or GeM order, line by line.",
        "Packaging is intact; note any damage on the delivery receipt before signing.",
        "Record the serial number of each machine against the order.",
        "Tanks, caps, hoses, nozzle and frame are fitted and undamaged.",
        "Battery and charger are included where the model uses them (for example 12V battery-start pulse-jet machines).",
        "Tool kit, spare starter kit (if the contract asks for one), operating manual and warranty card are in the box.",
        "Markings required by the contract are present, such as the ISI mark where it was specified.",
        "Documents: tax invoice, delivery challan, warranty certificate, and the test report or other documents the contract names.",
      ],
    },
    {
      h2: "Function test before you accept",
      paragraphs: [
        "Run the test outdoors with the supplier's representative or a trained operator, wearing the protective equipment the manual lists. Test with fuel and carrier only, not insecticide.",
      ],
      list: [
        "The machine starts by the method stated in the specification (battery, manual, engine or mains) within a few attempts.",
        "It runs steadily for several minutes without fuel or liquid leaks.",
        "The fog or mist is produced at the rated setting, and the flow control works.",
        "It stops by the shutdown procedure in the manual, and the operator can repeat the start.",
      ],
    },
    {
      h2: "Thermal and cold machines: what to check on each",
      paragraphs: [
        "For thermal foggers used in municipal drives, look for a dense, visible fog at the nozzle, a heat guard in place, and no fuel smell around tank joints. For cold (ULV) machines, check that the droplet-size adjustment moves through its range and that electric units run on your site's supply (our electric ULV models use 230-240V single-phase AC). Engine-driven cold foggers, such as the [100XMCF42](/products/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1), should idle and spray without stalling.",
        "Not sure which type the department should be buying? See [thermal vs cold fogging machine](/thermal-vs-cold-fogging-machine).",
      ],
    },
    {
      h2: "Training, spares and records",
      list: [
        "Operators are shown how to start, run, flush and stop the machine, and how to mix and load the formulation safely.",
        "The store keeps the manual, the serial-number list and the warranty documents together.",
        "A maintenance routine is agreed (see our [maintenance guide](/knowledge/fogging-machine-maintenance-guide)) and the spare-parts contact is recorded. We dispatch [spare parts](/spare-parts) in 24-48 hours.",
        "Any shortfall is written on the receipt and sent to the supplier before the acceptance certificate is issued.",
      ],
    },
  ],
  faqs: [
    {
      q: "What should we check when fogging machines are delivered?",
      a: "Match model and quantity to the order, record serial numbers, check tanks, nozzle, battery, charger, tools, manual and warranty card, check any required marking such as the ISI mark, collect the invoice and named documents, then run a start-up and fogging test with fuel and carrier only.",
    },
    {
      q: "What are PRC and CRAC on GeM?",
      a: "On GeM the consignee issues a Provisional Receipt Certificate (PRC) when the goods arrive, and a Consignee Receipt and Acceptance Certificate (CRAC) after inspection and acceptance. Payment follows under GeM terms.",
    },
    {
      q: "Should the acceptance test use insecticide?",
      a: "No. Test outdoors with fuel and the carrier liquid only, with the operator wearing the protective equipment listed in the manual.",
    },
    {
      q: "Does 100X Circle train operators on delivery?",
      a: "We share the operating manual, operator demo videos and maintenance guidance with every supply. If you need on-site training, ask for it when you order; we confirm what is possible for your location with the quotation.",
    },
    {
      q: "How fast are spare parts dispatched?",
      a: "Spare parts for 100X Circle fogging machines are dispatched in 24-48 hours. More than 120 parts are listed on our spare parts page.",
    },
  ],
  related: [
    { href: "/fogging-machine-tender-specification-checklist", label: "Tender specification checklist" },
    { href: "/knowledge/government-procurement-guide", label: "Government procurement guide" },
    { href: "/gem-approved-fogging-machine-oem", label: "Fogging machines on GeM" },
    { href: "/thermal-vs-cold-fogging-machine", label: "Thermal vs cold fogging machine" },
    { href: "/knowledge/fogging-machine-maintenance-guide", label: "Fogging machine maintenance guide" },
    { href: "/spare-parts", label: "Spare parts" },
    { href: "/past-performance-government", label: "Government past performance" },
  ],
}

export const PROCUREMENT_GUIDES: readonly GuidePageDef[] = [TENDER_SPEC_CHECKLIST, DELIVERY_ACCEPTANCE_CHECKLIST]

/** Sitemap rows with honest lastmod (the guide's own dateModified). */
export function procurementGuideSitemapEntries(siteUrl: string) {
  return PROCUREMENT_GUIDES.map((g) => ({
    url: `${siteUrl}${g.path}`,
    lastModified: new Date(`${g.dateModified}T00:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))
}

/** All visible words on the page body (summary + sections + FAQs), for the word-count test. */
export function guideWordCount(g: GuidePageDef): number {
  const text = [
    g.summary,
    ...g.sections.flatMap((s) => [s.h2, ...(s.paragraphs ?? []), ...(s.list ?? []), ...(s.after ?? [])]),
    ...g.faqs.flatMap((f) => [f.q, f.a]),
  ]
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  return text.split(/\s+/).filter(Boolean).length
}

/** Every internal link target used in the guide body and related list. */
export function guideLinks(g: GuidePageDef): string[] {
  const out = new Set<string>()
  const re = /\]\((\/[^)\s]*)\)/g
  for (const s of g.sections) {
    for (const t of [...(s.paragraphs ?? []), ...(s.list ?? []), ...(s.after ?? [])]) {
      for (const m of t.matchAll(re)) out.add(m[1])
    }
  }
  for (const r of g.related) out.add(r.href)
  return [...out]
}
