/**
 * Canonical registry for SEO landing pages routed under `/[slug]`.
 *
 * Single source of truth: page type, theme, metadata, hero copy, body
 * sections, FAQs, related links. The sitemap, metadata builder, on-page
 * content, structured data, breadcrumbs, related-product filtering, the
 * audience-aware mobile-CTA bar, and the footer "Popular Products" column
 * all read from here. Launching a new landing page is a **one-file edit**.
 *
 * To add a landing page:
 *   1. Append an entry to `LANDING_PAGES` below.
 *   2. (Optional) Add a permanent redirect from any legacy URL in
 *      `next.config.mjs::redirects`.
 *   3. Everything else picks the new page up automatically.
 *
 * Section vocabulary lives in `./landing-types.ts`.
 */

import { DEFAULT_THEME_BY_TYPE, type LandingPageDef } from "./landing-types"

// ─── Re-exports so existing consumers don't need to update import paths ──
export type { LandingPageDef }
export {
  DEFAULT_THEME_BY_TYPE,
  DEFAULT_SITEMAP_BY_TYPE,
  FORM_SUBMISSION_TYPE,
} from "./landing-types"
export type {
  LandingType,
  LandingTheme,
  LandingSection,
  LandingFormVariant,
  HeroBlock,
  HeroHeadlinePart,
  TrustMetric,
  BenefitItem,
  ProcessStep,
  ComparisonRow,
  CaseStudy,
  FaqEntry,
  CtaBandData,
} from "./landing-types"

/** Legacy alias retained for any external imports. */
export type ContentSection = NonNullable<LandingPageDef["content1"]>

