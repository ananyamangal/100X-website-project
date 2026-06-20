import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { callLLM, ALL_PROVIDERS_UNAVAILABLE } from "@/lib/llm-client"

// ── State-specific geographic + epidemiological context ───────────────────────
const STATE_CONTEXT: Record<string, string> = {
  "Andhra Pradesh": "Andhra Pradesh's coastal geography and Krishna-Godavari delta create extensive mosquito habitats across deltaic districts, particularly during the northeast monsoon.",
  "Arunachal Pradesh": "Arunachal Pradesh's forested hill terrain and river valleys face endemic vector-borne disease pressure requiring reliable public health equipment for district health operations.",
  "Assam": "Assam's Brahmaputra floodplains experience significant seasonal flooding that creates extensive mosquito breeding conditions across its riverine districts.",
  "Bihar": "Bihar's Gangetic plains experience heavy monsoons from June to September, creating ideal breeding conditions in low-lying areas and seasonal flood zones across the state.",
  "Chhattisgarh": "Chhattisgarh's forested terrain and numerous seasonal water bodies support endemic vector-borne disease pressure, particularly in tribal districts during and after monsoon.",
  "Delhi": "Delhi's dense urban population and extensive drainage infrastructure require year-round vector control operations, with peak demand during the June-October monsoon period.",
  "Goa": "Goa's tropical climate and high annual rainfall create sustained mosquito breeding conditions across coastal settlements, tourist infrastructure, and inland areas.",
  "Gujarat": "Gujarat's coastal zones and seasonal monsoon pattern drive significant mosquito activity across port cities and agricultural districts from June to November.",
  "Haryana": "Haryana's rapid urbanisation and agricultural canal network create significant mosquito habitats, requiring coordinated municipal vector control across expanding residential areas.",
  "Himachal Pradesh": "Himachal Pradesh's river valleys and tourist infrastructure require effective vector control during summer and monsoon seasons to maintain public health standards.",
  "Jharkhand": "Jharkhand's tribal districts and forested zones face significant vector-borne disease pressure — particularly malaria — requiring reliable equipment for district health operations.",
  "Karnataka": "Karnataka's diverse geography from the Western Ghats coastline to the Deccan plateau creates varied vector control requirements across its 31 districts.",
  "Kerala": "Kerala's exceptional rainfall among the highest in India creates year-round vector control requirements, particularly across densely populated residential and agricultural areas.",
  "Madhya Pradesh": "Madhya Pradesh's river systems and forested tribal regions create endemic vector control requirements across its large geographic expanse.",
  "Maharashtra": "Maharashtra's mix of dense urban metros and agricultural districts creates varied vector control requirements at significant scale across its municipalities.",
  "Manipur": "Manipur's valley districts and hilly terrain face endemic malaria pressure, requiring equipment suited to diverse terrain and climate conditions.",
  "Meghalaya": "Meghalaya's exceptionally high rainfall creates year-round vector breeding conditions, requiring sustained operational capacity throughout most of the year.",
  "Mizoram": "Mizoram's hilly terrain and dense forest cover require specialised vector control approaches for its district health operations.",
  "Nagaland": "Nagaland's mountainous terrain and forested districts face endemic vector-borne disease requiring reliable health department equipment.",
  "Odisha": "Odisha's cyclone-prone coastline and river delta geography create significant post-flood mosquito breeding conditions requiring rapid deployment capability.",
  "Punjab": "Punjab's agricultural economy includes extensive irrigation networks and paddy fields that create significant mosquito habitats during the kharif growing season.",
  "Rajasthan": "Rajasthan's seasonal monsoon water bodies in an otherwise arid landscape create concentrated mosquito breeding grounds in affected districts each year.",
  "Sikkim": "Sikkim's river valleys and tourist areas require effective vector control during peak visitor seasons to maintain public health standards.",
  "Tamil Nadu": "Tamil Nadu's two monsoon seasons — northeast and southwest — create prolonged elevated mosquito activity periods requiring sustained operational capacity.",
  "Telangana": "Telangana's rapidly expanding urban areas and Hyderabad metropolitan region present significant public health management challenges for dengue and malaria prevention.",
  "Tripura": "Tripura's humid subtropical climate and hilly terrain face sustained vector-borne disease pressure requiring reliable public health equipment.",
  "Uttar Pradesh": "Uttar Pradesh, India's most populous state, faces significant vector-borne disease pressure across 75 districts, particularly during and after the monsoon season.",
  "Uttarakhand": "Uttarakhand's river valleys and pilgrimage routes require effective vector control during peak seasons to maintain public health standards.",
  "West Bengal": "West Bengal's Gangetic delta geography and dense population create significant vector control requirements across urban, peri-urban, and rural areas.",
  "Chandigarh": "Chandigarh's planned urban zones and green spaces require regular mosquito control operations to maintain the city's public health standards.",
  "Jammu & Kashmir": "Jammu and Kashmir's varied terrain — from Jammu's subtropical plains to Kashmir's temperate valley — requires vector control across diverse geographic settings.",
  "Jammu and Kashmir": "Jammu and Kashmir's varied terrain — from Jammu's subtropical plains to Kashmir's temperate valley — requires vector control across diverse geographic settings.",
  "Ladakh": "Ladakh's high-altitude terrain and expanding tourist infrastructure require effective pest management for residential and institutional facilities.",
  "Puducherry": "Puducherry's coastal geography and high annual rainfall create consistent vector control requirements across its urban and semi-urban areas.",
}

