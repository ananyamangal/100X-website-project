// Page Section CMS — universal section registry.
// Defines every editable section on the homepage and product pages,
// their default content, available layout variants, and editable fields.
//
// Runtime flow:
//   1. Frontend (page.tsx) fetches `page_sections` collection for a pageKey
//   2. resolveSections() merges DB records with hardcoded defaults
//   3. toSectionMap() gives O(1) lookup by key
//   4. Sections render using the resolved config; isEnabled=false → skip render

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SectionVariant {
  key:         string
  label:       string
  description: string
}

export type FieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'video' | 'color' | 'url' | 'boolean'

export interface EditableField {
  key:         string
  label:       string
  type:        FieldType
  placeholder?: string
  hint?:        string
}

/** Static definition — lives in this file, never in DB */
export interface SectionDef {
  key:              string        // unique within a pageKey ("hero", "industry_applications")
  pageKey:          'homepage' | 'product'
  type:             string        // rendering type
  label:            string        // human-readable name in admin
  description:      string        // one-liner description
  icon:             string        // emoji
  defaultOrder:     number        // render order when no DB record
  defaultVariant:   string        // layout variant key
  variants:         SectionVariant[]
  defaultHeading?:  string
  defaultSubheading?: string
  defaultEyebrow?:  string
  defaultBgColor:   'white' | 'gray' | 'dark' | 'green' | 'brand'
  fields:           EditableField[]
  isDynamic?:       boolean       // content managed elsewhere (products, customers, etc.)
  isRequired?:      boolean       // can't be disabled
}

/** DB record stored in `page_sections` collection */
export interface PageSectionRecord {
  _id?:         string
  pageKey:      string            // "homepage" | "product:global" | "product:{id}"
  sectionKey:   string
  isEnabled:    boolean
  order:        number
  variant:      string
  icon?:        string            // emoji override (e.g. "🏭") — falls back to SectionDef.icon
  heading?:     string
  subheading?:  string
  eyebrow?:     string
  bgColor?:     string
  bgImage?:     string            // section background / hero image URL
  ctaText?:     string
  ctaHref?:     string
  ctaSecondaryText?: string
  ctaSecondaryHref?: string
  config?:      Record<string, unknown>
  createdAt?:   Date
  updatedAt?:   Date
}

/** Fully resolved section — what the frontend consumes */
export interface ResolvedSection {
  key:         string
  pageKey:     string
  type:        string
  label:       string
  icon:        string
  isEnabled:   boolean
  order:       number
  variant:     string
  heading:     string
  subheading:  string
  eyebrow:     string
  bgColor:     string
  bgImage:     string
  ctaText:     string
  ctaHref:     string
  ctaSecondaryText: string
  ctaSecondaryHref: string
  config:      Record<string, unknown>
  // The definition (available variants, fields, etc.)
  def:         SectionDef
}

// ── Homepage Section Definitions (16) ────────────────────────────────────────

