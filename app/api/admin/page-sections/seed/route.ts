import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { HOMEPAGE_SECTIONS, PRODUCT_SECTIONS } from "@/lib/pageSections"

// ── Seed data: curated icons + image URLs per section key ─────────────────────

const SECTION_OVERRIDES: Record<string, {
  icon:     string
  bgImage?: string
  heading?: string
  subheading?: string
  eyebrow?: string
}> = {
  // ── Homepage ──────────────────────────────────────────────────────────────
  hero: {
    icon:     '🎬',
    bgImage:  '/banner-desktop.jpg',
  },
  accreditations: {
    icon:     '🏆',
    eyebrow:  'Certified & Government Approved',
  },
  products: {
    icon:     '📦',
    heading:  'Our Product Range',
    subheading: 'Purpose-built thermal fogging machines for every scale of operation',
    eyebrow:  'The Range',
  },
  spare_parts: {
    icon:     '⚙️',
    heading:  'Spare Parts & Accessories',
    eyebrow:  'Genuine OEM Parts',
  },
  industry_applications: {
    icon:     '🏭',
    heading:  'Trusted across industries',
    subheading: 'From municipal mosquito control to pharmaceutical plant sanitation',
    eyebrow:  'Applications',
  },
  manufacturer_story: {
    icon:     '🏗️',
    bgImage:  '/production.png',
    heading:  'Trusted Thermal Fogging Machine Manufacturer in India',
    subheading: '100X Circle designs and manufactures field-ready thermal foggers from our Gurugram facility',
    eyebrow:  'Trusted Manufacturer',
  },
  technology: {
    icon:     '⚡',
    heading:  'Pulse-Jet Thermal Fogging Technology',
    subheading: 'Four engineered stages that turn a fuel-air spark into deep-penetrating fog',
    eyebrow:  'How It Works',
  },
  rfq_midpage: {
    icon:     '📋',
    heading:  'Get a Custom Quote',
    subheading: 'Tell us what you need — we respond within 24 hours',
    eyebrow:  'Request a Quote',
  },
  youtube_shorts: {
    icon:     '▶️',
    heading:  'See our machines in action.',
    subheading: 'Real demos, field tests, and operating guides — watch before you buy.',
    eyebrow:  'YouTube',
  },
  customers: {
    icon:     '🤝',
    heading:  'Trusted by organisations across India',
    eyebrow:  'Our Customers',
  },
  reviews: {
    icon:     '⭐',
    heading:  'What our customers say',
    subheading: 'Verified reviews from buyers, government departments, and field operators',
    eyebrow:  'Customer Reviews',
  },
  trust_certifications: {
    icon:     '🛡️',
    heading:  'Built to the highest standards.',
    subheading: 'ISO certified · GeM registered · BIS approved · Made in India',
    eyebrow:  'Quality Assurance',
  },
  specialised_buyers: {
    icon:     '🎯',
    heading:  'Built for your procurement type',
    subheading: 'Government tenders, GeM, bulk orders, dealer inquiries — we handle them all',
    eyebrow:  'Who We Serve',
  },
  blog: {
    icon:     '📰',
    heading:  'Knowledge Hub',
    subheading: 'Guides, case studies, and technical deep-dives from our field teams',
    eyebrow:  'From the Blog',
  },
  faq: {
    icon:     '❓',
    heading:  'Common Questions',
    eyebrow:  'FAQ',
  },
  cta_final: {
    icon:     '📢',
    heading:  'Ready to buy or tender?',
    subheading: 'Get a quote in 24 hours — we handle GeM, bulk, and custom orders.',
    eyebrow:  'Get Started',
  },

  // ── Product Pages ─────────────────────────────────────────────────────────
  product_hero: {
    icon: '🎬',
  },
  gallery_purchase: {
    icon: '🛒',
  },
  full_specs: {
    icon:    '📊',
    heading: 'Full Specifications',
    eyebrow: 'Technical Details',
  },
  featured_video: {
    icon:    '🎥',
    heading: 'Watch In Action',
    eyebrow: 'Product Demo',
  },
  film_chapters: {
    icon:    '📖',
    heading: 'Key Features',
  },
  applications: {
    icon:    '🎯',
    heading: 'Key Features & Applications',
    eyebrow: 'What It Does',
  },
  certifications: {
    icon:    '🛡️',
    heading: 'Built to standard. Verified by labs.',
    eyebrow: 'Certifications & Approvals',
  },
  ugc_carousel: {
    icon:    '📸',
    heading: 'Real-world Deployments',
    eyebrow: 'From the Field',
  },
  spare_parts_product: {
    icon:    '⚙️',
    heading: 'Spare Parts',
    eyebrow: 'Genuine OEM Parts',
  },
  case_studies: {
    icon:    '📁',
    heading: 'Case Studies',
    eyebrow: 'Real Deployments',
  },
  faq_product: {
    icon:    '❓',
    heading: 'Frequently Asked Questions',
    eyebrow: 'Common Questions',
  },
  reviews_product: {
    icon:    '⭐',
    heading: 'Customer Reviews',
    eyebrow: 'What Buyers Say',
  },
  warranty: {
    icon:    '🔧',
    heading: 'Manufacturer Warranty',
  },
  downloads: {
    icon:    '📥',
    heading: 'Downloads',
    eyebrow: 'Documentation',
  },
  rfq_product: {
    icon:    '📋',
    heading: 'Get a tailored quote',
    subheading: 'Tender, GeM, dealer, and bulk inquiries welcome. Our team responds within 24 hours with pricing, compliance certificates, and delivery timeline.',
    eyebrow: 'Request a Quote',
  },
  related_products: {
    icon:    '🔗',
    heading: 'You may also like',
    eyebrow: 'Related Products',
  },
}

