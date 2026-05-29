// Types and defaults only — safe to import in client components (no server-only deps)

export interface HomeContentFaq {
  q: string
  a: string
}

export interface HomeContentStep {
  title: string
  body: string
  details?: string
  mediaType?: 'none' | 'image' | 'gif' | 'video'
  mediaUrl?: string
  mediaAlt?: string
}

export interface HomeContentStat {
  value: string
  label: string
}

export interface HomeContentConnector {
  eyebrow: string
  text: string
}

export interface HomeContent {
  manufacturerIntro: {
    badge: string
    headline: string
    body: string
    bullets: string[]
    section1Title: string
    section1Body: string
    section2Title: string
    section2Body: string
    whyChooseTitle: string
    whyChooseBullets: string[]
    imageUrl: string
    imageAlt: string
  }
  technology: {
    badge: string
    headline: string
    body: string
    videoUrl?: string
    videoPoster?: string
    videoAlt?: string
    steps: HomeContentStep[]
    benefitsTitle: string
    benefits: HomeContentStep[]
  }
  manufacturingAuthority: {
    eyebrow: string
    headline: string
    body: string
    stats: HomeContentStat[]
  }
  faqs: HomeContentFaq[]
  connectors: {
    c1: HomeContentConnector
    c2: HomeContentConnector
    c3: HomeContentConnector
    c4: HomeContentConnector
  }
}