export const HOMEPAGE_SECTIONS: SectionDef[] = [
  {
    key: 'hero',
    pageKey: 'homepage',
    type: 'hero',
    label: 'Hero Banner',
    description: 'Full-width banner carousel with CTA buttons',
    icon: '🖼️',
    defaultOrder: 10,
    defaultVariant: 'banner-carousel',
    defaultHeading: '100X Circle — India\'s Trusted Thermal Fogging Machines',
    defaultSubheading: 'Manufactured in Gurugram. Deployed across India.',
    defaultEyebrow: 'Made in India',
    defaultBgColor: 'dark',
    isRequired: true,
    isDynamic: true,
    variants: [
      { key: 'banner-carousel',   label: 'Banner Carousel',    description: 'Full-width rotating banners' },
      { key: 'full-screen-dark',  label: 'Full Screen Dark',   description: 'Dark cinematic with text overlay' },
      { key: 'gradient-hero',     label: 'Gradient Hero',      description: 'Green gradient with centered headline' },
      { key: 'split-hero',        label: 'Split Hero',         description: 'Image left, text + CTAs right' },
    ],
    fields: [
      { key: 'heading',    label: 'H1 Headline',   type: 'text',     placeholder: 'India\'s Most Trusted...' },
      { key: 'subheading', label: 'Subheading',    type: 'text',     placeholder: 'Manufactured in Gurugram...' },
      { key: 'bgImage',    label: 'Background Image', type: 'image', hint: '1920×1080px JPG/WebP, dark overlay applied automatically' },
      { key: 'ctaText',    label: 'Primary CTA',   type: 'text',     placeholder: 'Get a Quote' },
      { key: 'ctaHref',    label: 'Primary CTA URL', type: 'url',   placeholder: '/contact-us' },
    ],
  },
  {
    key: 'accreditations',
    pageKey: 'homepage',
    type: 'trust_strip',
    label: 'Trust Strip',
    description: 'Certification & accreditation logos strip below hero',
    icon: '🏆',
    defaultOrder: 20,
    defaultVariant: 'logo-strip',
    defaultEyebrow: 'Certified & Approved',
    defaultBgColor: 'white',
    isDynamic: true,
    variants: [
      { key: 'logo-strip',   label: 'Logo Strip',   description: 'Scrollable horizontal logos' },
      { key: 'badge-cards',  label: 'Badge Cards',  description: 'Cards with logo + name + description' },
      { key: 'icon-counts',  label: 'Icon + Counts', description: 'Key stats (10,000+ customers, 50+ dealers)' },
    ],
    fields: [
      { key: 'heading',    label: 'Eyebrow Label',  type: 'text', placeholder: 'Certified & Approved' },
    ],
  },
  {
    key: 'products',
    pageKey: 'homepage',
    type: 'products_grid',
    label: 'Products Showcase',
    description: 'Product cards — automatically from your product catalog',
    icon: '🔧',
    defaultOrder: 30,
    defaultVariant: 'cinema-grid',
    defaultHeading: 'Our Product Range',
    defaultSubheading: 'Purpose-built thermal fogging machines for every scale',
    defaultEyebrow: 'The Range',
    defaultBgColor: 'dark',
    isRequired: true,
    isDynamic: true,
    variants: [
      { key: 'cinema-grid',    label: 'Cinema Grid',    description: 'Dark background, large cards with hover glow' },
      { key: 'compact-list',   label: 'Compact List',   description: 'White background, compact horizontal cards' },
      { key: 'featured-hero',  label: 'Featured + Grid', description: 'One hero product + 3 supporting' },
      { key: 'masonry',        label: 'Masonry',        description: 'Pinterest-style varying heights' },
    ],
    fields: [
      { key: 'heading',    label: 'Section Heading',   type: 'text' },
      { key: 'subheading', label: 'Section Subheading', type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow Label',     type: 'text' },
      { key: 'ctaText',    label: 'View All Button',   type: 'text',  placeholder: 'View All Products' },
    ],
  },
  {
    key: 'spare_parts',
    pageKey: 'homepage',
    type: 'spare_parts_grid',
    label: 'Spare Parts Cross-sell',
    description: '4 featured spare parts with link to full catalog',
    icon: '⚙️',
    defaultOrder: 40,
    defaultVariant: 'dark-grid',
    defaultHeading: 'Spare Parts & Accessories',
    defaultSubheading: 'Genuine OEM parts for every 100X machine',
    defaultEyebrow: 'Genuine Parts',
    defaultBgColor: 'dark',
    isDynamic: true,
    variants: [
      { key: 'dark-grid',   label: 'Dark Grid',   description: '4-column dark card grid' },
      { key: 'white-cards', label: 'White Cards', description: 'Light background with image + price' },
      { key: 'horizontal',  label: 'Horizontal Scroll', description: 'Single-row horizontal scroll' },
    ],
    fields: [
      { key: 'heading',    label: 'Section Heading',   type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow Label',     type: 'text' },
      { key: 'ctaText',    label: 'View All Link',     type: 'text', placeholder: 'View All →' },
    ],
  },
  {
    key: 'industry_applications',
    pageKey: 'homepage',
    type: 'industry_grid',
    label: 'Industry Applications',
    description: 'Grid of industries served with icons and stats',
    icon: '🏭',
    defaultOrder: 60,
    defaultVariant: 'gradient-grid',
    defaultHeading: 'Trusted across industries',
    defaultSubheading: 'Purpose-built machines for every application',
    defaultEyebrow: 'Applications',
    defaultBgColor: 'white',
    variants: [
      { key: 'gradient-grid',    label: 'Gradient Grid',     description: 'Colored gradient cards with icon + stat' },
      { key: 'icon-list',        label: 'Icon List',          description: 'Two-column icon + text list' },
      { key: 'tabs',             label: 'Tabbed',             description: 'Tabs per industry, detail panel' },
      { key: 'dark-cards',       label: 'Dark Cards',         description: 'Dark background glass-morphism cards' },
    ],
    fields: [
      { key: 'heading',    label: 'Section Heading',   type: 'text' },
      { key: 'subheading', label: 'Subheading',        type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow Label',     type: 'text' },
    ],
  },
  {
    key: 'manufacturer_story',
    pageKey: 'homepage',
    type: 'brand_story',
    label: 'Manufacturer Story',
    description: 'Brand narrative — who we are, what we make, why choose us',
    icon: '🏗️',
    defaultOrder: 70,
    defaultVariant: 'split-image',
    defaultHeading: 'Trusted Thermal Fogging Machine Manufacturer in India',
    defaultSubheading: '100X Circle designs and manufactures field-ready thermal foggers from our Gurugram facility',
    defaultEyebrow: 'Trusted Manufacturer',
    defaultBgColor: 'white',
    variants: [
      { key: 'split-image',   label: 'Split Image',   description: 'Image right, text + bullets left' },
      { key: 'full-width',    label: 'Full Width',    description: 'Dark full-width with stats' },
      { key: 'editorial',     label: 'Editorial',     description: 'Magazine-style large quote + body' },
    ],
    fields: [
      { key: 'heading',    label: 'Main Heading',  type: 'text' },
      { key: 'subheading', label: 'Subheading',    type: 'textarea' },
      { key: 'eyebrow',    label: 'Eyebrow Badge', type: 'text' },
      { key: 'bgImage',    label: 'Image URL',     type: 'image', hint: 'Right-side image' },
      { key: 'ctaText',    label: 'CTA Button',    type: 'text', placeholder: 'Learn More' },
      { key: 'ctaHref',    label: 'CTA URL',       type: 'url' },
    ],
  },
  {
    key: 'technology',
    pageKey: 'homepage',
    type: 'how_it_works',
    label: 'Technology — How It Works',
    description: 'Pulse-jet technology explainer with steps and video',
    icon: '⚡',
    defaultOrder: 80,
    defaultVariant: 'steps-video',
    defaultHeading: 'Pulse-Jet Thermal Fogging Technology',
    defaultSubheading: 'Four engineered stages that turn a fuel-air spark into deep-penetrating fog',
    defaultEyebrow: 'How It Works',
    defaultBgColor: 'dark',
    variants: [
      { key: 'steps-video',   label: 'Steps + Video',  description: 'Numbered steps with inline video' },
      { key: 'accordion',     label: 'Accordion',      description: 'Expandable step details' },
      { key: 'tabs',          label: 'Horizontal Tabs', description: 'Tab per stage, diagram/text' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading',     type: 'text' },
      { key: 'subheading', label: 'Subheading',  type: 'textarea' },
      { key: 'eyebrow',    label: 'Eyebrow',     type: 'text' },
    ],
  },
  {
    key: 'rfq_midpage',
    pageKey: 'homepage',
    type: 'rfq_form',
    label: 'Mid-page RFQ Form',
    description: 'Lead capture form mid-scroll with urgency copy',
    icon: '📋',
    defaultOrder: 85,
    defaultVariant: 'centered-card',
    defaultHeading: 'Get a Custom Quote',
    defaultSubheading: 'Tell us what you need — we respond within 24 hours',
    defaultEyebrow: 'Request a Quote',
    defaultBgColor: 'gray',
    variants: [
      { key: 'centered-card', label: 'Centered Card',   description: 'White card, centered layout' },
      { key: 'split-dark',    label: 'Split Dark',      description: 'Dark left panel + form right' },
      { key: 'banner-form',   label: 'Banner + Form',   description: 'Full-width green gradient banner' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading',    type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'text' },
    ],
  },
  {
    key: 'youtube_shorts',
    pageKey: 'homepage',
    type: 'video_carousel',
    label: 'YouTube Shorts',
    description: 'Auto-fetched YouTube Shorts carousel',
    icon: '▶️',
    defaultOrder: 90,
    defaultVariant: 'shorts-scroll',
    defaultHeading: 'See our machines in action.',
    defaultSubheading: 'Real demos, field tests, and operating guides — watch before you buy.',
    defaultEyebrow: 'YouTube',
    defaultBgColor: 'gray',
    isDynamic: true,
    variants: [
      { key: 'shorts-scroll',  label: 'Shorts Scroll',  description: '9:16 portrait scroll carousel' },
      { key: 'embed-grid',     label: 'Embed Grid',     description: '16:9 video grid 2×2' },
      { key: 'featured-one',   label: 'Featured One',   description: 'Single featured video, large' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading',    type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow',    type: 'text' },
    ],
  },
  {
    key: 'customers',
    pageKey: 'homepage',
    type: 'logo_cloud',
    label: 'Customer Logos',
    description: 'Infinite-scroll customer logo marquee',
    icon: '🏢',
    defaultOrder: 100,
    defaultVariant: 'auto-scroll',
    defaultHeading: 'Our customers across India',
    defaultSubheading: '',
    defaultEyebrow: 'Trusted by',
    defaultBgColor: 'gray',
    isDynamic: true,
    variants: [
      { key: 'auto-scroll',  label: 'Auto-scroll',   description: 'Infinite marquee animation' },
      { key: 'static-grid',  label: 'Static Grid',   description: '4–6 column logo grid' },
      { key: 'featured-3',   label: 'Featured 3',    description: 'Large 3-logo featured layout' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'reviews',
    pageKey: 'homepage',
    type: 'testimonials',
    label: 'Customer Reviews',
    description: 'Verified reviews with star ratings',
    icon: '⭐',
    defaultOrder: 110,
    defaultVariant: 'card-grid',
    defaultHeading: 'What our customers say',
    defaultSubheading: 'Verified reviews from buyers, government departments, and field operators',
    defaultEyebrow: 'Reviews',
    defaultBgColor: 'white',
    isDynamic: true,
    variants: [
      { key: 'card-grid',    label: 'Card Grid',    description: 'White cards in 3-column grid' },
      { key: 'carousel',     label: 'Carousel',     description: 'Auto-rotating testimonial slider' },
      { key: 'masonry',      label: 'Masonry',      description: 'Staggered varying-height cards' },
      { key: 'featured-one', label: 'Featured Quote', description: 'One large quote, dark background' },
    ],
    fields: [
      { key: 'heading',    label: 'Section Heading', type: 'text' },
      { key: 'subheading', label: 'Subheading',      type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow',         type: 'text' },
    ],
  },
  {
    key: 'trust_certifications',
    pageKey: 'homepage',
    type: 'trust_section',
    label: 'Trust & Certifications',
    description: 'Trust pillars + certification logos, dark background',
    icon: '🛡️',
    defaultOrder: 120,
    defaultVariant: 'pillars-dark',
    defaultHeading: 'Built to the highest standards.',
    defaultSubheading: 'ISO certified, GeM registered, BIS approved',
    defaultEyebrow: 'Quality Assurance',
    defaultBgColor: 'dark',
    variants: [
      { key: 'pillars-dark',   label: 'Pillars Dark',   description: '4 trust pillar cards, dark bg' },
      { key: 'split-logos',    label: 'Split + Logos',  description: 'Text left, certification logos right' },
      { key: 'badge-strip',    label: 'Badge Strip',    description: 'Horizontal badge row, white bg' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading',    type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow',    type: 'text' },
    ],
  },
  {
    key: 'specialised_buyers',
    pageKey: 'homepage',
    type: 'segment_grid',
    label: 'Specialised Buyers',
    description: 'B2B buyer segments (government, dealers, agriculture)',
    icon: '🎯',
    defaultOrder: 130,
    defaultVariant: 'segment-cards',
    defaultHeading: 'Built for your industry',
    defaultSubheading: 'Dedicated solutions for government, agriculture, and enterprise buyers',
    defaultEyebrow: 'Who We Serve',
    defaultBgColor: 'white',
    variants: [
      { key: 'segment-cards', label: 'Segment Cards', description: '3-column cards with CTAs per segment' },
      { key: 'icon-row',      label: 'Icon Row',      description: 'Horizontal row with icons + links' },
      { key: 'tabs',          label: 'Tabs',          description: 'Tab per segment with detail content' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading',    type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'text' },
    ],
  },
  {
    key: 'blog',
    pageKey: 'homepage',
    type: 'blog_grid',
    label: 'Blog / Knowledge Hub',
    description: 'Latest articles and guides from your blog',
    icon: '📰',
    defaultOrder: 140,
    defaultVariant: 'card-grid',
    defaultHeading: 'Knowledge Hub',
    defaultSubheading: 'Guides, case studies, and technical deep-dives',
    defaultEyebrow: 'From the Blog',
    defaultBgColor: 'gray',
    isDynamic: true,
    variants: [
      { key: 'card-grid',     label: 'Card Grid',    description: '3-column image + excerpt cards' },
      { key: 'list',          label: 'List',         description: 'Minimal text list with date + category' },
      { key: 'featured-one',  label: 'Featured + 2', description: 'Large hero article + 2 sidebar' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading',    type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow',    type: 'text' },
      { key: 'ctaText',    label: 'View All CTA', type: 'text', placeholder: 'View All Articles' },
      { key: 'ctaHref',    label: 'CTA URL',    type: 'url',  placeholder: '/blog' },
    ],
  },
  {
    key: 'faq',
    pageKey: 'homepage',
    type: 'faq_accordion',
    label: 'FAQ Accordion',
    description: 'Common questions with expandable answers (editable in Home Content)',
    icon: '❓',
    defaultOrder: 150,
    defaultVariant: 'centered',
    defaultHeading: 'Common Questions',
    defaultSubheading: '',
    defaultEyebrow: 'FAQ',
    defaultBgColor: 'white',
    variants: [
      { key: 'centered',   label: 'Centered',   description: 'Single centered column, white' },
      { key: 'split',      label: 'Split',      description: 'Questions left, image/CTA right' },
      { key: 'dark',       label: 'Dark',       description: 'Dark background, open accordion' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading', type: 'text' },
      { key: 'eyebrow',    label: 'Eyebrow', type: 'text' },
    ],
  },
  {
    key: 'cta_final',
    pageKey: 'homepage',
    type: 'cta_banner',
    label: 'Final CTA Banner',
    description: 'Page-closing call-to-action with WhatsApp + RFQ buttons',
    icon: '📢',
    defaultOrder: 160,
    defaultVariant: 'gradient-dark',
    defaultHeading: 'Ready to buy or tender?',
    defaultSubheading: 'Get a quote in 24 hours — we handle GeM, bulk, and custom orders.',
    defaultEyebrow: 'Get Started',
    defaultBgColor: 'green',
    variants: [
      { key: 'gradient-dark',   label: 'Gradient Dark',  description: 'Dark gradient with glow accents' },
      { key: 'split-white',     label: 'Split White',    description: 'White left text, green CTA block right' },
      { key: 'minimal',         label: 'Minimal',        description: 'Single centered headline + one button' },
      { key: 'full-bleed-green', label: 'Full Green',   description: 'Full-width solid brand green' },
    ],
    fields: [
      { key: 'heading',           label: 'Heading',           type: 'text' },
      { key: 'subheading',        label: 'Subheading',        type: 'text' },
      { key: 'bgImage',           label: 'Background Image',  type: 'image', hint: '1920×1080px JPG/WebP — used as subtle dark-overlay background' },
      { key: 'ctaText',           label: 'Primary CTA',       type: 'text', placeholder: 'Get a Quote on WhatsApp' },
      { key: 'ctaHref',           label: 'Primary CTA URL',   type: 'url' },
      { key: 'ctaSecondaryText',  label: 'Secondary CTA',     type: 'text', placeholder: 'Browse Products' },
      { key: 'ctaSecondaryHref',  label: 'Secondary CTA URL', type: 'url' },
    ],
  },
]

// ── Product Page Section Definitions (16) ────────────────────────────────────

export const PRODUCT_SECTIONS: SectionDef[] = [
  {
    key: 'product_hero',
    pageKey: 'product',
    type: 'product_hero',
    label: 'Product Hero',
    description: 'Full-width cinematic hero — product name, badges, tagline',
    icon: '🎬',
    defaultOrder: 10,
    defaultVariant: 'cinematic',
    defaultBgColor: 'dark',
    isRequired: true,
    variants: [
      { key: 'cinematic',   label: 'Cinematic',   description: 'Dark gradient with product name overlay' },
      { key: 'minimal',     label: 'Minimal',     description: 'White with category breadcrumb' },
      { key: 'split-image', label: 'Split Image', description: 'Large image left, details right' },
    ],
    fields: [],
  },
  {
    key: 'gallery_purchase',
    pageKey: 'product',
    type: 'gallery_purchase',
    label: 'Gallery & Purchase Panel',
    description: 'Sticky product gallery + pricing, CTAs, and trust row',
    icon: '🛒',
    defaultOrder: 20,
    defaultVariant: 'sticky-split',
    defaultBgColor: 'white',
    isRequired: true,
    variants: [
      { key: 'sticky-split',   label: 'Sticky Split',   description: 'Sticky gallery left, scrolling panel right' },
      { key: 'gallery-top',    label: 'Gallery Top',    description: 'Full gallery above, purchase below' },
      { key: 'compact',        label: 'Compact',        description: 'Smaller images, info-dense right panel' },
    ],
    fields: [],
  },
  {
    key: 'full_specs',
    pageKey: 'product',
    type: 'specifications',
    label: 'Full Specifications',
    description: 'Complete technical specifications grouped by category',
    icon: '📋',
    defaultOrder: 30,
    defaultVariant: 'grouped-table',
    defaultHeading: 'Full Specifications',
    defaultEyebrow: 'Technical Details',
    defaultBgColor: 'white',
    variants: [
      { key: 'grouped-table',  label: 'Grouped Table',  description: 'Specs grouped by Engine, Tank, Performance...' },
      { key: 'flat-table',     label: 'Flat Table',     description: 'Single un-grouped table' },
      { key: 'card-grid',      label: 'Stat Cards',     description: 'Large animated stat cards' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'featured_video',
    pageKey: 'product',
    type: 'product_video',
    label: 'Featured Video',
    description: 'YouTube product demo — large dark embed section',
    icon: '🎥',
    defaultOrder: 40,
    defaultVariant: 'dark-embed',
    defaultHeading: 'Watch In Action',
    defaultEyebrow: 'Product Demo',
    defaultBgColor: 'dark',
    variants: [
      { key: 'dark-embed',    label: 'Dark Embed',    description: 'Full-width dark section, centered video' },
      { key: 'split-text',    label: 'Split + Text',  description: 'Video left, features list right' },
      { key: 'inline',        label: 'Inline',        description: 'White background, contained video' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'film_chapters',
    pageKey: 'product',
    type: 'feature_chapters',
    label: 'Feature Chapters',
    description: 'Editorial alternating image/video + text chapters',
    icon: '📖',
    defaultOrder: 50,
    defaultVariant: 'alternating',
    defaultBgColor: 'dark',
    variants: [
      { key: 'alternating', label: 'Alternating',    description: 'Alternating left/right, dark/white' },
      { key: 'left-fixed',  label: 'Left Aligned',  description: 'All images on left, text right' },
      { key: 'centered',    label: 'Centered Stack', description: 'Vertically stacked, full-width images' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading (optional)', type: 'text' },
    ],
  },
  {
    key: 'applications',
    pageKey: 'product',
    type: 'product_applications',
    label: 'Features & Applications',
    description: 'Feature grid + use-case application tiles',
    icon: '🎯',
    defaultOrder: 60,
    defaultVariant: 'feature-grid',
    defaultHeading: 'Key Features & Applications',
    defaultEyebrow: 'What It Does',
    defaultBgColor: 'gray',
    variants: [
      { key: 'feature-grid',  label: 'Feature Grid',   description: 'Icon cards + application tiles below' },
      { key: 'split-list',    label: 'Split List',     description: 'Features left, applications right' },
      { key: 'tabs',          label: 'Tabs',           description: 'Tab between Features and Applications' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'certifications',
    pageKey: 'product',
    type: 'product_certifications',
    label: 'Certifications & Approvals',
    description: 'Certification badges from product data',
    icon: '🛡️',
    defaultOrder: 70,
    defaultVariant: 'badge-grid',
    defaultHeading: 'Built to standard. Verified by labs.',
    defaultEyebrow: 'Certifications & Approvals',
    defaultBgColor: 'white',
    variants: [
      { key: 'badge-grid',      label: 'Badge Grid',      description: 'Cards with logo + name' },
      { key: 'horizontal-row',  label: 'Horizontal Row',  description: 'Logo strip, minimal' },
      { key: 'detailed-cards',  label: 'Detailed Cards',  description: 'Cards with cert details + expiry' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'ugc_carousel',
    pageKey: 'product',
    type: 'deployment_gallery',
    label: 'Deployment Gallery',
    description: 'UGC images from real field deployments',
    icon: '📸',
    defaultOrder: 80,
    defaultVariant: 'horizontal-scroll',
    defaultHeading: 'Real-world Deployments',
    defaultEyebrow: 'From the Field',
    defaultBgColor: 'gray',
    variants: [
      { key: 'horizontal-scroll', label: 'Horizontal Scroll', description: 'Snap-scroll row of deployment photos' },
      { key: 'masonry',           label: 'Masonry Grid',      description: 'Pinterest-style photo grid' },
      { key: 'lightbox-grid',     label: 'Lightbox Grid',     description: 'Click-to-expand grid' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'spare_parts_product',
    pageKey: 'product',
    type: 'spare_parts_grid',
    label: 'Spare Parts',
    description: 'Compatible spare parts for this product',
    icon: '⚙️',
    defaultOrder: 90,
    defaultVariant: 'product-grid',
    defaultHeading: 'Spare Parts',
    defaultEyebrow: 'Genuine OEM Parts',
    defaultBgColor: 'gray',
    isDynamic: true,
    variants: [
      { key: 'product-grid',  label: 'Product Grid',  description: '5-column product cards with image + price' },
      { key: 'list',          label: 'Compact List',  description: 'Dense list with SKU + price' },
      { key: 'featured',      label: 'Featured',      description: '1 hero part + grid below' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'case_studies',
    pageKey: 'product',
    type: 'case_studies',
    label: 'Case Studies',
    description: 'Real deployment case studies for this product',
    icon: '📁',
    defaultOrder: 100,
    defaultVariant: 'card-grid',
    defaultHeading: 'Case Studies',
    defaultEyebrow: 'Real Deployments',
    defaultBgColor: 'white',
    isDynamic: true,
    variants: [
      { key: 'card-grid',    label: 'Card Grid',    description: 'Image + title + industry cards' },
      { key: 'editorial',    label: 'Editorial',    description: 'Large hero case study + 2 below' },
      { key: 'minimal-list', label: 'Minimal List', description: 'Text-only with industry tags' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'faq_product',
    pageKey: 'product',
    type: 'faq_accordion',
    label: 'Product FAQ',
    description: 'Product-specific FAQ accordion (editable in product editor)',
    icon: '❓',
    defaultOrder: 110,
    defaultVariant: 'centered',
    defaultHeading: 'Frequently Asked Questions',
    defaultEyebrow: 'Common Questions',
    defaultBgColor: 'gray',
    variants: [
      { key: 'centered',   label: 'Centered',   description: 'Centered column, white cards' },
      { key: 'split',      label: 'Split',      description: 'Questions left, CTA right' },
      { key: 'dark',       label: 'Dark',       description: 'Dark background' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'eyebrow', label: 'Eyebrow Label',   type: 'text' },
    ],
  },
  {
    key: 'reviews_product',
    pageKey: 'product',
    type: 'product_reviews',
    label: 'Reviews',
    description: 'Product-specific customer reviews',
    icon: '⭐',
    defaultOrder: 115,
    defaultVariant: 'card-grid',
    defaultHeading: 'Customer Reviews',
    defaultEyebrow: 'What Buyers Say',
    defaultBgColor: 'white',
    isDynamic: true,
    variants: [
      { key: 'card-grid',    label: 'Card Grid',      description: 'Rating cards in grid' },
      { key: 'featured-one', label: 'Featured Quote', description: 'Single large testimonial' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
    ],
  },
  {
    key: 'warranty',
    pageKey: 'product',
    type: 'warranty_banner',
    label: 'Warranty Banner',
    description: 'Warranty terms — shown only if warranty is enabled in product editor',
    icon: '🔧',
    defaultOrder: 120,
    defaultVariant: 'inline-card',
    defaultHeading: 'Manufacturer Warranty',
    defaultBgColor: 'brand',
    variants: [
      { key: 'inline-card',    label: 'Inline Card',   description: 'Green card within purchase panel' },
      { key: 'full-section',   label: 'Full Section',  description: 'Dedicated warranty section below gallery' },
      { key: 'banner-strip',   label: 'Banner Strip',  description: 'Thin announcement-style strip' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
    ],
  },
  {
    key: 'downloads',
    pageKey: 'product',
    type: 'downloads',
    label: 'Downloads',
    description: 'Brochures, datasheets, and compliance documents',
    icon: '📥',
    defaultOrder: 125,
    defaultVariant: 'file-cards',
    defaultHeading: 'Downloads',
    defaultEyebrow: 'Documentation',
    defaultBgColor: 'gray',
    variants: [
      { key: 'file-cards',  label: 'File Cards',  description: 'Cards with file type icon + download button' },
      { key: 'list',        label: 'Simple List', description: 'Link list with file info' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
    ],
  },
  {
    key: 'rfq_product',
    pageKey: 'product',
    type: 'rfq_form',
    label: 'Product RFQ / Contact',
    description: 'Product-specific quote request form + WhatsApp CTA',
    icon: '📋',
    defaultOrder: 130,
    defaultVariant: 'split-form',
    defaultHeading: 'Get a tailored quote',
    defaultSubheading: 'Tender, GeM, dealer, and bulk inquiries welcome. Our team responds within 24 hours.',
    defaultEyebrow: 'Request a Quote',
    defaultBgColor: 'white',
    isRequired: true,
    variants: [
      { key: 'split-form',    label: 'Split Form',   description: 'Benefits + trust left, form right' },
      { key: 'centered-form', label: 'Centered',     description: 'Centered form, clean white' },
      { key: 'dark-form',     label: 'Dark Form',    description: 'Dark background with white form' },
    ],
    fields: [
      { key: 'heading',    label: 'Heading',    type: 'text' },
      { key: 'subheading', label: 'Subheading', type: 'textarea' },
      { key: 'ctaText',    label: 'WhatsApp CTA Text', type: 'text' },
    ],
  },
  {
    key: 'related_products',
    pageKey: 'product',
    type: 'related_products',
    label: 'Related Products',
    description: 'Other products from the same category',
    icon: '🔗',
    defaultOrder: 135,
    defaultVariant: 'card-row',
    defaultHeading: 'You may also like',
    defaultEyebrow: 'Related Products',
    defaultBgColor: 'gray',
    isDynamic: true,
    variants: [
      { key: 'card-row',  label: 'Card Row',  description: 'Horizontal scroll row of product cards' },
      { key: 'grid-3',    label: '3-col Grid', description: '3-column product card grid' },
    ],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeRecord(def: SectionDef, record?: PageSectionRecord): ResolvedSection {
  return {
    key:             def.key,
    pageKey:         record?.pageKey ?? def.pageKey,
    type:            def.type,
    label:           def.label,
    icon:            record?.icon ?? def.icon,
    isEnabled:       record?.isEnabled ?? true,
    order:           record?.order ?? def.defaultOrder,
    variant:         record?.variant ?? def.defaultVariant,
    heading:         record?.heading ?? def.defaultHeading ?? '',
    subheading:      record?.subheading ?? def.defaultSubheading ?? '',
    eyebrow:         record?.eyebrow ?? def.defaultEyebrow ?? '',
    bgColor:         record?.bgColor ?? def.defaultBgColor,
    bgImage:         record?.bgImage ?? '',
    ctaText:         record?.ctaText ?? '',
    ctaHref:         record?.ctaHref ?? '',
    ctaSecondaryText: record?.ctaSecondaryText ?? '',
    ctaSecondaryHref: record?.ctaSecondaryHref ?? '',
    config:          record?.config ?? {},
    def,
  }
}

/**
 * Merge DB records onto the static section definitions.
 * Returns all sections, ordered by resolved order value.
 */
export function resolveSections(
  defs:    SectionDef[],
  records: PageSectionRecord[],
): ResolvedSection[] {
  const byKey = new Map<string, PageSectionRecord>()
  for (const r of records) byKey.set(r.sectionKey, r)

  return defs
    .map(def => mergeRecord(def, byKey.get(def.key)))
    .sort((a, b) => a.order - b.order)
}

/** Returns a key-indexed map for O(1) section lookups in render functions */
export function toSectionMap(resolved: ResolvedSection[]): Record<string, ResolvedSection> {
  return Object.fromEntries(resolved.map(s => [s.key, s]))
}

/** All defs combined */
export const ALL_SECTION_DEFS = [...HOMEPAGE_SECTIONS, ...PRODUCT_SECTIONS]

/** Lookup a def by key */
export function getSectionDef(key: string): SectionDef | undefined {
  return ALL_SECTION_DEFS.find(d => d.key === key)
}