// POST /api/admin/page-sections/seed
// Upserts all section defaults into the page_sections collection.
// Safe to run multiple times — uses upsert, does not overwrite manual edits
// unless ?overwrite=true is passed.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "products.edit")
  if (auth instanceof NextResponse) return auth

  const overwrite = req.nextUrl.searchParams.get("overwrite") === "true"

  const client = await clientPromise
  const db = client.db()
  const now = new Date()

  const allDefs = [...HOMEPAGE_SECTIONS, ...PRODUCT_SECTIONS]
  let upserted = 0
  let skipped  = 0

  for (const def of allDefs) {
    const override = SECTION_OVERRIDES[def.key] ?? {}

    const doc = {
      pageKey:    def.pageKey,
      sectionKey: def.key,
      isEnabled:  true,
      order:      def.defaultOrder,
      variant:    def.defaultVariant,
      icon:       override.icon    ?? def.icon,
      heading:    override.heading  ?? def.defaultHeading  ?? '',
      subheading: override.subheading ?? def.defaultSubheading ?? '',
      eyebrow:    override.eyebrow  ?? def.defaultEyebrow  ?? '',
      bgColor:    def.defaultBgColor,
      bgImage:    override.bgImage  ?? '',
      ctaText:    '',
      ctaHref:    '',
      ctaSecondaryText:  '',
      ctaSecondaryHref:  '',
      config:     {},
      updatedAt:  now,
    }

    if (overwrite) {
      // Full overwrite — replace everything
      await db.collection("page_sections").updateOne(
        { pageKey: def.pageKey, sectionKey: def.key },
        { $set: doc, $setOnInsert: { createdAt: now } },
        { upsert: true }
      )
      upserted++
    } else {
      // Soft upsert — only insert if record doesn't exist, otherwise skip
      const existing = await db.collection("page_sections").findOne(
        { pageKey: def.pageKey, sectionKey: def.key }
      )
      if (!existing) {
        await db.collection("page_sections").insertOne({ ...doc, createdAt: now })
        upserted++
      } else {
        skipped++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    upserted,
    skipped,
    total: allDefs.length,
    mode: overwrite ? "overwrite" : "soft",
  })
}
