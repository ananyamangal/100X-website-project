import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Nuuk-style cinematic homepage sections seed
// POST /api/admin/seed-homepage  { "token": "100x_homepage_2026" }
// Safe to run multiple times — upserts on sectionKey

const TOKEN = "100x_homepage_2026";

// Mushtaq Khan Cloudinary assets
const MUSHTAQ_PROBLEM = "https://res.cloudinary.com/dhbvzugv6/image/upload/v1780214929/npfovt85oy1y1rfm2siu.png";
const MUSHTAQ_SOLUTION = "https://res.cloudinary.com/dhbvzugv6/image/upload/v1780214888/tc0ezlvaku38ypw5ajet.png";

const SECTIONS = [
  // ── PLACEMENT: after-hero ─────────────────────────────────────────────────
  // Section 1: Celebrity "Problem" — dark, cinematic, dramatic
  {
    sectionKey: "celebrity-problem-mushtaq",
    type: "celebrity",
    enabled: true,
    order: 2,
    placement: "after-hero",
    layout: "split",
    headline: "Every Season, The Outbreak Returns.",
    subheadline: "Mosquitoes, dengue outbreaks, pest infestations — India's pest control challenge doesn't take a break.",
    bodyText: "Whether you run a Nagar Nigam, a licensed pest control company, or an agricultural operation — you know the moment when one fogger fails and the whole campaign falls apart. The machine that looked fine last year won't cut it this season.",
    ctaText: "See Our Machines",
    ctaUrl: "/products",
    ctaSecondaryText: "",
    ctaSecondaryUrl: "",
    imageUrl: MUSHTAQ_PROBLEM,
    imageAlt: "The mosquito problem — every season, the same challenge",
    imagePosition: "right",
    badge: "The Real Problem",
    theme: "dark",
    stats: [],
    bullets: [
      "Dengue outbreaks spike every monsoon season",
      "One failed fogger delays an entire municipal drive",
      "Cheap trading-company machines break at peak season",
      "Spare parts arrive too late — or not at all",
    ],
    comparisonBad: [],
    comparisonBadTitle: "",
    comparisonGood: [],
    comparisonGoodTitle: "",
    showOnMobile: true,
    showOnDesktop: true,
  },

  // ── PLACEMENT: after-products ─────────────────────────────────────────────
  // Section 2: Celebrity "Solution" — light, confident, endorsement
  {
    sectionKey: "celebrity-solution-mushtaq",
    type: "celebrity",
    enabled: true,
    order: 5,
    placement: "after-products",
    layout: "split",
    headline: "When Professionals Need To Get It Right, They Call 100X Circle.",
    subheadline: "Made in India. India-proven. Trusted by 200+ municipalities across 22 states.",
    bodyText: "From Delhi's monsoon dengue drives to Punjab's agricultural pest seasons — the machines that show up, start up, and never let the team down. Not a trading company. Not a grey-market import. The real thing, with the service record to prove it.",
    ctaText: "Request a Quote",
    ctaUrl: "/contact-us",
    ctaSecondaryText: "View All Products",
    ctaSecondaryUrl: "/products",
    imageUrl: MUSHTAQ_SOLUTION,
    imageAlt: "100X Circle — the professionals' choice for thermal fogging",
    imagePosition: "left",
    badge: "The 100X Difference",
    theme: "light",
    stats: [
      { label: "Municipalities Served", value: "200+" },
      { label: "States Covered", value: "22" },
      { label: "Spare Parts Stocked", value: "65+" },
      { label: "Machine Service Life", value: "5+ Yrs" },
    ],
    bullets: [],
    comparisonBad: [],
    comparisonBadTitle: "",
    comparisonGood: [],
    comparisonGoodTitle: "",
    showOnMobile: true,
    showOnDesktop: true,
  },

  // Section 3: Comparison — "Trading Company vs 100X Circle"
  {
    sectionKey: "comparison-oem-vs-trader",
    type: "comparison",
    enabled: true,
    order: 6,
    placement: "after-products",
    layout: "comparison",
    headline: "Don't Risk Your Season on a Trading Company Machine.",
    subheadline: "The difference shows up the day the machine fails — not the day you buy it.",
    bodyText: "India is flooded with fogging machines from trading companies with no factory, no QC, and no accountability. When peak fogging season arrives, these machines fail first.",
    ctaText: "Buy Genuine — Get a Quote",
    ctaUrl: "/contact-us",
    ctaSecondaryText: "See Certifications",
    ctaSecondaryUrl: "/about",
    imageUrl: "",
    imageAlt: "",
    imagePosition: "right",
    badge: "OEM vs Trading Company",
    theme: "light",
    stats: [],
    bullets: [],
    comparisonBadTitle: "Trading Company Machine",
    comparisonGoodTitle: "100X Circle Genuine OEM",
    comparisonBad: [
      "No factory — assembled from unknown imported parts",
      "Spare parts unavailable after 6 months",
      "No warranty claim support — just ignored calls",
      "Fails in peak monsoon season under continuous use",
      "No GeM registration — blocked from government tenders",
      "No test certificates for tender compliance",
    ],
    comparisonGood: [
      "Genuine OEM manufacturing — ISO 9001:2015 certified",
      "65+ genuine spare parts stocked — ships in 3 days",
      "1-year manufacturer warranty — resolved in 5 days",
      "Continuous-duty rated — engineered for Indian conditions",
      "GeM registered — direct government procurement",
      "Complete tender documentation package included",
    ],
    showOnMobile: true,
    showOnDesktop: true,
  },

  // ── PLACEMENT: before-trust ───────────────────────────────────────────────
  // Section 4: Technology Pillars — dark, cinematic
  {
    sectionKey: "technology-pillars-india",
    type: "technology",
    enabled: true,
    order: 9,
    placement: "before-trust",
    layout: "grid-cards",
    headline: "Made in India. Built for India's Toughest Conditions.",
    subheadline: "Every component specified for tropical heat, monsoon humidity, and professional daily use.",
    bodyText: "The 100X Circle product range is engineered in India and tested for the demands of India's public health and agricultural pest control market — not modified consumer products, genuine professional-grade equipment.",
    ctaText: "Explore the Range",
    ctaUrl: "/products",
    ctaSecondaryText: "Spare Parts Catalogue",
    ctaSecondaryUrl: "/spare-parts",
    imageUrl: "",
    imageAlt: "",
    imagePosition: "center",
    badge: "The Technology",
    theme: "dark",
    stats: [
      { label: "Years Genuine OEM", value: "15+" },
      { label: "Models Available", value: "7" },
    ],
    bullets: [
      "Grade 316L Marine Stainless Steel",
      "DC 12V Auto-Start Ignition",
      "8–15 Micron Ultra-Fine Fog",
      "Continuous Duty Operation",
      "WHO-Approved Chemical Compatibility",
      "Made in India Origin",
      "ISO 9001:2015 Certified",
      "GeM Registered Supplier",
      "5+ Years Spare Parts Guarantee",
      "MSME/UDYAM Certified",
      "50+ Genuine OEM Spare Parts",
      "3-Day Pan-India Parts Shipping",
    ],
    comparisonBad: [],
    comparisonBadTitle: "",
    comparisonGood: [],
    comparisonGoodTitle: "",
    showOnMobile: true,
    showOnDesktop: true,
  },

  // ── PLACEMENT: before-faq ─────────────────────────────────────────────────
  // Section 5: Government & Institutional Authority (updated from existing)
  {
    sectionKey: "public-health-authority",
    type: "government",
    enabled: true,
    order: 12,
    placement: "before-faq",
    layout: "grid-cards",
    headline: "Trusted For Public Health & Municipal Fogging Programs",
    subheadline: "Supporting municipalities, government departments, public health agencies, institutional buyers, pest-control operators and distributors across India.",
    bodyText: "",
    ctaText: "View Deployments",
    ctaUrl: "/deployments",
    ctaSecondaryText: "Read Case Studies",
    ctaSecondaryUrl: "/case-studies",
    imageUrl: "",
    imageAlt: "",
    imagePosition: "right",
    badge: "Government & Institutional",
    theme: "dark",
    stats: [
      { label: "States Covered", value: "22" },
      { label: "Nagar Nigams Served", value: "50+" },
    ],
    bullets: [
      "Government Procurement Support",
      "GeM Procurement Ready",
      "Tender Documentation Support",
      "Technical Compliance Support",
      "After Sales Service",
      "Custom Manufacturing",
      "OEM Branding",
      "Deployment Support",
    ],
    comparisonBad: [],
    comparisonBadTitle: "",
    comparisonGood: [],
    comparisonGoodTitle: "",
    showOnMobile: true,
    showOnDesktop: true,
  },

  // Section 6: Manufacturing Authority
  {
    sectionKey: "manufacturing-authority",
    type: "custom",
    enabled: true,
    order: 13,
    placement: "before-faq",
    layout: "comparison",
    headline: "Why Buyers Choose Genuine OEM Manufacturers",
    subheadline: "The difference between a trading company and a real OEM manufacturer becomes clear when it matters most — in tenders, service, and long-term performance.",
    bodyText: "",
    ctaText: "Request a Quote",
    ctaUrl: "/contact-us",
    ctaSecondaryText: "View Products",
    ctaSecondaryUrl: "/products",
    imageUrl: "",
    imageAlt: "",
    imagePosition: "right",
    badge: "Why Genuine OEM Manufacturers Win",
    theme: "light",
    stats: [],
    bullets: [],
    comparisonBadTitle: "Trading Company",
    comparisonGoodTitle: "Genuine OEM Manufacturer",
    comparisonBad: [
      "No factory — no quality control",
      "Spare parts unavailable after purchase",
      "No warranty claim process",
      "Generic machines failing under daily professional use",
      "Cannot supply GeM or tender documentation",
    ],
    comparisonGood: [
      "Own manufacturing plant + full in-house QC",
      "65+ genuine OEM spare parts always stocked",
      "1-year warranty with 5-day resolution",
      "Rated for continuous professional-duty operation",
      "Complete GeM listing + tender documentation",
    ],
    comparisonBad2: [],
    comparisonGood2: [],
    showOnMobile: true,
    showOnDesktop: true,
  },

  // Section 7: Field Operator Story — dark, cinematic split
  {
    sectionKey: "field-operator-story",
    type: "brand-story",
    enabled: true,
    order: 14,
    placement: "before-faq",
    layout: "pillars",
    headline: "Built For The 4 AM Municipal Fogger.",
    subheadline: "When every ward in the city needs to be covered before sunrise — reliability is the only specification that matters.",
    bodyText: "India's municipal fogging teams start before dawn. They can't afford a machine that won't start, a carburetor that floods, a battery that died overnight. 100X Circle thermal foggers are engineered for this — DC 12V auto-start that fires in under 3 seconds, Grade 316L stainless steel that handles every WHO-approved formulation, continuous duty operation with no mandatory rest cycles. The machine that shows up, every morning, every season.",
    ctaText: "View the BF-150",
    ctaUrl: "/products/100x-thermal-fogger-bf150",
    ctaSecondaryText: "All Products",
    ctaSecondaryUrl: "/products",
    imageUrl: "",
    imageAlt: "",
    imagePosition: "right",
    badge: "Built for Professionals",
    theme: "dark",
    stats: [
      { label: "Auto-Start Time", value: "< 3s" },
      { label: "Duty Cycle", value: "Continuous" },
      { label: "Tank Material", value: "SS 316L" },
      { label: "Parts Warranty", value: "5+ Years" },
    ],
    bullets: [],
    comparisonBad: [],
    comparisonBadTitle: "",
    comparisonGood: [],
    comparisonGoodTitle: "",
    showOnMobile: true,
    showOnDesktop: true,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.token !== TOKEN) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const now = new Date().toISOString();

    const results = { created: [] as string[], updated: [] as string[] };

    for (const section of SECTIONS) {
      const existing = await db.collection("homepage_sections").findOne({ sectionKey: section.sectionKey });
      if (existing) {
        await db.collection("homepage_sections").updateOne(
          { sectionKey: section.sectionKey },
          { $set: { ...section, updatedAt: now } }
        );
        results.updated.push(section.sectionKey);
      } else {
        await db.collection("homepage_sections").insertOne({
          ...section,
          createdAt: now,
          updatedAt: now,
        });
        results.created.push(section.sectionKey);
      }
    }

    return NextResponse.json({
      success: true,
      created: results.created.length,
      updated: results.updated.length,
      detail: results,
    });
  } catch (err) {
    console.error("seed-homepage error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST with { token: '100x_homepage_2026' } to seed all Nuuk-style homepage sections.",
    sections: SECTIONS.length,
  });
}
