/**
 * Inspect the live "optimize handheld fogging" pages:
 * fetch their HTML, check title/H1/meta, trace origin in MongoDB.
 */
const fs = require('fs')
const { MongoClient } = require('mongodb')
function loadEnv(p) {
  try {
    fs.readFileSync(p,'utf8').split('\n').forEach(line => {
      const t = line.trim(); if (!t || t.startsWith('#')) return
      const eq = t.indexOf('='); if (eq < 0) return
      const k = t.slice(0,eq).trim(), v = t.slice(eq+1).trim().replace(/^["']|["']$/g,'')
      if (k && !process.env[k]) process.env[k] = v
    })
  } catch {}
}
loadEnv('.env.local'); loadEnv('.env')

const LIVE_PAGES = [
  'https://www.100xcircle.com/optimize-handheld-fogging-crowds',
  'https://www.100xcircle.com/optimize-handheld-fogging',
  'https://www.100xcircle.com/handheld-fogging-crowds',
  'https://www.100xcircle.com/blog/optimize-handheld-fogging-crowds',
]

const SLUGS = [
  'optimize-handheld-fogging-crowds',
  'optimize-handheld-fogging',
  'handheld-fogging-crowds',
]

function extract(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]{0,300})`, 'i'))
  return m ? m[1].trim().slice(0, 200) : null
}
function extractMeta(html, name) {
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{0,300})`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']{0,300})["'][^>]+name=["']${name}["']`, 'i'))
  return m ? m[1].trim() : null
}
function extractOG(html, prop) {
  const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']{0,300})`, 'i'))
  return m ? m[1].trim() : null
}
function extractTitle(html) {
  const m = html.match(/<title>([^<]{0,200})/i)
  return m ? m[1].trim() : null
}
function extractH1(html) {
  const m = html.match(/<h1[^>]*>([^<]{0,200})/i)
  return m ? m[1].trim() : null
}
function extractRobots(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']{0,100})["']/i)
    || html.match(/<meta[^>]+content=["']([^"']{0,100})["'][^>]+name=["']robots["']/i)
  return m ? m[1].trim() : 'not set (defaults to index,follow)'
}

;(async () => {
  console.log('\n' + '='.repeat(72))
  console.log('INSPECTING LIVE "OPTIMIZE HANDHELD FOGGING" PAGES')
  console.log('='.repeat(72))

  for (const url of LIVE_PAGES) {
    console.log(`\n${'─'.repeat(72)}`)
    console.log(`URL: ${url}`)
    console.log('─'.repeat(72))
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Googlebot/2.1' } })
      console.log(`  HTTP:         ${r.status}`)
      const html = await r.text()
      console.log(`  Title:        ${extractTitle(html) || '[none]'}`)
      console.log(`  H1:           ${extractH1(html) || '[none]'}`)
      console.log(`  Description:  ${extractMeta(html,'description') || '[none]'}`)
      console.log(`  Robots:       ${extractRobots(html)}`)
      console.log(`  OG Title:     ${extractOG(html,'title') || '[none]'}`)

      // Check for noindex
      const hasNoindex = html.toLowerCase().includes('noindex')
      console.log(`  Noindex:      ${hasNoindex ? '✅ YES' : '❌ NO — INDEXED BY GOOGLE'}`)

      // Check body content length and first 200 chars of visible text
      const bodyText = html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,400)
      console.log(`  Body preview: ${bodyText.slice(0,250)}...`)
    } catch (e) {
      console.log(`  Error: ${e.message}`)
    }
  }

  // Trace origin in MongoDB
  console.log('\n' + '='.repeat(72))
  console.log('MONGODB ORIGIN TRACE')
  console.log('='.repeat(72))

  const c = new MongoClient(process.env.MONGODB_URI)
  await c.connect()
  const db = c.db()

  for (const slug of SLUGS) {
    console.log(`\nSlug: "${slug}"`)

    // landing_page_overrides
    const lpo = await db.collection('landing_page_overrides').findOne({ slug })
    if (lpo) console.log(`  landing_page_overrides: ✅ FOUND — _id:${lpo._id}  title:"${lpo.title || lpo.metadata?.title}"`)
    else      console.log(`  landing_page_overrides: not found`)

    // page_sections
    const ps = await db.collection('page_sections').findOne({ slug })
    if (ps) console.log(`  page_sections: ✅ FOUND — _id:${ps._id}`)
    else    console.log(`  page_sections: not found`)
  }

  // Blog slug
  const blogSlug = 'optimize-handheld-fogging-crowds'
  const blog = await db.collection('blogs').findOne({ slug: blogSlug })
  if (blog) {
    console.log(`\nBlog slug "${blogSlug}":`)
    console.log(`  ✅ FOUND in blogs collection`)
    console.log(`  _id:           ${blog._id}`)
    console.log(`  title:         ${blog.title}`)
    console.log(`  seoTitle:      ${blog.seoTitle || '[not set]'}`)
    console.log(`  metaDescription:${blog.metaDescription || '[not set]'}`)
    console.log(`  isPublished:   ${blog.isPublished}`)
    console.log(`  createdAt:     ${blog.createdAt}`)
    console.log(`  author:        ${blog.author || '[not set]'}`)
    console.log(`  content preview: ${String(blog.content || blog.body || '').slice(0,300)}`)
  } else {
    console.log(`\nBlog slug "${blogSlug}": not found in blogs collection`)
  }

  // Check growth_os_drafts for content
  const draft = await db.collection('growth_os_drafts').findOne({ title: /optimize handheld/i })
  if (draft) {
    console.log('\nGrowth OS Draft:')
    console.log(`  _id:        ${draft._id}`)
    console.log(`  title:      ${draft.title}`)
    console.log(`  type:       ${draft.type}`)
    console.log(`  status:     ${draft.status}`)
    console.log(`  targetSlug: ${draft.targetSlug || draft.slug || '[none]'}`)
    console.log(`  createdAt:  ${draft.createdAt}`)
    console.log(`  content preview: ${String(draft.content || '').slice(0,300)}`)
  }

  // Check if slugs are in the landing pages code-level registry
  console.log('\n[Code-level LANDING_PAGES check]')
  // We can check landing_page_overrides as that's the DB equivalent
  const allOverrides = await db.collection('landing_page_overrides')
    .find({ slug: { $in: [...SLUGS, 'optimize-handheld-fogging-crowds', 'optimize-handheld-fogging', 'handheld-fogging-crowds'] } })
    .toArray()
  console.log(`  landing_page_overrides matches: ${allOverrides.length}`)
  allOverrides.forEach(o => console.log(`    slug: ${o.slug}  title: ${o.metadata?.title || o.title}`))

  await c.close()
  console.log('\n' + '='.repeat(72) + '\n')
})()