// ── Category-specific challenge narratives ────────────────────────────────────
function challengeText(category: string, org: string): string {
  switch (category) {
    case "Municipal":
      return `${org} coordinates routine and emergency vector control operations across municipal wards and public zones. The department required reliable, IS 14855-compliant fogging equipment that could be operated by municipal staff and procured through established government procurement channels.`
    case "Health":
      return `The department required IS 14855-compliant thermal fogging equipment for district-level vector control operations as part of national disease prevention programmes. Operational reliability and procurement compliance were primary criteria for equipment selection.`
    case "Railways":
      return `Station premises, platforms, and operational areas require regular vector control to maintain public health standards for passengers and staff. Equipment needed to meet railway operational requirements including ease of deployment in busy public spaces and operational safety compliance.`
    case "Defence":
      return `The establishment required IS 14855-certified fogging machines for vector control across campus, residential quarters, and operational areas. Equipment had to meet defence procurement standards with full manufacturer documentation.`
    case "Agriculture":
      return `Agricultural operations in the region require vector control to protect farm worker health and comply with public health guidelines during monsoon season. Reliable equipment with local manufacturer support was a key procurement criterion.`
    default:
      return `The organisation required IS 14855-certified fogging equipment meeting government procurement standards for routine public health operations. Availability through GeM and comprehensive OEM documentation were key procurement considerations.`
  }
}

// ── Solution narrative ────────────────────────────────────────────────────────
function solutionText(product: string, org: string): string {
  return `${org} procured the ${product} through the Government e-Marketplace (GeM), enabling compliant procurement with full OEM documentation support from 100X Circle. The supply included IS 14855 compliance certificates, ISO 9001:2015 certification, and MSME/UDYAM registration documentation.`
}

// ── Implementation narrative ──────────────────────────────────────────────────
function implementationText(category: string): string {
  switch (category) {
    case "Municipal":
      return `Equipment was deployed across municipal wards for routine larviciding and adulticiding operations. Operators received product training covering operation, maintenance scheduling, and safe handling of approved insecticide formulations.`
    case "Health":
      return `Fogging machines were integrated into the department's vector control programme for both routine prevention and outbreak-response deployment. Operational handover included technical briefing for department staff.`
    case "Railways":
      return `Equipment was deployed across station premises and surrounding operational areas during scheduled maintenance periods. Operation protocols were aligned with railway health and safety requirements.`
    case "Defence":
      return `Equipment was delivered and commissioned with full technical handover to establishment health personnel. Deployment covered residential zones, administrative areas, and designated operational sections.`
    default:
      return `Equipment was delivered, commissioned, and operationalised with technical support from the 100X Circle team. Operational procedures were aligned with the organisation's existing health and safety protocols.`
  }
}

// ── Outcome narrative ─────────────────────────────────────────────────────────
function resultsText(category: string, quantity?: number | null): string {
  const qNote = quantity ? ` A total of ${quantity} unit${quantity > 1 ? "s" : ""} were supplied.` : ""
  switch (category) {
    case "Municipal":
      return `The procurement strengthened the department's operational vector control capability.${qNote} Equipment reliability and local support availability improved operational readiness. Machines were operationally deployed from delivery with minimal familiarisation requirements.`
    case "Health":
      return `The department enhanced its vector control operational capacity with reliable, standards-compliant equipment.${qNote} IS 14855 certification ensured regulatory compliance across programme operations. Equipment performance met requirements for both routine prevention and emergency response deployment.`
    case "Railways":
      return `Station premises vector control was maintained to required public health standards.${qNote} Equipment reliability allowed scheduled operations to proceed without interruption. Manufacturer support ensured continuity of service requirements.`
    default:
      return `The organisation achieved improved operational readiness for vector control activities.${qNote} Full OEM documentation facilitated compliance requirements. Manufacturer support availability provided confidence in ongoing equipment operations.`
  }
}

