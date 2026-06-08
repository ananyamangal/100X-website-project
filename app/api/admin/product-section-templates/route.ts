import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const SEED_TEMPLATES = [
  // ── Industrial ──────────────────────────────────────────────────────────
  {
    name: 'Heavy Equipment Hero',
    type: 'hero',
    category: 'industrial',
    description: 'Bold hero section for heavy industrial equipment with spec highlights.',
    icon: '⚙️',
    contentDefaults: { showSpecHighlights: true, showBadges: true, ctaLabel: 'Get Quote' },
  },
  {
    name: 'Technical Spec Sheet',
    type: 'specifications',
    category: 'industrial',
    description: 'Dense tabular specs grouped by Mechanical, Performance, Physical.',
    icon: '📋',
    contentDefaults: { layout: 'table', showGroups: true },
  },
  {
    name: 'Safety & Compliance',
    type: 'certifications',
    category: 'industrial',
    description: 'Full compliance certification grid with verification links.',
    icon: '🛡️',
    contentDefaults: { layout: 'grid', showVerifyLinks: true },
  },
  {
    name: 'Performance Dashboard',
    type: 'metrics',
    category: 'industrial',
    description: 'Key performance metrics as large stat cards.',
    icon: '📊',
    contentDefaults: { layout: 'cards', columns: 4 },
  },
  // ── Government ──────────────────────────────────────────────────────────
  {
    name: 'GeM Registered',
    type: 'certifications',
    category: 'government',
    description: 'Government e-Marketplace registration highlight with procurement links.',
    icon: '🏛️',
    contentDefaults: { highlight: 'gem', showProcurementCTA: true },
  },
  {
    name: 'MSME & Startup India',
    type: 'certifications',
    category: 'government',
    description: 'MSME, UDYAM, Startup India registrations prominently displayed.',
    icon: '🎖️',
    contentDefaults: { highlight: 'msme' },
  },
  {
    name: 'Defence & Railways',
    type: 'applications',
    category: 'government',
    description: 'Applications section focused on defence, railways, and municipal use.',
    icon: '🚂',
    contentDefaults: { industries: ['Defence', 'Railways', 'Municipal', 'Hospitals'] },
  },
  // ── Agriculture ──────────────────────────────────────────────────────────
  {
    name: 'Crop Protection Features',
    type: 'features',
    category: 'agriculture',
    description: 'Feature cards emphasizing tank capacity, coverage, and chemical compatibility.',
    icon: '🌾',
    contentDefaults: { layout: 'cards', emphasis: 'capacity' },
  },
  {
    name: 'Field Deployment',
    type: 'case-study',
    category: 'agriculture',
    description: 'Real-world field deployment results from farms and agriculture co-ops.',
    icon: '🏗️',
    contentDefaults: { industry: 'Agriculture' },
  },
  {
    name: 'Agri Applications',
    type: 'applications',
    category: 'agriculture',
    description: 'Use-cases for pest control, fertiliser, weed management.',
    icon: '🌿',
    contentDefaults: { industries: ['Agriculture', 'Horticulture', 'Plantation'] },
  },
  // ── Technology ──────────────────────────────────────────────────────────
  {
    name: 'Feature Showcase',
    type: 'features',
    category: 'technology',
    description: 'Modern card-based feature grid with icons and sub-values.',
    icon: '⚡',
    contentDefaults: { layout: 'grid', columns: 3, showIcons: true },
  },
  {
    name: 'Video + Gallery',
    type: 'video',
    category: 'technology',
    description: 'Hero video with image gallery carousel below.',
    icon: '🎬',
    contentDefaults: { showGallery: true },
  },
  {
    name: 'Product FAQ',
    type: 'faq',
    category: 'technology',
    description: 'Accordion FAQ section for technical products.',
    icon: '❓',
    contentDefaults: { style: 'accordion' },
  },
  // ── Corporate ──────────────────────────────────────────────────────────
  {
    name: 'Corporate Downloads',
    type: 'downloads',
    category: 'corporate',
    description: 'Brochure, datasheet, and manual downloads in a clean list.',
    icon: '📥',
    contentDefaults: { showBrochure: true, showDatasheet: true },
  },
  {
    name: 'Warranty & Support',
    type: 'warranty',
    category: 'corporate',
    description: 'Warranty period, coverage details, and support contact.',
    icon: '🔧',
    contentDefaults: { showContact: true },
  },
  {
    name: 'Dealer Network',
    type: 'dealer-network',
    category: 'corporate',
    description: 'Pan-India dealer network map and contact info.',
    icon: '🗺️',
    contentDefaults: { showMap: true },
  },
  {
    name: 'Custom Content Block',
    type: 'custom',
    category: 'corporate',
    description: 'Free-form rich text + media block for any custom content.',
    icon: '📝',
    contentDefaults: { layout: 'richtext' },
  },
]

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const templates = await db.collection('product_section_templates').find({}).sort({ category: 1, name: 1 }).toArray()
    return NextResponse.json(templates)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    const body = await request.json()

    // Seed action
    if (body.action === 'seed') {
      const existing = await db.collection('product_section_templates').find({}).toArray()
      const existingNames = new Set(existing.map((t: any) => t.name))
      const toInsert = SEED_TEMPLATES.filter(t => !existingNames.has(t.name))
      if (toInsert.length > 0) {
        const now = new Date()
        await db.collection('product_section_templates').insertMany(
          toInsert.map(t => ({ ...t, createdAt: now, updatedAt: now }))
        )
      }
      return NextResponse.json({ seeded: toInsert.length, existing: existing.length })
    }

    // Normal create
    const doc = { ...body, createdAt: new Date(), updatedAt: new Date() }
    const result = await db.collection('product_section_templates').insertOne(doc)
    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    const client = await clientPromise
    const db = client.db()
    await db.collection('product_section_templates').deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