export const DEFAULT_HOME_CONTENT: HomeContent = {
  manufacturerIntro: {
    badge: 'Trusted Manufacturer',
    headline: 'Trusted Thermal Fogging Machine Manufacturer in India',
    body: '100X Circle designs and manufactures field-ready thermal foggers from our Gurugram facility — trusted by 10,000+ customers including municipalities, Nagar Nigams, agricultural cooperatives, and private pest-control operators.',
    bullets: ['GeM-approved OEM', 'Made in India', '10,000+ customers', '50+ distributors'],
    section1Title: 'Public Health Fogging Solutions',
    section1Body: 'Industrial thermal fogging equipment built for large-scale mosquito control drives. Pulse-jet technology penetrates thick vegetation, open drains, and construction sites where conventional spraying cannot reach. GeM-procurable for municipal bodies, Nagar Panchayats, and public health departments across Bihar, UP, Delhi, Maharashtra, Gujarat, and beyond.',
    section2Title: 'Agricultural Fogging Machines for Farm-Level Use',
    section2Body: 'Lightweight, single-operator foggers used by farmers across India to apply fungicides, pesticides, and plant growth regulators across orchards, paddy fields, and vegetable farms. Handles both diesel-based and water-based formulations.',
    whyChooseTitle: 'Why Choose 100X Circle',
    whyChooseBullets: [
      '10+ years of focused manufacturing experience in fogging equipment',
      'GeM-approved OEM status for direct government procurement',
      'Pulse-jet engine technology for consistent, powerful fog output',
      '50+ active distributors across India for local support',
      'Full range covering vehicle-mounted, portable, and combination foggers',
      'Direct warranty and after-sales service from the manufacturer',
    ],
    imageUrl: '/production.png',
    imageAlt: '100X Circle thermal fogging machine manufacturing in Gurugram',
  },
  technology: {
    badge: 'How It Works',
    headline: 'Pulse-Jet Thermal Fogging Technology',
    body: 'Four engineered stages that turn a fuel-air spark into a dense, deep-penetrating fog — built for both municipal vector control and agricultural crop protection.',
    steps: [
      {
        title: 'Pulse-Jet Combustion',
        body: 'A pulse-jet engine ignites a controlled fuel-air mix at high frequency — no moving compressor parts, low maintenance, consistent output.',
      },
      {
        title: 'Chemical Vaporization',
        body: 'Heat from the combustion chamber vaporizes the chemical or water-based solution as it passes through the resonator tube.',
      },
      {
        title: 'Ultra-Fine Fog Ejection',
        body: 'The vapor cools instantly at the nozzle, forming sub-50-micron droplets — small enough to drift, large enough to deposit on target surfaces.',
      },
      {
        title: 'Deep Penetration',
        body: 'The dense fog penetrates foliage, open drains, voids, and construction sites that conventional sprayers cannot reach.',
      },
    ],
    benefitsTitle: 'Why pulse-jet beats conventional spraying',
    benefits: [
      {
        title: 'Lower Chemical Consumption',
        body: 'Up to 10× less pesticide per acre compared to manual spraying — ultra-fine droplets cover more surface area per litre.',
      },
      {
        title: 'Effective Vector Control',
        body: 'Field-proven against dengue, malaria, and chikungunya vectors. Deployed by municipal bodies during outbreaks.',
      },
      {
        title: 'Municipal-Grade',
        body: 'GeM-listed OEM equipment trusted by Nagar Nigams, Nagar Palikas, and Panchayats for public-health fogging drives.',
      },
      {
        title: 'Agricultural Applications',
        body: 'Pesticides, fungicides, and plant-growth regulators for orchards, paddy fields, and vegetable farms — single-operator friendly.',
      },
    ],
  },
  manufacturingAuthority: {
    eyebrow: 'Manufacturing Authority',
    headline: 'Designed, Built, and Tested in India',
    body: 'Pulse-jet thermal foggers engineered and assembled at our Gurugram facility. Every machine field-tested for Indian conditions before it ships — from monsoon humidity to high-vegetation municipal terrain.',
    stats: [
      { value: 'Gurugram', label: 'Manufacturing facility' },
      { value: '10+ years', label: 'Of OEM production' },
      { value: 'In-house', label: 'Engineering & assembly' },
      { value: '50+', label: 'Distribution points' },
    ],
  },
  faqs: [
    {
      q: 'Which 100x Circle fogging machine should I buy for municipal mosquito control?',
      a: 'For city-wide and ward-level mosquito control drives, the Double Barrel Vehicle-Mounted Thermal Fogging Machine (100XDB400) is the most common choice — its high fog output and vehicle-mounted design covers large outdoor areas quickly. For smaller wards, hospitals, or housing societies, the Thermal & Cold Fogging Machine (100XTFS50) or the Stainless Steel Tank Thermal Fogger (100XSSMA20) are typically a better fit.',
    },
    {
      q: 'What is the difference between thermal fogging and cold (ULV) fogging?',
      a: 'Thermal fogging uses heat to vapourise the fogging solution into a dense visible cloud — ideal for outdoor mosquito and vector control where coverage matters. Cold (ULV) fogging uses mechanical pressure to create fine droplets without heat — preferred for indoor disinfection or temperature-sensitive chemicals. Our 100XTFS50 supports both modes.',
    },
    {
      q: 'Are 100x Circle fogging machines suitable for GeM and government tenders?',
      a: 'Yes. We supply municipal corporations, panchayats, and government health departments across India. Share your tender or GeM requirement (model, quantity, delivery state, compliance certificates) on WhatsApp or via our contact form and our team will respond with a tender-ready quote and supporting documents.',
    },
    {
      q: 'Do you ship across India, and what is the typical delivery time?',
      a: 'Yes — we dispatch nationwide from Gurugram, Haryana. Standard delivery is 5–10 working days for in-stock models, longer for custom configurations or bulk orders. Bulk and institutional buyers should request a delivery commitment as part of the quote.',
    },
    {
      q: 'What warranty and after-sales support do you provide?',
      a: "All 100x Circle fogging machines ship with a manufacturer's warranty against material and manufacturing defects. We provide on-call technical support, spares supply, and service documentation in English and Hindi. Specific warranty terms are confirmed at the time of quotation.",
    },
    {
      q: 'Can I become a 100x Circle dealer or distributor?',
      a: "Yes — we partner with dealers, distributors, and channel partners across Indian states. Reach out via the contact form or WhatsApp with your location and channel experience, and we'll share margins, territory availability, and onboarding details.",
    },
  ],
  connectors: {
    c1: { eyebrow: 'Built for India', text: 'A decade of manufacturing for the field.' },
    c2: { eyebrow: 'The Range', text: 'From handheld to vehicle-mounted.' },
    c3: { eyebrow: 'The Technology', text: 'Inside every 100X fogger.' },
    c4: { eyebrow: 'In Their Words', text: 'Reviews from the field.' },
  },
}