// ── Industry mapping ──────────────────────────────────────────────────────────
function industryFromCategory(category: string): string {
  const MAP: Record<string, string> = {
    Municipal: "Municipal Public Health",
    Health: "State Health Department",
    Railways: "Indian Railways",
    Defence: "Defence",
    Agriculture: "Agriculture",
    Other: "Public Sector",
  }
  return MAP[category] || "Public Health"
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

// ── Build case study from template ───────────────────────────────────────────
function buildTemplateStudy(record: any): Record<string, any> {
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
    background: (STATE_CONTEXT[state] || `${state} requires effective vector control operations across its municipalities and government facilities.`) + ` (${year})`,
    implementation: implementationText(cat),
    whyChosen: `100X Circle was selected as a GeM-registered OEM manufacturing IS 14855-certified fogging machines in India. MSME registration, ISO 9001:2015 quality certification, and established government supply experience provided procurement confidence.`,
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

// ── Try LLM enrichment ────────────────────────────────────────────────────────
async function enrichWithLLM(template: Record<string, any>, record: any): Promise<Record<string, any>> {
  const stateCtx = STATE_CONTEXT[record.state] || ""

  const prompt = `You are writing a professional government case study for 100X Circle, an Indian OEM manufacturer of IS 14855-certified thermal fogging machines based in Gurugram, Haryana.

PROCUREMENT RECORD:
- Organization: ${record.organization || ""}
- Department: ${record.department || ""}
- State: ${record.state || ""}
- Product Supplied: ${record.product || ""}
- Year: ${record.orderYear || ""}
- Category: ${record.category || ""}
- Quantity: ${record.quantity ? record.quantity + " units" : "not specified"}
- Notes: ${record.notes || "none"}
- Geographic Context: ${stateCtx}

Write a realistic, professional case study in valid JSON. Use the exact keys below. Keep each field to 2-4 sentences.

STRICT RULES:
- Do NOT invent procurement values, prices, or specific quantities unless given
- Do NOT invent performance percentages, reduction statistics, or coverage numbers
- Use natural, professional language — not marketing hyperbole
- Outcomes must be realistic: improved readiness, compliance, operational coverage, reliability — not fake metrics
- Procurement should mention GeM where natural
- Return ONLY valid JSON — no markdown, no code blocks

Required JSON keys:
{
  "title": "Short descriptive title (include organization name and state)",
  "problem": "The challenge faced (2-3 sentences)",
  "solution": "What 100X Circle provided and how procured (2-3 sentences)",
  "results": "Realistic operational outcomes, no invented statistics (2-3 sentences)",
  "background": "Geographic and departmental context (2 sentences)",
  "implementation": "How equipment was deployed (2 sentences)"
}`

  try {
    const raw = await callLLM(prompt, {
      model: "claude-haiku-4-5-20251001",
      maxTokens: 800,
      systemPrompt: "You are a professional B2B case study writer. Return only valid JSON.",
    })

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return template

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.title || !parsed.problem) return template

    return {
      ...template,
      title: parsed.title || template.title,
      problem: parsed.problem || template.problem,
      solution: parsed.solution || template.solution,
      results: parsed.results || template.results,
      background: parsed.background || template.background,
      implementation: parsed.implementation || template.implementation,
      slug: slugify(parsed.title || template.title),
      generatedMethod: "llm",
    }
  } catch {
    return template
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db()

    const record = await db.collection("gov_past_performance").findOne({ _id: new ObjectId(params.id) })
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    // Check if already generated
    const existing = await db.collection("case_studies").findOne({ sourceRecordId: params.id })
    if (existing) {
      return NextResponse.json({
        ok: true,
        exists: true,
        caseStudyId: String(existing._id),
        slug: existing.slug,
        title: existing.title,
        published: existing.published,
      })
    }

    // Build template study
    let study = buildTemplateStudy(record)

    // Try LLM enrichment if API keys are available
    if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        study = await enrichWithLLM(study, record)
      } catch (e) {
        if (String(e) !== ALL_PROVIDERS_UNAVAILABLE) {
          console.warn("[generate-case-study] LLM enrichment failed, using template:", String(e))
        }
      }
    }

    const result = await db.collection("case_studies").insertOne(study)

    return NextResponse.json({
      ok: true,
      exists: false,
      caseStudyId: String(result.insertedId),
      slug: study.slug,
      title: study.title,
      method: study.generatedMethod,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
