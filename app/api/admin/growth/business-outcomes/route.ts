import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

type LeadType   = 'government' | 'dealer' | 'oem' | 'pest_control' | 'farmer' | 'unknown'
type LeadSource = 'google_ads' | 'organic' | 'gem' | 'whatsapp' | 'direct'

// ── Classification ─────────────────────────────────────────────────────────────

const GOV_PAGE    = /\/gem-|\/government|\/nhm|\/nvbdcp|\/public-health|\/is-14855|\/municipal|\/vector-control/
const DEALER_PAGE = /\/dealer|\/become-a-dealer|\/dealers-and-government/
const OEM_PAGE    = /\/gem-oem|\/oem-auth/
const PEST_PAGE   = /\/pest-control/
const AGRI_PAGE   = /\/agriculture|\/agri-fogger|\/farmer/

const GOV_ORG    = /government|municipal|corporation|nagar|district|department|ministry|hospital|health dept|public health/i
const DEALER_ORG = /dealer|distributor|wholesaler|reseller/i
const PEST_ORG   = /pest control|pest management|fumigation|exterminator|vector control/i
const FARMER_ORG = /farmer|agriculture|agri|farm|kisaan|kisan/i

function classifyLead(doc: Record<string, unknown>): LeadType {
  const answers  = (doc.answers || {}) as Record<string, string>
  const page     = String(doc.form_page_path || doc.pagePath || '').toLowerCase()
  const org      = String(doc.organization || answers.organization || '').toLowerCase()
  const msg      = String(doc.message || doc.requirement || answers.description || '').toLowerCase()
  const product  = String(doc.product || answers.product || '').toLowerCase()

  if (doc.gemAuthRequired || doc.gemAuth || GOV_PAGE.test(page) || GOV_ORG.test(org))
    return 'government'
  if (doc.dealerInquiry || DEALER_PAGE.test(page) || DEALER_ORG.test(org))
    return 'dealer'
  if (OEM_PAGE.test(page))
    return 'oem'
  if (PEST_PAGE.test(page) || PEST_ORG.test(org) || PEST_ORG.test(msg))
    return 'pest_control'
  if (AGRI_PAGE.test(page) || FARMER_ORG.test(org) || product.includes('agriculture') || product.includes('agri'))
    return 'farmer'
  return 'unknown'
}

function classifySource(doc: Record<string, unknown>): LeadSource {
  const attr        = (doc.attribution || {}) as Record<string, string>
  const utm_source  = (attr.utm_source  || '').toLowerCase()
  const utm_medium  = (attr.utm_medium  || '').toLowerCase()
  const utm_campaign = (attr.utm_campaign || '').toLowerCase()
  const referrer    = (attr.entryReferrer || '').toLowerCase()
  const page        = String(doc.form_page_path || doc.pagePath || '').toLowerCase()

  if (attr.gclid || (utm_source === 'google' && /cpc|paid|ppc|paidsearch/.test(utm_medium)))
    return 'google_ads'
  if (/\/gem-/.test(page) || utm_campaign.includes('gem'))
    return 'gem'
  if (referrer.includes('wa.me') || referrer.includes('whatsapp'))
    return 'whatsapp'
  if (!attr.gclid && (referrer.includes('google') || referrer.includes('bing') || referrer.includes('yahoo') || referrer.includes('duckduck')))
    return 'organic'
  if (utm_medium === 'organic')
    return 'organic'
  return 'direct'
}

// ── Demand Score ───────────────────────────────────────────────────────────────

