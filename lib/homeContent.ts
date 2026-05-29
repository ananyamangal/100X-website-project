// Server-only: contains MongoDB access. Do NOT import this in "use client" components.
import { cache } from 'react'
import clientPromise from '@/lib/mongodb'
import { DEFAULT_HOME_CONTENT } from '@/lib/homeContentTypes'

export type {
  HomeContentFaq,
  HomeContentStep,
  HomeContentStat,
  HomeContentConnector,
  HomeContent,
} from '@/lib/homeContentTypes'
export { DEFAULT_HOME_CONTENT } from '@/lib/homeContentTypes'

export const getHomeContent = cache(async () => {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection('home_content').findOne({ key: 'main' })
    if (!doc) return DEFAULT_HOME_CONTENT

    const d = DEFAULT_HOME_CONTENT
    return {
      manufacturerIntro: { ...d.manufacturerIntro, ...(doc.manufacturerIntro ?? {}) },
      technology: {
        ...d.technology,
        ...(doc.technology ?? {}),
        steps:
          Array.isArray(doc.technology?.steps) && doc.technology.steps.length > 0
            ? doc.technology.steps
            : d.technology.steps,
        benefits:
          Array.isArray(doc.technology?.benefits) && doc.technology.benefits.length > 0
            ? doc.technology.benefits
            : d.technology.benefits,
      },
      manufacturingAuthority: {
        ...d.manufacturingAuthority,
        ...(doc.manufacturingAuthority ?? {}),
        stats:
          Array.isArray(doc.manufacturingAuthority?.stats) &&
          doc.manufacturingAuthority.stats.length > 0
            ? doc.manufacturingAuthority.stats
            : d.manufacturingAuthority.stats,
      },
      faqs: Array.isArray(doc.faqs) && doc.faqs.length > 0 ? doc.faqs : d.faqs,
      connectors: {
        c1: { ...d.connectors.c1, ...(doc.connectors?.c1 ?? {}) },
        c2: { ...d.connectors.c2, ...(doc.connectors?.c2 ?? {}) },
        c3: { ...d.connectors.c3, ...(doc.connectors?.c3 ?? {}) },
        c4: { ...d.connectors.c4, ...(doc.connectors?.c4 ?? {}) },
      },
    }
  } catch {
    return DEFAULT_HOME_CONTENT
  }
})
