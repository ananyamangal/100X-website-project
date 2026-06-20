import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Shared template helpers (duplicated here to keep route self-contained)
const STATE_CONTEXT: Record<string, string> = {
  "Andhra Pradesh": "Andhra Pradesh's coastal geography and Krishna-Godavari delta create extensive mosquito habitats, particularly during the northeast monsoon.",
  "Arunachal Pradesh": "Arunachal Pradesh's forested hill terrain and river valleys face endemic vector-borne disease pressure requiring reliable public health equipment.",
  "Assam": "Assam's Brahmaputra floodplains experience significant seasonal flooding that creates extensive mosquito breeding conditions across its riverine districts.",
  "Bihar": "Bihar's Gangetic plains experience heavy monsoons from June to September, creating ideal breeding conditions in low-lying areas and seasonal flood zones.",
  "Chhattisgarh": "Chhattisgarh's forested terrain and numerous seasonal water bodies support endemic vector-borne disease pressure, particularly in tribal districts.",
  "Delhi": "Delhi's dense urban population and extensive drainage infrastructure require year-round vector control operations, peaking during the June–October monsoon.",
  "Goa": "Goa's tropical climate and high annual rainfall create sustained mosquito breeding conditions across coastal settlements and inland areas.",
  "Gujarat": "Gujarat's coastal zones and seasonal monsoon pattern drive significant mosquito activity across port cities and agricultural districts.",
  "Haryana": "Haryana's rapid urbanisation and agricultural canal network create significant mosquito habitats requiring coordinated municipal vector control.",
  "Himachal Pradesh": "Himachal Pradesh's river valleys and tourist infrastructure require effective vector control during summer and monsoon seasons.",
  "Jharkhand": "Jharkhand's tribal districts and forested zones face significant vector-borne disease pressure, particularly malaria.",
  "Karnataka": "Karnataka's diverse geography from the Western Ghats to the Deccan plateau creates varied vector control requirements across its districts.",
  "Kerala": "Kerala's exceptional rainfall creates year-round vector control requirements across densely populated residential and agricultural areas.",
  "Madhya Pradesh": "Madhya Pradesh's river systems and forested tribal regions create endemic vector control requirements across its large expanse.",
  "Maharashtra": "Maharashtra's mix of dense urban metros and agricultural districts creates varied vector control requirements at significant scale.",
  "Manipur": "Manipur's valley districts face endemic malaria pressure, requiring equipment suited to diverse terrain and climate conditions.",
  "Meghalaya": "Meghalaya's exceptionally high rainfall creates year-round vector breeding conditions requiring sustained operational capacity.",
  "Mizoram": "Mizoram's hilly terrain and dense forest cover require specialised vector control approaches for district health operations.",
  "Nagaland": "Nagaland's mountainous terrain and forested districts face endemic vector-borne disease requiring reliable health equipment.",
  "Odisha": "Odisha's cyclone-prone coastline and river delta create significant post-flood mosquito breeding conditions requiring rapid deployment capability.",
  "Punjab": "Punjab's extensive irrigation networks and paddy fields create significant mosquito habitats during the kharif growing season.",
  "Rajasthan": "Rajasthan's seasonal monsoon water bodies in an otherwise arid landscape create concentrated mosquito breeding grounds.",
  "Sikkim": "Sikkim's river valleys and tourist areas require effective vector control during peak visitor seasons.",
  "Tamil Nadu": "Tamil Nadu's two monsoon seasons create prolonged elevated mosquito activity periods requiring sustained operational capacity.",
  "Telangana": "Telangana's rapidly expanding urban areas and Hyderabad metropolitan region present significant public health management challenges.",
  "Tripura": "Tripura's humid subtropical climate and hilly terrain face sustained vector-borne disease pressure.",
  "Uttar Pradesh": "Uttar Pradesh, India's most populous state, faces significant vector-borne disease pressure across 75 districts, particularly after monsoon.",
  "Uttarakhand": "Uttarakhand's river valleys and pilgrimage routes require effective vector control during peak seasons.",
  "West Bengal": "West Bengal's Gangetic delta geography and dense population create significant vector control requirements across urban and rural areas.",
  "Chandigarh": "Chandigarh's planned urban zones and green spaces require regular mosquito control to maintain city-wide public health standards.",
  "Jammu & Kashmir": "Jammu and Kashmir's varied terrain requires vector control across diverse geographic and climate settings.",
  "Jammu and Kashmir": "Jammu and Kashmir's varied terrain requires vector control across diverse geographic and climate settings.",
}

