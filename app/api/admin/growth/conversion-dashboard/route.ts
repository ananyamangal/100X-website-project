import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { PROD_FILTER } from '@/lib/testFilter'

export const dynamic = 'force-dynamic'

function utcDateStrings(days: number): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

interface DailyRow {
  date: string
  whatsapp: number
  call: number
  rfqStarts: number
  rfqSubmits: number
  contacts: number
  totalLeads: number
}

export async function GET() {
  try {
    const client = await clientPromise
    const db     = client.db()

    const dates  = utcDateStrings(8)
    const since8 = dates[0] + 'T00:00:00.000Z'
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString()

    const [eventAgg, submissionAgg, popupAgg, pagesAgg, popupPagesAgg] = await Promise.all([
      db.collection('analytics_events').aggregate([
        { $match: { _test: { $ne: true }, createdAt: { $gte: since8 } } },
        { $group: { _id: { event: '$event', date: { $substr: ['$createdAt', 0, 10] } }, count: { $sum: 1 } } },
      ]).toArray(),

      db.collection('submissions').aggregate([
        { $match: { ...PROD_FILTER, createdAt: { $gte: since8 }, type: { $in: ['contact', 'rfq'] } } },
        { $group: { _id: { type: '$type', date: { $substr: ['$createdAt', 0, 10] } }, count: { $sum: 1 } } },
      ]).toArray(),

      db.collection('rfq_popup_leads').aggregate([
        { $match: { ...PROD_FILTER, createdAt: { $gte: since8 } } },
        { $group: { _id: { $substr: ['$createdAt', 0, 10] }, count: { $sum: 1 } } },
      ]).toArray(),

      db.collection('submissions').aggregate([
        { $match: { ...PROD_FILTER, createdAt: { $gte: since30 }, form_page_path: { $exists: true, $ne: '' } } },
        { $group: { _id: '$form_page_path', leads: { $sum: 1 } } },
        { $sort: { leads: -1 } },
        { $limit: 15 },
      ]).toArray(),

      db.collection('rfq_popup_leads').aggregate([
        { $match: { ...PROD_FILTER, createdAt: { $gte: since30 }, pagePath: { $exists: true, $ne: '' } } },
        { $group: { _id: '$pagePath', leads: { $sum: 1 } } },
      ]).toArray(),
    ])

    const daily: DailyRow[] = dates.map(date => ({
      date, whatsapp: 0, call: 0, rfqStarts: 0, rfqSubmits: 0, contacts: 0, totalLeads: 0,
    }))
    const dayIdx = new Map(dates.map((d, i) => [d, i]))

    for (const r of eventAgg) {
      const i  = dayIdx.get(r._id.date)
      if (i === undefined) continue
      const ev = r._id.event as string
      if      (ev === 'whatsapp_click') daily[i].whatsapp  += r.count
      else if (ev === 'call_click')     daily[i].call      += r.count
      else if (ev === 'rfq_start')      daily[i].rfqStarts += r.count
    }

    for (const r of submissionAgg) {
      const i = dayIdx.get(r._id.date)
      if (i === undefined) continue
      if      (r._id.type === 'rfq')     daily[i].rfqSubmits += r.count
      else if (r._id.type === 'contact') daily[i].contacts   += r.count
    }

    for (const r of popupAgg) {
      const i = dayIdx.get(r._id as string)
      if (i !== undefined) daily[i].rfqSubmits += r.count
    }

    for (const d of daily) d.totalLeads = d.rfqSubmits + d.contacts

    const rolling7 = daily.slice(1).reduce(
      (acc, d) => ({
        whatsapp:   acc.whatsapp   + d.whatsapp,
        call:       acc.call       + d.call,
        rfqStarts:  acc.rfqStarts  + d.rfqStarts,
        rfqSubmits: acc.rfqSubmits + d.rfqSubmits,
        contacts:   acc.contacts   + d.contacts,
        totalLeads: acc.totalLeads + d.totalLeads,
      }),
      { whatsapp: 0, call: 0, rfqStarts: 0, rfqSubmits: 0, contacts: 0, totalLeads: 0 },
    )

    const quoteRate = rolling7.totalLeads > 0
      ? Math.round((rolling7.rfqSubmits / rolling7.totalLeads) * 100)
      : null

    const pageMap = new Map<string, number>()
    for (const p of pagesAgg)      if (p._id) pageMap.set(p._id, (pageMap.get(p._id) || 0) + p.leads)
    for (const p of popupPagesAgg) if (p._id) pageMap.set(p._id, (pageMap.get(p._id) || 0) + p.leads)

    const topPages = [...pageMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, leads]) => ({ page, leads }))

    return NextResponse.json({
      today:    daily[daily.length - 1],
      rolling7: { ...rolling7, quoteRate },
      daily,
      topPages,
      dataFrom:    dates[0],
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('conversion-dashboard error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