function computeDemandScore(
  leads7d:  number,
  prior7d:  number,
  classCounts7d:  Record<LeadType, number>,
  sourceCounts7d: Record<LeadSource, number>,
) {
  const wowChange  = prior7d > 0 ? Math.round(((leads7d - prior7d) / prior7d) * 100) : (leads7d > 0 ? 100 : 0)
  const volumePts  = Math.min(leads7d * 5, 40)
  const premium    = (classCounts7d.government || 0) + (classCounts7d.dealer || 0) + (classCounts7d.oem || 0)
  const qualityPts = leads7d > 0 ? Math.round((premium / leads7d) * 30) : 0
  const trendPts   = wowChange > 30 ? 20 : wowChange > 10 ? 15 : wowChange >= -10 ? 10 : wowChange >= -30 ? 5 : 0
  const activeSrc  = Object.values(sourceCounts7d).filter(v => v > 0).length
  const divPts     = Math.min(activeSrc * 2.5, 10)
  const score      = Math.round(volumePts + qualityPts + trendPts + divPts)

  return {
    score,
    label:    score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : score >= 20 ? 'Low' : 'No data',
    trend:    (wowChange > 10 ? 'rising' : wowChange < -10 ? 'falling' : 'stable') as 'rising' | 'stable' | 'falling',
    wowChange,
    breakdown: {
      volume:    Math.round(volumePts),
      quality:   qualityPts,
      trend:     trendPts,
      diversity: Math.round(divPts),
    },
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function emptyClassMap(): Record<LeadType, number> {
  return { government: 0, dealer: 0, oem: 0, pest_control: 0, farmer: 0, unknown: 0 }
}

function emptySourceMap(): Record<LeadSource, number> {
  return { google_ads: 0, organic: 0, gem: 0, whatsapp: 0, direct: 0 }
}

// ── Main ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = await clientPromise
    const db     = client.db()

    const since30 = daysAgoISO(30)
    const since14 = daysAgoISO(14)
    const since7  = daysAgoISO(7)
    const since1  = daysAgoISO(1)

    // Fetch all leads from last 30 days from both collections
    const [subDocs, popupDocs, eventDocs30, eventDocs14] = await Promise.all([
      db.collection('submissions')
        .find({
          createdAt: { $gte: since30 },
          type: { $in: ['contact', 'rfq'] },
        })
        .project({
          createdAt: 1, type: 1,
          gemAuthRequired: 1, gemAuth: 1, dealerInquiry: 1,
          form_page_path: 1, organization: 1, message: 1, requirement: 1, product: 1,
          attribution: 1, status: 1, respondedAt: 1,
        })
        .toArray(),

      db.collection('rfq_popup_leads')
        .find({ createdAt: { $gte: since30 } })
        .project({ createdAt: 1, answers: 1, pagePath: 1, utm: 1, status: 1, respondedAt: 1 })
        .toArray(),

      // Analytics events — last 30 days (for traffic comparison)
      db.collection('analytics_events')
        .aggregate([
          { $match: { createdAt: { $gte: since30 } } },
          { $group: { _id: { event: '$event', period: { $cond: [{ $gte: ['$createdAt', since7] }, '7d', 'prior7d'] } }, count: { $sum: 1 } } },
        ])
        .toArray(),

      // Form errors in last 24h
      db.collection('analytics_events')
        .countDocuments({ event: 'form_error', createdAt: { $gte: since1 } }),
    ])

    // ── Combine leads ────────────────────────────────────────────────────────

    type Lead = {
      createdAt: string
      type: LeadType
      source: LeadSource
      hasResponse: boolean
      raw: Record<string, unknown>
    }

    const allLeads: Lead[] = [
      ...subDocs.map(d => {
        const doc = d as Record<string, unknown>
        return {
          createdAt: String(doc.createdAt || ''),
          type: classifyLead(doc),
          source: classifySource(doc),
          hasResponse: !!(doc.respondedAt || (doc.status && doc.status !== 'new')),
          raw: doc,
        }
      }),
      ...popupDocs.map(d => {
        const doc = d as Record<string, unknown>
        const attr = (doc.utm || {}) as Record<string, string>
        const docWithAttr = { ...doc, attribution: attr, form_page_path: doc.pagePath }
        return {
          createdAt: String(doc.createdAt || ''),
          type: classifyLead(docWithAttr),
          source: classifySource(docWithAttr),
          hasResponse: !!(doc.respondedAt || (doc.status && doc.status !== 'new')),
          raw: doc,
        }
      }),
    ]

    // ── Period slices ────────────────────────────────────────────────────────

    const leads30d  = allLeads
    const leads7d   = allLeads.filter(l => l.createdAt >= since7)
    const leadsToday = allLeads.filter(l => l.createdAt >= since1)
    const prior7d   = allLeads.filter(l => l.createdAt >= since14 && l.createdAt < since7)

    // ── Classification counts ─────────────────────────────────────────────────

    function countByType(leads: Lead[]): Record<LeadType, number> {
      const m = emptyClassMap()
      for (const l of leads) m[l.type] = (m[l.type] || 0) + 1
      return m
    }

    function countBySource(leads: Lead[]): Record<LeadSource, number> {
      const m = emptySourceMap()
      for (const l of leads) m[l.source] = (m[l.source] || 0) + 1
      return m
    }

    const typeToday  = countByType(leadsToday)
    const type7d     = countByType(leads7d)
    const type30d    = countByType(leads30d)
    const source7d   = countBySource(leads7d)
    const source30d  = countBySource(leads30d)

    // ── Demand Score ──────────────────────────────────────────────────────────

    const demandScore = computeDemandScore(
      leads7d.length,
      prior7d.length,
      type7d,
      source7d,
    )

    // ── Pipeline ──────────────────────────────────────────────────────────────

    const rfqLeads7d     = leads7d.filter(l => l.raw.type === 'rfq')
    const rfqPending     = rfqLeads7d.filter(l => !l.hasResponse)
    const dealerLeads30d = leads30d.filter(l => l.type === 'dealer')
    const highValue30d   = leads30d.filter(l => l.type === 'government' || l.type === 'oem')
    const quoted30d      = leads30d.filter(l => (l.raw.status as string) === 'quoted')

    // Unanswered > 24h: any lead older than 24h with no response
    const unanswered24h  = allLeads.filter(l => !l.hasResponse && l.createdAt < since1)
    const oldestUnread   = unanswered24h.length > 0
      ? unanswered24h.reduce((a, b) => a.createdAt < b.createdAt ? a : b).createdAt
      : null

    // ── Source table ──────────────────────────────────────────────────────────

    const SOURCE_META: Record<LeadSource, { name: string; emoji: string }> = {
      google_ads: { name: 'Google Ads', emoji: '🔵' },
      organic:    { name: 'Organic',    emoji: '🟢' },
      gem:        { name: 'GeM',        emoji: '🟡' },
      whatsapp:   { name: 'WhatsApp',   emoji: '🟢' },
      direct:     { name: 'Direct',     emoji: '⚪' },
    }

    const total7d  = leads7d.length  || 1
    const total30d = leads30d.length || 1

    const sources = (Object.keys(SOURCE_META) as LeadSource[]).map(key => ({
      key,
      name:     SOURCE_META[key].name,
      leads7d:  source7d[key]  || 0,
      leads30d: source30d[key] || 0,
      pct7d:    Math.round(((source7d[key]  || 0) / total7d)  * 100),
      pct30d:   Math.round(((source30d[key] || 0) / total30d) * 100),
    })).sort((a, b) => b.leads7d - a.leads7d)

    // ── Traffic WoW (from analytics_events) ──────────────────────────────────

    let traffic7d  = 0
    let trafficP7d = 0
    let rfqEvents7d = 0, rfqEventsP7d = 0

    for (const row of eventDocs30) {
      const id = row._id as { event: string; period: string }
      if (id.period === '7d') {
        traffic7d += row.count
        if (id.event === 'rfq_start') rfqEvents7d += row.count
      } else {
        trafficP7d += row.count
        if (id.event === 'rfq_start') rfqEventsP7d += row.count
      }
    }

    const trafficWow = trafficP7d > 0 ? Math.round(((traffic7d - trafficP7d) / trafficP7d) * 100) : 0
    const rfqWow     = rfqEventsP7d > 0 ? Math.round(((rfqEvents7d - rfqEventsP7d) / rfqEventsP7d) * 100) : 0
    const rfqLeadWow = prior7d.filter(l => l.raw.type === 'rfq').length > 0
      ? Math.round(((rfqLeads7d.length - prior7d.filter(l => l.raw.type === 'rfq').length) / prior7d.filter(l => l.raw.type === 'rfq').length) * 100)
      : 0

    // ── Alerts ────────────────────────────────────────────────────────────────

    type AlertSev = 'critical' | 'warning' | 'info'
    const alerts: { id: string; type: string; severity: AlertSev; title: string; detail: string }[] = []

    // Unanswered > 24h
    if (unanswered24h.length > 0) {
      const hoursOld = oldestUnread
        ? Math.round((Date.now() - new Date(oldestUnread).getTime()) / 3600_000)
        : null
      alerts.push({
        id: 'unanswered',
        type: 'unanswered',
        severity: (hoursOld || 0) > 48 ? 'critical' : 'warning',
        title: `${unanswered24h.length} lead${unanswered24h.length > 1 ? 's' : ''} unanswered >24h`,
        detail: hoursOld ? `Oldest is ${hoursOld}h old — respond within 2h for best close rate` : 'Respond within 2h for best close rate',
      })
    }

    // RFQ submission drop
    if (rfqLeadWow < -20) {
      alerts.push({
        id: 'rfq_drop',
        type: 'rfq_drop',
        severity: rfqLeadWow < -40 ? 'critical' : 'warning',
        title: `RFQ submissions down ${Math.abs(rfqLeadWow)}% week-over-week`,
        detail: 'Check RFQ form load, landing page traffic, and Google Ads status',
      })
    }

    // Traffic drop (click events)
    if (trafficP7d > 0 && trafficWow < -20) {
      alerts.push({
        id: 'traffic_drop',
        type: 'traffic_drop',
        severity: trafficWow < -40 ? 'critical' : 'warning',
        title: `Engagement down ${Math.abs(trafficWow)}% vs last week`,
        detail: 'WhatsApp + call clicks dropped. Check Google Ads, organic rankings.',
      })
    }

    // Form errors
    const formErrors24h = typeof eventDocs14 === 'number' ? eventDocs14 : 0
    if (formErrors24h > 0) {
      alerts.push({
        id: 'form_error',
        type: 'form_error',
        severity: 'critical',
        title: `${formErrors24h} form error${formErrors24h > 1 ? 's' : ''} in last 24h`,
        detail: 'Check browser console and API error logs for form failures',
      })
    }

    // ── Response ──────────────────────────────────────────────────────────────

    return NextResponse.json({
      demandScore,
      classification: {
        today:      typeToday,
        rolling7:   type7d,
        rolling30:  type30d,
        totalToday: leadsToday.length,
        total7d:    leads7d.length,
        total30d:   leads30d.length,
      },
      pipeline: {
        rfqPending:     rfqPending.length,
        dealerPending:  dealerLeads30d.length,
        highValue:      highValue30d.length,
        quotedWaiting:  quoted30d.length,
        newLast24h:     leadsToday.length,
        oldestUnread,
      },
      sources,
      alerts,
      meta: {
        rfqLeadWow,
        rfqEvents7d,
        trafficWow,
        formErrors24h,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('business-outcomes error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
