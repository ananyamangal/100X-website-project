import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

interface PageCount { page: string; count: number }

function topN(map: Map<string, number>, n = 10): PageCount[] {
  return [...map.entries()]
    .filter(([page]) => page && page !== "")
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([page, count]) => ({ page, count }))
}

export async function GET() {
  const db = (await clientPromise).db()

  // Fetch all classified leads from all 3 collections
  const [popup, subs, gemInq] = await Promise.all([
    db.collection("rfq_popup_leads").find({ dealerScore: { $exists: true } }).toArray(),
    db.collection("submissions").find({ dealerScore: { $exists: true } }).toArray(),
    db.collection("gem_inquiries").find({ dealerScore: { $exists: true } }).toArray(),
  ])

  type Lead = Record<string, unknown>

  const allLeads: Lead[] = [
    ...popup.map(l => ({ ...(l as Lead) })),
    ...subs.map(l => ({ ...(l as Lead) })),
    ...gemInq.map(l => ({ ...(l as Lead) })),
  ]

  // Extract landing page from a lead (handles both old and new format)
  function getLandingPage(lead: Lead): string {
    if (lead.landingPage) return String(lead.landingPage)
    const attr = lead.attribution as Record<string, string> | undefined
    if (attr?.landingPage) return attr.landingPage
    return String(lead.pagePath || lead.form_page_path || "")
  }

  function getSubmissionPage(lead: Lead): string {
    return String(lead.pagePath || lead.form_page_path || "")
  }

  function getFirstPageVisited(lead: Lead): string {
    if (lead.firstPageVisited) return String(lead.firstPageVisited)
    const attr = lead.attribution as Record<string, string> | undefined
    if (attr?.firstPageVisited) return attr.firstPageVisited
    return getLandingPage(lead)
  }

  // Q1: Which page generates the most leads? (by landing page)
  const leadsByLanding = new Map<string, number>()
  // Q2: Which page generates dealer leads?
  const dealerByLanding = new Map<string, number>()
  // Q3: Which page generates OEM authorization leads?
  const oemByLanding = new Map<string, number>()
  // Q4: Which page generates GeM leads?
  const gemByLanding = new Map<string, number>()
  // Q5: Which content pages assist conversions?
  const assistByFirst = new Map<string, number>()

  // Also track submission page separately
  const leadsBySubmission = new Map<string, number>()

  for (const lead of allLeads) {
    const landing = getLandingPage(lead)
    const submission = getSubmissionPage(lead)
    const first = getFirstPageVisited(lead)
    const leadType = String(lead.leadType || "general")

    // Q1 — leads by landing page
    leadsByLanding.set(landing, (leadsByLanding.get(landing) || 0) + 1)
    // Also by submission page
    if (submission) leadsBySubmission.set(submission, (leadsBySubmission.get(submission) || 0) + 1)

    // Q2 — dealer leads
    if (leadType === "dealer_application") {
      dealerByLanding.set(landing, (dealerByLanding.get(landing) || 0) + 1)
    }
    // Q3 — OEM leads
    if (leadType === "oem_authorization") {
      oemByLanding.set(landing, (oemByLanding.get(landing) || 0) + 1)
    }
    // Q4 — GeM leads
    if (leadType === "gem_inquiry") {
      gemByLanding.set(landing, (gemByLanding.get(landing) || 0) + 1)
    }

    // Q5 — content assist: first page was a content/knowledge page,
    // submission page was different, and lead has any classification
    if (
      first !== submission &&
      first !== "" &&
      (first.startsWith("/knowledge/") || first.startsWith("/compare/") || first.startsWith("/blog/"))
    ) {
      assistByFirst.set(first, (assistByFirst.get(first) || 0) + 1)
    }
  }

  // UTM source breakdown for all leads
  const byUtmSource = new Map<string, number>()
  for (const lead of allLeads) {
    const src = String(lead.utmSource || (lead.attribution as Record<string, string>)?.utm_source || (lead.utm as Record<string, string>)?.utm_source || "organic/direct")
    byUtmSource.set(src, (byUtmSource.get(src) || 0) + 1)
  }

  // Session depth distribution (how many pages before submitting)
  const sessionDepth = { one: 0, two: 0, threeOrMore: 0 }
  for (const lead of allLeads) {
    const count = parseInt(String(lead.sessionPageCount || (lead.attribution as Record<string, string>)?.sessionPageCount || "1"), 10)
    if (count === 1) sessionDepth.one++
    else if (count === 2) sessionDepth.two++
    else sessionDepth.threeOrMore++
  }

  return NextResponse.json({
    totalLeads: allLeads.length,
    byLandingPage: topN(leadsByLanding),
    bySubmissionPage: topN(leadsBySubmission),
    dealerLeadsByPage: topN(dealerByLanding),
    oemLeadsByPage: topN(oemByLanding),
    gemLeadsByPage: topN(gemByLanding),
    contentAssistPages: topN(assistByFirst),
    byUtmSource: topN(byUtmSource),
    sessionDepth,
    hasAttributionData: allLeads.some(l => l.landingPage || (l.attribution as Record<string, string>)?.landingPage),
  })
}