export const LANDING_PAGES: Record<string, LandingPageDef> = {
  "thermal-and-cold-fogging-machine-100xtfs50": {
    slug: "thermal-and-cold-fogging-machine-100xtfs50",
    type: "product",
    metadata: {
      title: "Buy Thermal and Cold Fogging Machine | 100x Circle",
      description:
        "Buy thermal and cold fogging machines from 100x Circle. High-performance, durable foggers for mosquito control and industrial use across India. Contact us today!",
      keywords:
        "buy thermal and cold fogging machine, fogging machine price in india, thermal cold fogger manufacturer india, industrial thermal cold fogging machine supplier, mosquito fogging machine price, order thermal fogging machine",
    },
    content1: {
      h2: "Thermal and Cold Fogging in One Machine — How the 100XTFS50 Works",
      p: [
        "In thermal mode, the 100XTFS50 heats the chemical formulation to vaporisation temperature, producing a dense visible fog that travels long distances and penetrates dense vegetation effectively. This mode is best suited for outdoor use in open areas, parks, drains, roadside verges, and agricultural fields where the fog cloud needs to carry deep into the target environment.",
        "In cold mode, the machine switches to a high-pressure air-blast mechanism that atomises the liquid into ultra-fine droplets without heat. This mode is ideal for enclosed spaces such as hospital wards, food warehouses, hotel kitchens, and residential apartments where thermal fogging would create visibility hazards or risk heat-sensitive surfaces. The mode-switching mechanism is built to remain reliable across repeated transitions throughout the machine's working life.",
      ],
    },
    content2: {
      h2: "Industrial Thermal Cold Fogger for Commercial Pest Control",
      p: [
        "Commercial pest control companies operate across a wide range of site types in a single working week. One day might involve outdoor mosquito treatment in a residential colony. The next might require indoor sanitisation at a food processing plant. A single machine that handles both jobs removes the logistical complexity of managing separate equipment inventories for different application types.",
        "The 100XTFS50 has been adopted by pest control businesses across India for exactly this reason. It reduces equipment costs, simplifies team training, and allows a single operator to handle both indoor and outdoor applications with confidence. The build quality ensures consistent fog output campaign after campaign without the maintenance overhead of running two separate machines.",
      ],
    },
    content3: {
      h2: "Public Health and Agricultural Applications",
      p: [
        "Municipal corporations and district health departments running vector control programmes appreciate the versatility of the 100XTFS50. A single health team can use the machine in thermal mode for outdoor area treatment during the day and switch to cold mode for targeted indoor treatment in identified disease clusters without returning to base for different equipment.",
        "For agriculture, the cold fogging mode is particularly valuable for applying fungicides and systemic pesticides inside enclosed greenhouses, polyhouses, and storage facilities. The fine droplet size produced in cold mode ensures thorough coverage of leaf surfaces with minimal run-off, improving treatment efficiency and reducing chemical waste — genuine multi-application value across Indian field conditions.",
      ],
    },
  },
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400": {
    slug: "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
    type: "product",
    metadata: {
      title: "Buy Double Barrel Thermal Fogging Machine | 100x Circle",
      description:
        "Buy Double Barrel Thermal Fogging Machine from 100x Circle. High-power, durable fogger for industrial mosquito control and public health use. Contact us today!",
      keywords:
        "buy double barrel thermal fogging machine, vehicle mounted thermal fogger manufacturer india, vehicle mounted fogging machine, heavy duty vehicle mount fogging machine supplier, double barrel fogging machine",
    },
    content1: {
      h2: "Vehicle-Mounted Mounting and Field Stability",
      p: [
        "The 100XDB400 is engineered for secure vehicle integration. The mounting frame is designed to fit the load beds of standard utility vehicles and municipal trucks without requiring custom fabrication. Vibration dampeners protect the engine and nozzle assembly during transit across uneven roads, ensuring the machine arrives at the application site in operational condition.",
        "The unit can be deployed from the vehicle within minutes, making it practical for teams that need to move between multiple sites in a single day. The 100XDB400 has been refined based on direct feedback from municipal corporations and public health teams who run it during high-pressure seasonal campaigns.",
      ],
    },
    content2: {
      h2: "Industrial Thermal Fogging Through Dual-Barrel Output",
      p: [
        "The defining feature of the 100XDB400 is its dual-barrel configuration. Each barrel functions as an independent fogging unit, powered by the same pulse jet engine through a split feed system. Both barrels generate fog simultaneously, doubling the coverage width and significantly increasing the volume of fog distributed per minute compared to single-barrel designs.",
        "For industrial fogging operations that require consistent particle size and uniform dispersion across wide areas, this configuration is highly effective. The fine thermal fog penetrates dense vegetation, roadside ditches, and low-lying areas where mosquitoes breed and shelter — particularly suited to large outdoor public health operations.",
      ],
    },
    content3: {
      h2: "Vector Control Equipment Built for Sustained Use",
      p: [
        "Government vector control programmes often run continuously during peak mosquito seasons, sometimes for weeks at a stretch. The 100XDB400 is built to handle this kind of sustained operational demand. The fuel-efficient engine is designed for all-day use, and the high-capacity chemical tank reduces the frequency of refill stops. Key components exposed to thermal and chemical stress are manufactured from heat-resistant and corrosion-resistant materials to extend service life.",
        "As vector-control equipment for government health bodies and pest-control operators, the 100XDB400 comes with full documentation — product specifications, operating manual, warranty certificate, and GST invoice — all necessary for institutional procurement records. The machine is also available through the Government e-Marketplace (GeM) for procurement by state and central government departments.",
      ],
    },
  },
  // ─── GeM / Government / OEM authority page ───────────────────────────
  "gem-approved-fogging-machine-oem": {
    slug: "gem-approved-fogging-machine-oem",
    type: "gem",
    metadata: {
      title: "Fogging Machines on GeM Portal | OEM Code & Supply | 100x Circle",
      description:
        "Buy fogging machines on GeM (Q2 category) or register as OEM reseller. Spec-compliant, factory pricing, Pan-India delivery. Get OEM code in 24 hrs.",
      keywords:
        "gem approved fogging machine oem, gem oem reseller code fogging machine, gem q2 category fogging machine, government fogging machine supplier, oem authorization fogging machine india",
    },
    hero: {
      eyebrow: "GeM Q2 Category — Fogging Machines",
      navBadge: "GeM Approved OEM",
      headline: [
        { text: "Sell Fogging Machines on" },
        { text: "GeM Portal", accent: "green" },
        { text: "with" },
        { text: "Approved OEM Support", accent: "yellow" },
      ],
      sub: "100x Circle is a GeM-approved OEM manufacturer for Fogging Machines (Q2 category). Get OEM Reseller Code, GeM-compliant machines, and direct factory pricing — everything you need to start winning government orders.",
      primary: { label: "Register as Reseller", href: "#landing-form", track: "gem_hero_primary" },
      secondary: {
        label: "WhatsApp Us",
        href:
          "https://wa.me/917827229116?text=Hi%2C%20I%20am%20a%20GeM%20reseller%20and%20interested%20in%20OEM%20code%20for%20Fogging%20Machines",
        track: "gem_hero_whatsapp",
      },
    },
    sections: [
      {
        kind: "trust-strip",
        metrics: [
          { value: "10,000+", label: "Happy customers" },
          { value: "50+", label: "Active distributors" },
          { value: "10+", label: "Years experience" },
          { value: "GeM Q2", label: "OEM certified" },
          { value: "Pan India", label: "Supply & support" },
        ],
      },
      {
        kind: "benefits-grid",
        eyebrow: "Why partner with us",
        title: "Everything a GeM reseller needs in one place",
        items: [
          { icon: "🏛️", title: "GeM-Approved OEM Status", description: "Registered and approved on GeM portal for Fogging Machines under Q2 — your listings get full compliance credibility from day one." },
          { icon: "📄", title: "OEM Reseller Code Support", description: "We issue the OEM Reseller Authorization Code you need to list our machines on your GeM seller account." },
          { icon: "✅", title: "Spec-Compliant Catalogue", description: "Every machine meets GeM technical specifications — no rejections, no compliance back-and-forth, guaranteed delivery on government orders." },
          { icon: "💰", title: "Direct Factory Pricing", description: "Direct supply from our Gurugram plant with no middlemen — maximise your margin on every GeM order you fulfil." },
          { icon: "🚚", title: "Pan-India Delivery", description: "We deliver across India — Bihar, UP, Maharashtra, Karnataka, the North-East and everywhere in between, on time, with dispatch documents." },
          { icon: "🤝", title: "Dedicated Reseller Support", description: "Account manager, GST invoices, dispatch documents, and everything needed to close your GeM orders smoothly." },
        ],
      },
      {
        kind: "process-timeline",
        eyebrow: "Process",
        title: "How to get started",
        steps: [
          { title: "Fill the reseller registration form", description: "Share your GeM Seller ID, GST number, and company details. Takes under two minutes." },
          { title: "We verify and reach out", description: "Our team verifies your GeM seller profile and calls back within 24 hours to begin the OEM authorization process." },
          { title: "Receive OEM Reseller Authorization", description: "We share the OEM code, technical catalogue, and pricing so you can list our machines on your GeM account immediately." },
          { title: "Start winning GeM orders", description: "Bid on government tenders, win orders, we ship directly. You earn the margin — hassle-free." },
        ],
      },
      {
        kind: "form",
        variant: "reseller",
        eyebrow: "Reseller registration",
        title: "Register now and get OEM code",
        sub: "Limited reseller slots open this quarter — register today to secure your OEM authorization and start listing on GeM.",
        checklist: [
          "GeM Q2 category OEM authorization",
          "Spec-compliant machine catalogue",
          "Best price quote within 24 hours",
          "Dedicated GeM support team access",
          "GST invoice + dispatch documents",
        ],
      },
      {
        kind: "case-studies",
        eyebrow: "Trusted by public health teams",
        title: "Recent government & municipal deployments",
        items: [
          { client: "Municipal Corporation, Tier-1 city", location: "North India", result: "120 thermal foggers delivered against GeM order; full coverage in monsoon vector-control drive." },
          { client: "State Health Department", location: "Eastern India", result: "Vehicle-mounted units deployed across 14 districts for dengue / chikungunya control." },
          { client: "Cantonment Board", location: "Western India", result: "SS-tank thermal foggers procured for year-round campus and quarters sanitation." },
        ],
      },
    ],
    faqs: [
      { q: "What is 'GeM-approved OEM' and why does it matter for resellers?", a: "GeM-approved OEM means 100x Circle is registered on the Government e-Marketplace as the original manufacturer for our fogging machine SKUs. Resellers can list these SKUs on their own GeM seller account once we issue an OEM Reseller Authorization Code — without that authorization, your listing is non-compliant and gets rejected at order acceptance." },
      { q: "Which GeM category are 100x Circle fogging machines listed under?", a: "Q2 — Pest Control Equipment / Fogging Machines. Our SKUs include thermal foggers, cold (ULV) foggers, vehicle-mounted units, and stainless-steel-tank variants — all spec-mapped to the active GeM technical sheets." },
      { q: "Do I need to be a registered GeM seller before applying for OEM code?", a: "Yes. You'll need an active GeM Seller ID and a valid GSTIN before we can issue the OEM Reseller Authorization. If you're new to GeM, we can guide you to the registration flow but the seller account itself has to be in your name." },
      { q: "Is there any fee to become an authorized GeM reseller?", a: "No — there is no joining fee. We earn through the wholesale rate we offer; you earn the difference between our rate and your GeM listing price." },
      { q: "How quickly will I receive the OEM authorization after I register?", a: "Typically within 24–48 hours of receiving your registration. Our team verifies your GeM seller profile, GST status, and basic KYC before issuing the OEM code." },
    ],
    relatedLandingSlugs: [
      "thermal-and-cold-fogging-machine-100xtfs50",
      "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
    ],
  },

  // ─── State page: Uttar Pradesh ───────────────────────────────────────
  "fogging-machine-supplier-in-uttar-pradesh": {
    slug: "fogging-machine-supplier-in-uttar-pradesh",
    type: "state",
    metadata: {
      title: "Fogging Machine Supplier in Uttar Pradesh | 100x Circle",
      description:
        "100x Circle supplies thermal & vehicle-mounted fogging machines across Uttar Pradesh. Lucknow, Kanpur, Varanasi, Agra, Noida — direct factory dispatch, GST invoice, tender support.",
      keywords:
        "fogging machine supplier in uttar pradesh, thermal fogging machine in up, mosquito fogging machine lucknow, vehicle mounted fogger up, fogging machine kanpur varanasi agra noida",
    },
    hero: {
      eyebrow: "Uttar Pradesh Supply Network",
      headline: "Fogging Machine Supplier in Uttar Pradesh",
      sub: "100x Circle dispatches thermal, cold, and vehicle-mounted fogging machines across Uttar Pradesh — from Lucknow and Kanpur to Varanasi, Agra, and Noida. Tender-ready quotes, GST invoices, and dedicated support for municipal corporations, dealers, and pest-control companies.",
      primary: { label: "Get UP Tender Quote", href: "#landing-form", track: "up_hero_primary" },
      secondary: {
        label: "Call Us Now",
        href: "tel:+917827229116",
        track: "up_hero_call",
      },
    },
    sections: [
      {
        kind: "trust-strip",
        metrics: [
          { value: "1,500+", label: "UP customers" },
          { value: "75+", label: "Districts served" },
          { value: "24–72h", label: "Dispatch time" },
          { value: "GST", label: "Invoiced supply" },
          { value: "Pan-UP", label: "After-sales support" },
        ],
      },
      {
        kind: "benefits-grid",
        eyebrow: "Why UP buyers choose 100x Circle",
        title: "Dispatch, compliance, and support — built for UP",
        items: [
          { icon: "📦", title: "Fast dispatch to all UP districts", description: "We ship from Gurugram with 24–72 hour transit for most UP destinations. Bulk orders coordinated directly with the district logistics lead." },
          { icon: "🏛️", title: "Tender & GeM ready", description: "We're a GeM-approved OEM. Tender documents, technical specs, compliance certificates, and authorization letters are ready when you need them." },
          { icon: "🛠️", title: "After-sales support across UP", description: "On-call technical support in English and Hindi, spares dispatched directly, video walkthroughs for first-time field teams." },
          { icon: "💼", title: "Channel partner programme", description: "Dealer and distributor slots open across UP — Lucknow, Kanpur, Varanasi, Agra, Noida, Meerut, Allahabad, and Tier-2 cities." },
        ],
      },
      {
        kind: "recommended-products",
        eyebrow: "Most-requested in UP",
        title: "Machines our UP buyers pick",
        slugs: [
          "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
          "thermal-and-cold-fogging-machine-100xtfs50",
          "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
        ],
      },
      {
        kind: "case-studies",
        eyebrow: "UP deployments",
        title: "Recent supply across Uttar Pradesh",
        items: [
          { client: "Municipal Corporation (Lucknow region)", location: "Lucknow, UP", result: "Vehicle-mounted thermal foggers deployed pre-monsoon for ward-level mosquito control." },
          { client: "Health Department, Tier-2 city", location: "Western UP", result: "SS-tank thermal foggers supplied for hospital + market disinfection drives." },
          { client: "Cantonment Board", location: "Eastern UP", result: "Double-barrel vehicle-mounted system fulfilling year-round fogging for the cantonment area." },
        ],
      },
      {
        kind: "form",
        variant: "tender-quote",
        eyebrow: "Tender / quote request",
        title: "Get a UP-ready quote in 24 hours",
        sub: "Share your tender reference, machine requirement, and delivery district. We respond within 24 hours with quote, compliance docs, and timeline.",
        checklist: [
          "Tender-compliant technical spec sheets",
          "GST-invoiced direct factory dispatch",
          "On-site briefing for field teams (if required)",
          "OEM authorization letter for resellers",
        ],
      },
      {
        kind: "cta-band",
        band: {
          heading: "Need to speak to someone in UP today?",
          sub: "Our sales team answers 9 AM – 6 PM IST every working day.",
          primary: { label: "Call +91 78272 29116", href: "tel:+917827229116" },
          secondary: { label: "WhatsApp", href: "https://wa.me/917827229116?text=I%27m%20in%20Uttar%20Pradesh%20and%20want%20a%20quote%20for%20fogging%20machines" },
        },
      },
    ],
    faqs: [
      { q: "Do you supply fogging machines to all districts in Uttar Pradesh?", a: "Yes — we dispatch from our Gurugram facility to every UP district. Transit time is typically 24–72 hours depending on the destination and freight option. Bulk and tender orders get a confirmed delivery commitment in the quote." },
      { q: "Are 100x Circle machines acceptable for UP tenders and GeM listings?", a: "Yes. We're a GeM-approved OEM for fogging machines and our SKUs map to the standard tender technical specifications used by municipal corporations and state health departments in UP. We provide all supporting documents — OEM authorization letter, GST invoice, dispatch challan, warranty certificate." },
      { q: "Do you offer dealer or distributor opportunities in Uttar Pradesh?", a: "Yes — we onboard dealers across UP. Reach out via the form above with your city, current business, and target volume. Margins, territory exclusivity, and onboarding are discussed in the first call." },
      { q: "What after-sales support do UP customers get?", a: "On-call technical support in English and Hindi, spare-parts dispatch from Gurugram, troubleshooting videos for first-time field teams, and on-site assistance for large institutional buyers." },
    ],
    relatedLandingSlugs: [
      "gem-approved-fogging-machine-oem",
      "dengue-control-fogging-machine",
      "thermal-vs-cold-fogging-machine",
    ],
  },

  // ─── State page: Bihar ────────────────────────────────────────────────
  "fogging-machine-supplier-in-bihar": {
    slug: "fogging-machine-supplier-in-bihar",
    type: "state",
    metadata: {
      title: "Fogging Machine Supplier in Bihar | 100x Circle",
      description:
        "100x Circle supplies thermal & vehicle-mounted fogging machines across Bihar — Patna, Muzaffarpur, Gaya, Bhagalpur, Darbhanga. Local stock, tender support, GST-invoiced dispatch.",
      keywords:
        "fogging machine supplier in bihar, thermal fogging machine in bihar, mosquito fogging machine patna, vehicle mounted fogger bihar, fogging machine muzaffarpur gaya bhagalpur",
    },
    hero: {
      eyebrow: "Bihar & Eastern India Supply Network",
      headline: "Fogging Machine Supplier in Bihar",
      sub: "Seasonal flooding, dense populations, and recurring mosquito-borne disease drives make Bihar one of India's highest-demand zones for fogging equipment. 100x Circle has been supplying thermal, cold, and vehicle-mounted machines to Bihar's government health departments and private pest-control operators for over a decade — with local stock, GST invoicing, and on-the-ground support.",
      primary: { label: "Get a Bihar Tender Quote", href: "#landing-form", track: "bihar_hero_primary" },
      secondary: {
        label: "Call Us Now",
        href: "tel:+917827229116",
        track: "bihar_hero_call",
      },
    },
    sections: [
      {
        kind: "trust-strip",
        metrics: [
          { value: "10+ yrs", label: "Supplying Bihar" },
          { value: "Local", label: "Stock points" },
          { value: "24–72h", label: "Dispatch time" },
          { value: "GST", label: "Invoiced supply" },
          { value: "Hindi", label: "Field-team support" },
        ],
      },
      {
        kind: "benefits-grid",
        eyebrow: "Why Bihar buyers choose 100x Circle",
        title: "Built for Bihar's terrain, season, and tender process",
        items: [
          { icon: "📦", title: "Local stock — short wait times", description: "Machines stocked at distribution points in Bihar so customers don't wait for long transits from our Gurugram facility. Most in-stock models dispatch within 24–72 hours." },
          { icon: "🌧️", title: "Built for Bihar's climate", description: "Engineered to handle the heat, humidity, monsoon flooding, and rough terrain typical of field operations across Bihar and Jharkhand — not a generic spec sheet." },
          { icon: "🏛️", title: "Tender & GeM ready", description: "GeM-approved OEM. Full tender dossier — technical specs, compliance certificates, OEM authorisation letter, GST-invoiced dispatch — supplied with every quote." },
          { icon: "🤝", title: "Local setup + training support", description: "On-the-ground team for initial setup, operator training in Hindi, and routine maintenance guidance. Spare parts dispatched directly from Gurugram." },
        ],
      },
      {
        kind: "recommended-products",
        eyebrow: "Most-requested in Bihar",
        title: "Machines our Bihar buyers pick",
        slugs: [
          "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
          "thermal-and-cold-fogging-machine-100xtfs50",
          "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
        ],
      },
      {
        kind: "case-studies",
        eyebrow: "Bihar deployments",
        title: "Recent supply across Bihar and Jharkhand",
        items: [
          { client: "District Health Department", location: "Central Bihar", result: "Pre-monsoon dengue control drive — vehicle-mounted double-barrel units across multiple blocks." },
          { client: "Private pest-control operator", location: "Patna & Muzaffarpur", result: "SS-tank thermal foggers deployed for housing societies, hospitals, and commercial sites." },
          { client: "Agricultural cooperative", location: "North Bihar", result: "Portable thermal foggers for crop protection and farm-level pest control across cooperative member farms." },
        ],
      },
      {
        kind: "form",
        variant: "tender-quote",
        eyebrow: "Tender / quote request",
        title: "Get a Bihar-ready quote in 24 hours",
        sub: "Share your tender reference, machine requirement, and delivery district. We respond within 24 hours with quote, compliance documentation, and dispatch timeline.",
        checklist: [
          "Tender-compliant technical spec sheets",
          "GST-invoiced direct factory dispatch",
          "On-site briefing for field teams (if required)",
          "OEM authorisation letter for resellers",
        ],
      },
      {
        kind: "cta-band",
        band: {
          heading: "Need to speak to someone in Bihar today?",
          sub: "Our sales team answers 9 AM – 6 PM IST every working day.",
          primary: { label: "Call +91 78272 29116", href: "tel:+917827229116" },
          secondary: { label: "WhatsApp", href: "https://wa.me/917827229116?text=I%27m%20in%20Bihar%20and%20want%20a%20quote%20for%20fogging%20machines" },
        },
      },
    ],
    faqs: [
      { q: "Do you stock fogging machines locally in Bihar?", a: "Yes — we maintain distribution points in Bihar so customers placing an order don't have to wait for transit from our Gurugram facility. Most in-stock models dispatch within 24–72 hours of confirmed order. Bulk and tender orders get a confirmed delivery commitment as part of the quote." },
      { q: "Which 100x Circle fogger is most commonly supplied to municipal corporations in Bihar?", a: "The Double Barrel Vehicle-Mounted Thermal Fogging Machine (100XDB400) for city-wide and ward-level mosquito control drives, often paired with portable SS-tank thermal foggers (100XSSMA20) for parks, hospitals, schools, and residential clusters where the vehicle can't enter." },
      { q: "Are 100x Circle machines acceptable for Bihar government tenders and GeM listings?", a: "Yes. We're a GeM-approved OEM for fogging machines and our SKUs map to the standard tender technical specifications used by Bihar municipal corporations, Nagar Nigams, panchayats, and the state health department. Every supply includes the OEM authorisation letter, GST invoice, dispatch challan, and warranty certificate procurement teams need." },
      { q: "Do you offer dealer or distributor opportunities in Bihar?", a: "Yes — channel partner slots are open across Bihar (Patna, Muzaffarpur, Gaya, Bhagalpur, Darbhanga, and Tier-2 cities). Reach out via the form above with your city, current business, and target volume — margins, territory, and onboarding are discussed in the first call." },
      { q: "What after-sales support do Bihar customers get?", a: "On-call technical support in English and Hindi, spare-parts dispatch from Gurugram, troubleshooting videos for first-time field teams, and on-site assistance for large institutional buyers. Our team has conducted operator training for Bihar health departments and can arrange the same for your team upon request." },
    ],
    relatedLandingSlugs: [
      "gem-approved-fogging-machine-oem",
      "fogging-machine-supplier-in-uttar-pradesh",
      "dengue-control-fogging-machine",
    ],
  },

  // ─── Use-case page: Dengue control ───────────────────────────────────
  "dengue-control-fogging-machine": {
    slug: "dengue-control-fogging-machine",
    type: "use-case",
    metadata: {
      title: "Dengue Control Fogging Machine | Municipal & Society Use | 100x Circle",
      description:
        "Fogging machines for dengue Aedes aegypti control. Used by municipal corporations and housing societies across India. Get a model recommendation in 24 hrs.",
      keywords:
        "dengue control fogging machine, aedes aegypti control fogger, dengue mosquito fogging machine india, public health fogging machine, vector control fogging equipment",
    },
    hero: {
      eyebrow: "Vector Control — Dengue & Chikungunya",
      headline: [
        { text: "Stop Dengue at the" },
        { text: "Source", accent: "green" },
        { text: "with proven fogging machines" },
      ],
      sub: "Aedes aegypti — the dengue vector — breeds close to homes and bites by day. The right fogger, the right droplet size, and the right application window break the transmission cycle. Here's what 100x Circle deploys for dengue control across municipal corporations, housing societies, and public health teams.",
      primary: { label: "Get a Dengue Control Quote", href: "#landing-form", track: "dengue_hero_primary" },
      secondary: {
        label: "WhatsApp the Team",
        href: "https://wa.me/917827229116?text=Hi%2C%20I%20need%20a%20fogging%20machine%20for%20dengue%20control",
        track: "dengue_hero_whatsapp",
      },
    },
    sections: [
      {
        kind: "trust-strip",
        metrics: [
          { value: "Aedes", label: "Aegypti targeted" },
          { value: "10–25μm", label: "Optimal droplet size" },
          { value: "Dawn / Dusk", label: "Application window" },
          { value: "Pan-India", label: "Public-health supply" },
        ],
      },
      {
        kind: "benefits-grid",
        eyebrow: "Why thermal fogging works for dengue",
        title: "What you actually need for a dengue drive",
        items: [
          { icon: "🦟", title: "Targets adult Aedes aegypti", description: "Thermal fogging produces a dense, visible fog with droplet sizes that contact resting and flying adult mosquitoes — including the day-biting Aedes responsible for dengue." },
          { icon: "🌫️", title: "Penetrates dense canopy and structures", description: "The hot fog drifts into vegetation, drains, water-storage cover areas, and shaded breeding spots where ULV alone misses." },
          { icon: "⚡", title: "Wide coverage per hour", description: "A vehicle-mounted double-barrel unit can fog several kilometres of road per hour — practical for ward-level municipal drives." },
          { icon: "🧪", title: "Compatible with approved insecticides", description: "Use any CIB-approved adulticide (pyrethroid, malathion, etc.) — our machines are calibrated for standard dilution rates." },
          { icon: "🚐", title: "Vehicle-mountable or portable", description: "Pick the form factor that fits — vehicle-mounted for city-wide ward drives, SS-tank portable for housing societies and hospital campuses." },
          { icon: "🛠️", title: "Field-tested durability", description: "Pulse-jet engines, stainless components, and serviceable parts — built to survive monsoon-season daily operation." },
        ],
      },
      {
        kind: "process-timeline",
        eyebrow: "Deployment workflow",
        title: "How a dengue fogging drive should run",
        steps: [
          { title: "Identify hot-spot wards", description: "Use dengue case data and previous-season hot-spots to prioritise wards. Aedes is a peridomestic mosquito — focus on residential clusters, schools, hospitals, and water-storage areas." },
          { title: "Schedule for dawn or dusk", description: "Aedes aegypti is most active in cooler twilight hours. Fogging during these windows maximises contact with active adults and reduces wasted insecticide." },
          { title: "Run the right form factor for the area", description: "Vehicle-mounted double-barrel for streets and open wards; portable thermal foggers for parks, hospital campuses, schools, and society compounds." },
          { title: "Pair with breeding-source reduction", description: "Fogging suppresses adult populations; it does not eliminate breeding. Run alongside container clean-up and larvicide treatment for sustained control." },
        ],
      },
      {
        kind: "recommended-products",
        eyebrow: "Recommended for dengue",
        title: "Picks for vector-control teams",
        slugs: [
          "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
          "thermal-and-cold-fogging-machine-100xtfs50",
          "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
        ],
      },
      {
        kind: "case-studies",
        eyebrow: "Public health deployments",
        title: "Used in real dengue drives",
        items: [
          { client: "Municipal Health Office", location: "North India", result: "Pre-monsoon ward-by-ward thermal fogging using double-barrel vehicle-mounted units." },
          { client: "Cantonment Health Cell", location: "Western India", result: "SS-tank portable foggers across campus quarters, schools, and the cantonment hospital." },
          { client: "Residents' Welfare Association cluster", location: "Tier-1 city", result: "Twice-weekly society-level fogging during dengue season with operator training." },
        ],
      },
      {
        kind: "form",
        variant: "use-case-quote",
        eyebrow: "Quote request",
        title: "Get a dengue-control quote in 24 hours",
        sub: "Tell us the area you cover, expected frequency, and any current bottleneck. We'll respond with a recommended model, indicative price, and delivery timeline.",
        checklist: [
          "Model recommendation based on coverage area",
          "Indicative pricing in INR (with GST)",
          "Operator training video links",
          "After-sales contact for your region",
        ],
      },
    ],
    faqs: [
      { q: "Is thermal fogging the right choice for dengue control?", a: "For adult Aedes aegypti suppression — yes. Thermal fogging produces a dense visible cloud with droplet sizes (typically 10–25 μm) that contact resting and flying adults. For closed-room disinfection or sensitive areas where heat and visible fog are unwanted, cold (ULV) fogging is preferred. Most municipal dengue programmes combine both based on environment." },
      { q: "When during the day should we run a dengue fogging drive?", a: "Dawn (5:30–7:00 AM) and dusk (5:30–7:30 PM) are optimal. Aedes aegypti is most active in cooler twilight hours, so droplet-mosquito contact is highest. Midday fogging wastes insecticide due to high evaporation and low mosquito activity." },
      { q: "Which 100x Circle model do most municipal corporations choose for dengue drives?", a: "The Double Barrel Thermal Fogging Machine (100XDB400) for vehicle-mounted ward-level coverage, paired with portable thermal units (TFS50 or SSMA20) for parks, hospitals, schools, and society compounds that the vehicle can't enter." },
      { q: "Do you supply CIB-approved insecticide or just the machine?", a: "We supply the equipment and calibrate it for standard insecticide dilution rates. Procurement of the insecticide itself is handled by the health department or pest-control operator, typically a CIB-approved adulticide such as a pyrethroid or malathion formulation." },
    ],
    relatedLandingSlugs: [
      "thermal-vs-cold-fogging-machine",
      "fogging-machine-supplier-in-uttar-pradesh",
      "gem-approved-fogging-machine-oem",
    ],
  },

  // ─── Comparison page: Thermal vs Cold fogging ────────────────────────
  "thermal-vs-cold-fogging-machine": {
    slug: "thermal-vs-cold-fogging-machine",
    type: "comparison",
    metadata: {
      title: "Thermal vs Cold Fogging Machine — Which to Buy | 100x Circle",
      description:
        "Thermal vs cold (ULV) fogging: 8-point comparison. Coverage, droplet size, indoor vs outdoor use, insecticide compatibility. Expert buyer's guide.",
      keywords:
        "thermal vs cold fogging machine, thermal vs ulv fogger, which fogging machine to buy, cold fogger vs thermal fogger, fogging machine comparison india",
    },
    hero: {
      eyebrow: "Buyer Comparison",
      headline: [
        { text: "Thermal vs Cold Fogging:" },
        { text: "Which Fits Your Use Case?", accent: "green" },
      ],
      sub: "Both thermal and cold (ULV) fogging machines have a place — but the wrong choice wastes insecticide and frustrates field teams. Here's the side-by-side comparison we walk every buyer through.",
      primary: { label: "Talk to a Specialist", href: "/contact-us", track: "compare_hero_primary" },
      secondary: {
        label: "WhatsApp Question",
        href: "https://wa.me/917827229116?text=Hi%2C%20I%20want%20help%20choosing%20between%20thermal%20and%20cold%20fogging",
        track: "compare_hero_whatsapp",
      },
    },
    sections: [
      {
        kind: "trust-strip",
        metrics: [
          { value: "10+ yrs", label: "Manufacturing both" },
          { value: "GeM", label: "Q2 OEM" },
          { value: "INR", label: "Direct factory pricing" },
          { value: "Pan India", label: "Supply + support" },
        ],
      },
      {
        kind: "benefits-grid",
        eyebrow: "Start with the question",
        title: "Indoor disinfection or outdoor mosquito control?",
        items: [
          { icon: "🦟", title: "Outdoor adult mosquito control", description: "Thermal fogging wins. Dense visible cloud penetrates vegetation, drains, and structures where Aedes and Culex rest." },
          { icon: "🏥", title: "Indoor disinfection / sensitive areas", description: "Cold (ULV) fogging wins. No heat, no visible cloud, lower chemical drift — ideal for hospitals, food-handling areas, server rooms." },
          { icon: "🌾", title: "Agriculture & horticulture pest control", description: "Either can work — thermal for open fields and orchards, cold for greenhouses and chemical-sensitive crops." },
        ],
      },
      {
        kind: "comparison-table",
        eyebrow: "Side-by-side",
        title: "Thermal fogger vs cold (ULV) fogger",
        columns: ["Thermal Fogging", "Cold (ULV) Fogging"],
        rows: [
          { label: "Droplet size", cells: ["~10–25 μm (warm fog)", "~5–50 μm (cold mist)"] },
          { label: "Visible cloud", cells: ["Yes, dense", "Minimal / invisible"] },
          { label: "Heat", cells: ["Hot (uses pulse-jet)", "Cold (mechanical pressure)"] },
          { label: "Indoor use", cells: ["Not recommended (heat + visibility)", "Yes — preferred"], highlight: 1 },
          { label: "Outdoor mosquito control", cells: ["Preferred (dense cloud penetrates)", "Possible but less effective"], highlight: 0 },
          { label: "Insecticide carrier", cells: ["Oil-based", "Water-based or oil-based"] },
          { label: "Per-hour coverage", cells: ["High (esp. vehicle-mounted)", "Moderate"], highlight: 0 },
          { label: "Operator skill", cells: ["Higher (heat safety)", "Lower"] },
          { label: "Typical use case", cells: ["Municipal vector control, parks, drains", "Hospital / school / warehouse disinfection"] },
          { label: "100x Circle model", cells: ["DB400 (vehicle-mounted) / SSMA20", "TFS50 (supports both modes)"] },
        ],
        note: "Most municipal vector-control programmes deploy both — thermal for outdoor ward drives, cold for institutional disinfection. The TFS50 supports both modes in a single unit.",
      },
      {
        kind: "recommended-products",
        eyebrow: "Pick from these",
        title: "100x Circle models referenced above",
        slugs: [
          "thermal-and-cold-fogging-machine-100xtfs50",
          "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
          "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
        ],
      },
      {
        kind: "cta-band",
        band: {
          heading: "Still unsure which one fits your operation?",
          sub: "Tell our team the use case, area, and frequency — we'll recommend the right form factor and quote indicative pricing.",
          primary: { label: "Request a Recommendation", href: "/contact-us" },
          secondary: { label: "Call +91 78272 29116", href: "tel:+917827229116" },
        },
      },
    ],
    faqs: [
      { q: "If I can only buy one machine, which type covers more use cases?", a: "The thermal & cold combo unit (100XTFS50) — it supports both thermal and cold (ULV) modes in a single machine. For most buyers who need flexibility across outdoor mosquito control and indoor disinfection, this is the most versatile single-machine choice." },
      { q: "Is cold (ULV) fogging safer for indoor use than thermal?", a: "Yes. Cold fogging produces no heat and a minimal visible cloud, so it's appropriate for occupied or sensitive indoor environments — hospitals, schools, server rooms, food-handling areas. Thermal fogging is generally restricted to outdoor or empty-area use because of the heat and visibility." },
      { q: "Do thermal and cold foggers use the same insecticide?", a: "Both can use CIB-approved adulticides, but thermal foggers typically need an oil-based carrier (for clean vaporisation), while cold foggers work with either oil- or water-based carriers. We provide dilution guidance with every machine." },
      { q: "What about agricultural and greenhouse pest control?", a: "Thermal fogging suits open fields and orchards (better penetration through canopy). Cold fogging suits greenhouses and chemical-sensitive crops where heat or visible drift is undesirable. Many large farms run both for different blocks." },
    ],
    relatedLandingSlugs: [
      "dengue-control-fogging-machine",
      "gem-approved-fogging-machine-oem",
      "fogging-machine-buying-guide",
    ],
  },

  // ─── Buyer guide ─────────────────────────────────────────────────────
  "fogging-machine-buying-guide": {
    slug: "fogging-machine-buying-guide",
    type: "guide",
    metadata: {
      title: "Fogging Machine Buying Guide (India) | 100x Circle",
      description:
        "How to choose the right fogging machine in India: form factor, droplet size, coverage, certification, after-sales. A practical buyer guide from 100x Circle's manufacturing team.",
      keywords:
        "fogging machine buying guide india, how to choose fogging machine, fogging machine buyer guide, thermal fogger buying guide, ulv fogger buying guide",
    },
    hero: {
      eyebrow: "Buyer Guide",
      headline: "Fogging Machine Buying Guide for India",
      sub: "A practical, vendor-honest guide to choosing the right fogging machine — written by 100x Circle's manufacturing team for municipal buyers, pest-control operators, dealers, and large institutional procurement.",
      primary: { label: "Get the Checklist by Email", href: "#landing-form", track: "guide_hero_primary" },
      secondary: { label: "Browse Products", href: "/products", track: "guide_hero_browse" },
    },
    sections: [
      {
        kind: "rich-text",
        h2: "Start with the use case, not the catalogue",
        paragraphs: [
          "The single biggest reason buyers regret a fogging-machine purchase is choosing on price or brochure spec instead of use case. A double-barrel vehicle-mounted unit is overkill for a 4-acre poultry farm; a portable thermal fogger is the wrong tool for ward-level municipal vector control.",
          "Before you read another spec sheet, write down: who operates the machine (trained crew or rotating staff?), where it runs (open street, hospital corridor, greenhouse?), how often (daily monsoon drives or twice a year?), and what's the chemical of choice. The right form factor follows from those answers.",
        ],
      },
      {
        kind: "benefits-grid",
        eyebrow: "Five things buyers should actually check",
        title: "Spec sheet shortcuts that don't matter — and what does",
        items: [
          { icon: "🎯", title: "Droplet size, not just 'fog density'", description: "10–25 μm thermal droplets are ideal for adult mosquito contact. ULV droplets vary 5–50 μm. Brochure-friendly 'dense fog' claims tell you little — ask for actual droplet distribution data." },
          { icon: "⏱️", title: "Per-hour coverage at real dilution rates", description: "Vendor specs assume ideal lab conditions. Ask what the machine covers per hour at the dilution rate your insecticide actually requires." },
          { icon: "🛠️", title: "Spares availability and service network", description: "A fogger is a maintenance-active machine. If the vendor can't ship spares within a week to your state, factor in downtime cost before you compare prices." },
          { icon: "📜", title: "BIS / GeM compliance + warranty terms", description: "For tender and institutional orders, OEM certification and GeM compliance matter more than discount. Verify the warranty document — call the vendor's after-sales line before you buy." },
          { icon: "🇮🇳", title: "India-suitable engine + materials", description: "Pulse-jet engines and stainless-steel components built for Indian field conditions outlast imported aluminium-tank units in monsoon-heavy operation." },
        ],
      },
      {
        kind: "process-timeline",
        eyebrow: "Decision framework",
        title: "5-step buying process",
        steps: [
          { title: "Define the use case in writing", description: "Operator skill, environment, frequency, target pest, insecticide of choice. Reject any vendor recommendation that doesn't reference all five." },
          { title: "Shortlist 2–3 form factors", description: "Portable thermal, SS-tank thermal, vehicle-mounted double-barrel, ULV cold. Most use cases narrow to one or two candidates." },
          { title: "Request a demo or video walkthrough", description: "A 5-minute operating demo — even by video — reveals more than any brochure. Ask to see start-up, fog density, fuel/chemical refill, and shutdown." },
          { title: "Compare on total cost of operation", description: "Sticker price + insecticide consumption + spares + downtime. The cheapest machine often costs the most over 3 years." },
          { title: "Pilot before you scale", description: "If you're buying for 10+ machines, get one first, run it for a season, then place the bulk order. Vendors that resist this aren't worth the risk." },
        ],
      },
      {
        kind: "comparison-table",
        eyebrow: "Form-factor matrix",
        title: "Which form factor for which use case?",
        columns: ["Portable Thermal", "SS-Tank Thermal", "Vehicle-Mounted Double-Barrel", "Cold (ULV)"],
        rows: [
          { label: "Municipal ward drive", cells: ["—", "Limited", "Best", "—"], highlight: 2 },
          { label: "Hospital / school disinfection", cells: ["—", "—", "—", "Best"], highlight: 3 },
          { label: "Housing society / RWA", cells: ["Good", "Best", "Overkill", "Possible"], highlight: 1 },
          { label: "Poultry / dairy farm", cells: ["Good", "Best", "Overkill", "Good"], highlight: 1 },
          { label: "Greenhouse / agri", cells: ["Limited", "Good", "—", "Best"], highlight: 3 },
          { label: "Warehouse / grain storage", cells: ["Limited", "Good", "—", "Best"], highlight: 3 },
        ],
        note: "\"Best\" = the form factor we'd recommend first; \"Good\" = workable; \"—\" = not a fit.",
      },
      {
        kind: "recommended-products",
        eyebrow: "100x Circle range",
        title: "Our current production line",
        slugs: [
          "thermal-and-cold-fogging-machine-100xtfs50",
          "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
          "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
        ],
      },
      {
        kind: "form",
        variant: "guide-download",
        eyebrow: "Get the checklist",
        title: "Get the buyer checklist by email",
        sub: "We'll send a single-page PDF buyer checklist plus our latest catalogue. No follow-up calls unless you ask for one.",
        checklist: [
          "1-page buyer checklist (PDF)",
          "Latest 100x Circle catalogue",
          "Spec-sheet comparison templates",
          "Optional 1-on-1 specialist consultation",
        ],
      },
      {
        kind: "cta-band",
        band: {
          heading: "Want a vendor-honest recommendation for your operation?",
          sub: "Tell us your use case — we'll recommend a form factor first, then pricing.",
          primary: { label: "Talk to a Specialist", href: "/contact-us" },
          secondary: { label: "WhatsApp +91 78272 29116", href: "https://wa.me/917827229116" },
        },
      },
    ],
    faqs: [
      { q: "What's the most common buyer mistake when choosing a fogging machine?", a: "Buying on sticker price without considering total cost of operation. The cheapest machine often consumes more insecticide per hectare, breaks down more often, and is harder to service — adding up to multiples of the purchase price over 3 years. The right comparison is delivered-cost-per-hectare-per-year, not unit price." },
      { q: "Should I buy a thermal fogger or a cold (ULV) fogger?", a: "Use case decides. Thermal is better for outdoor mosquito control — its dense, hot fog penetrates vegetation and drains. Cold (ULV) is better for indoor disinfection, sensitive environments, and water-based chemicals. Many buyers need both — see our thermal-vs-cold comparison page for details." },
      { q: "How important is BIS or GeM certification when buying for an institution?", a: "Critical for tender and government orders. For municipal corporations, health departments, and any GeM listing, you need an OEM-certified, spec-compliant machine — or the order will be rejected at acceptance. For private buyers (housing societies, farms, pest control firms), certification matters less than warranty + spares availability." },
      { q: "How long should a quality fogging machine last?", a: "A well-built thermal fogger with regular maintenance lasts 7–10 years of field use. Pulse-jet engines and stainless-steel components are the long-life parts; consumables (spark plugs, fuel filters, gaskets) need annual replacement. Walk away from any vendor that quotes a warranty under 12 months." },
      { q: "Where can I see 100x Circle machines in action before buying?", a: "We share operator demo videos with every quote. For institutional buyers (10+ unit orders), we arrange in-person demos at our Gurugram facility or coordinate a visit to a nearby deployment site." },
    ],
    relatedLandingSlugs: [
      "thermal-vs-cold-fogging-machine",
      "dengue-control-fogging-machine",
      "gem-approved-fogging-machine-oem",
    ],
  },

  // ─── Existing product landings (back-compat) ────────────────────────
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20": {
    slug: "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
    type: "product",
    metadata: {
      title: "Buy Stainless Steel Tank Thermal Fogger | 100x Circle",
      description:
        "Buy Stainless Steel Tank Thermal Fogger from 100x Circle. Durable, rust-resistant design with powerful fog output for effective mosquito control. Contact us today!",
      keywords:
        "buy stainless steel tank thermal fogger, stainless steel tank fogging machine manufacturer india, SS tank thermal fogging machine supplier, stainless steel fogger price, thermal fogging machine with stainless steel tank, SS fogging machine price",
    },
    content1: {
      h2: "Why the Stainless Steel Tank Matters",
      p: [
        "The tank on a fogging machine is in direct contact with chemical solutions under heat for extended periods. In a standard mild steel tank, this exposure leads to gradual corrosion that can contaminate the formulation and eventually cause leaks. The 100XSSMA20's stainless steel tank withstands these conditions without degradation, maintaining a clean, uncontaminated fuel and chemical pathway throughout the machine's working life.",
        "We manufacture the tank and the full machine at our Gurugram facility, ensuring quality control across every component rather than relying on outsourced sub-assemblies — important when chemical compatibility and long-term integrity are the operator's main concerns.",
      ],
    },
    content2: {
      h2: "Construction and Field Performance",
      p: [
        "The 100XSSMA20 is built as a durable thermal fogger that pest control professionals and public health operators depend on for consistent daily output. The pulse jet engine delivers reliable ignition and fog generation even after extended storage between seasonal campaigns. The nozzle assembly is engineered for uniform particle size distribution, which is critical for effective insecticide penetration in dense foliage and closed spaces.",
        "The machine's ergonomic design allows single-person operation with manageable carry weight. The backpack-style harness distributes the load evenly, reducing operator fatigue during extended fogging sessions. The fuel and chemical tanks are sized to balance capacity with portability, giving operators a practical working duration between refills.",
      ],
    },
    content3: {
      h2: "Indoor Disinfection and Outdoor Applications",
      p: [
        "While the 100XSSMA20 performs excellently outdoors, its stainless steel construction and fine fog output also make it a strong choice for facility disinfection programmes. Hospitals, schools, food processing units, and warehouse operators have used this model for routine disinfection treatments — particularly where the formulation contains bleach or other compounds that would degrade a mild steel tank quickly.",
        "The disinfection fogging market grew substantially post-2020 and remains active in institutional settings. The 100XSSMA20 is positioned well for operators who need a single machine that crosses over between pest control and disinfection applications without compromise.",
      ],
    },
  },
}

export function getLandingPage(slug: string): LandingPageDef | undefined {
  return LANDING_PAGES[slug]
}

export function getLandingSlugs(): string[] {
  return Object.keys(LANDING_PAGES)
}

export function getAllLandingPages(): LandingPageDef[] {
  return Object.values(LANDING_PAGES)
}

/** Short display name derived from the title (strips " | brand" suffix). */
export function getLandingDisplayName(slug: string): string | undefined {
  const def = LANDING_PAGES[slug]
  if (!def) return undefined
  const [head] = def.metadata.title.split("|")
  return (head || def.metadata.title).trim()
}

/** Resolve effective theme for a landing — registry override wins. */
export function getLandingTheme(def: LandingPageDef) {
  return def.theme ?? DEFAULT_THEME_BY_TYPE[def.type]
}