function challengeText(category: string, org: string): string {
  switch (category) {
    case "Municipal": return `${org} coordinates routine and emergency vector control across municipal wards and public zones. The department required reliable, IS 14855-compliant fogging equipment procurable through established government channels.`
    case "Health": return `The department required IS 14855-compliant thermal fogging equipment for district-level vector control as part of national disease prevention programmes. Operational reliability and procurement compliance were primary selection criteria.`
    case "Railways": return `Station premises and operational areas require regular vector control to maintain public health standards for passengers and staff. Equipment needed to meet railway operational requirements with ease of deployment in busy public spaces.`
    case "Defence": return `The establishment required IS 14855-certified fogging machines for vector control across campus, residential quarters, and operational areas meeting defence procurement standards.`
    default: return `The organisation required IS 14855-certified fogging equipment meeting government procurement standards for routine public health operations with full OEM documentation support.`
  }
}

function solutionText(product: string, org: string): string {
  return `${org} procured the ${product} through the Government e-Marketplace (GeM), enabling compliant procurement with full OEM documentation from 100X Circle, including IS 14855 certificates, ISO 9001:2015 certification, and MSME/UDYAM registration.`
}

function implementationText(category: string): string {
  switch (category) {
    case "Municipal": return `Equipment was deployed across municipal wards for routine larviciding and adulticiding operations. Operators received product training covering operation, maintenance, and safe handling.`
    case "Health": return `Machines were integrated into the vector control programme for routine prevention and outbreak-response deployment with technical handover to department staff.`
    case "Railways": return `Equipment was deployed across station premises during scheduled maintenance periods, aligned with railway health and safety requirements.`
    default: return `Equipment was delivered and operationalised with technical support from the 100X Circle team, aligned with the organisation's existing health and safety protocols.`
  }
}

function resultsText(category: string, quantity?: number | null): string {
  const q = quantity ? ` ${quantity} unit${quantity > 1 ? "s" : ""} delivered.` : ""
  switch (category) {
    case "Municipal": return `The procurement strengthened operational vector control capability.${q} Equipment reliability and local support improved operational readiness with minimal familiarisation required from delivery.`
    case "Health": return `The department enhanced its vector control capacity with reliable, standards-compliant equipment.${q} IS 14855 certification ensured regulatory compliance across programme operations.`
    default: return `The organisation achieved improved operational readiness for vector control activities.${q} Full OEM documentation facilitated compliance requirements and ongoing manufacturer support assured continuity of operations.`
  }
}

function industryFromCategory(category: string): string {
  const MAP: Record<string, string> = {
    Municipal: "Municipal Public Health", Health: "State Health Department",
    Railways: "Indian Railways", Defence: "Defence",
    Agriculture: "Agriculture", Other: "Public Sector",
  }
  return MAP[category] || "Public Health"
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

function buildStudy(record: any): Record<string, any> {
  const org = record.organization || record.department || "Government Organisation"
  const state = record.state || ""
  const cat = record.category || "Other"
  const product = record.product || "Thermal Fogging Machine"
  const year = record.orderYear || new Date().getFullYear()
  const title = `${industryFromCategory(cat)} — ${org}, ${state}`

  return {
    title,
    slug: slugify(title),
    customer: org,
    department: record.department || "",
    state,
    city: "",
    industry: industryFromCategory(cat),
    productUsed: product,
    problem: challengeText(cat, org),
    solution: solutionText(product, org),
    results: resultsText(cat, record.quantity),
    background: (STATE_CONTEXT[state] || `${state} requires effective vector control operations across its municipalities and government facilities.`) + (year ? ` (${year})` : ""),
    implementation: implementationText(cat),
    whyChosen: "100X Circle was selected as a GeM-registered OEM manufacturing IS 14855-certified fogging machines in India. MSME registration, ISO 9001:2015 certification, and established government supply experience provided procurement confidence.",
    testimonial: "",
    images: record.images || [],
    videos: [],
    pdfUrl: "",
    published: false,
    isSample: false,
    autoGenerated: true,
    generatedMethod: "template",
    sourceRecordId: String(record._id),
    sourceCategory: cat,
    orderYear: year,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function POST() {
  try {
    const client = await clientPromise
    const db = client.db()

    // Load all past performance records
    const records = await db.collection("gov_past_performance").find({}).toArray()

    // Load existing auto-generated case studies (by sourceRecordId)
    const existing = await db.collection("case_studies").find({ sourceRecordId: { $exists: true } }).toArray()
    const existingIds = new Set(existing.map((s: any) => s.sourceRecordId))

    const toGenerate = records.filter((r) => !existingIds.has(String(r._id)))

    if (toGenerate.length === 0) {
      return NextResponse.json({ ok: true, generated: 0, skipped: records.length, message: "All records already have case studies." })
    }

    const docs = toGenerate.map((r) => buildStudy(r))

    if (docs.length > 0) {
      await db.collection("case_studies").insertMany(docs)
    }

    return NextResponse.json({
      ok: true,
      generated: docs.length,
      skipped: records.length - toGenerate.length,
      total: records.length,
      message: `Generated ${docs.length} draft case ${docs.length === 1 ? "study" : "studies"}. Review and publish from the Case Studies tab.`,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
