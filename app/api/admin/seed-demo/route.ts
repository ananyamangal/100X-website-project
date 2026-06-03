import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// One-time demo content seeder — call once to populate all products
// POST /api/admin/seed-demo  { "token": "100x_seed_demo_2026" }

const SEED_TOKEN = "100x_seed_demo_2026";

// ── Shared FAQ bank ────────────────────────────────────────────────────────
const THERMAL_FAQS = [
  { q: "What type of chemicals can be used with this machine?", a: "Compatible with all WHO-approved thermal fogging formulations: oil-based pyrethroid insecticide concentrates, fungicides, and approved disinfectants. The Grade 316L stainless steel tank handles all standard formulations without corrosion. Always use chemicals approved for thermal fogging — water-based concentrates require specific oil-based carrier formulation for thermal application." },
  { q: "What is the actual spray range?", a: "Under sheltered indoor or low-wind early morning conditions, effective thermal fog range is 4–8 metres from the nozzle. For outdoor municipal operations before sunrise (wind under 2 km/h), fog dispersal can cover 8–12 metre radii. Wind significantly affects coverage — early morning operations are strongly recommended." },
  { q: "How long can the machine run continuously?", a: "Designed for continuous operation without mandatory rest cycles. The 8-litre chemical tank provides approximately 12 minutes at full output. The 1.8-litre fuel tank lasts approximately 70 minutes. Operators refuel and refill every 10–15 minutes during sustained operations. The dual cooling system prevents heat stress during repeated cycles." },
  { q: "Is this machine suitable for government tenders?", a: "Yes. 100X Circle is GeM-registered and MSME/UDYAM certified. Products are listed on the Government e-Marketplace for direct purchase. We provide complete tender documentation: product test certificates, ISO 9001:2015 certificate, GST registration, MSME certificate, technical datasheet, and safety data sheets. Tender enquiries are responded to within 24 hours." },
  { q: "How do I start the machine?", a: "1) Fill chemical tank and fuel tank. 2) Ensure 12V battery is charged. 3) Hold start button for 3 seconds until ignition fires. 4) Allow 30–45 seconds warm-up. 5) Open chemical valve slowly to begin fogging. Shutdown: close chemical valve, hold shutdown button 5–6 seconds for cooling cycle. Flush with clean oil after use." },
  { q: "What PPE is required for operation?", a: "Operators must wear: full-face respirator or N95 mask, chemical-resistant gloves, protective eyewear, and long-sleeved protective clothing. Do not operate in enclosed spaces without adequate ventilation. Follow chemical manufacturer's PPE guidelines for the specific formulation being used." },
  { q: "What is the fuel consumption?", a: "Approximately 1.5 litres of kerosene or unleaded petrol per hour during continuous operation. The 1.8-litre fuel tank provides approximately 70 minutes runtime. For extended operations, carry spare fuel. Use RON 91+ petrol or light kerosene as specified in your model's operator manual." },
  { q: "Can this machine be used for agricultural applications?", a: "Yes. Thermal fog is widely used for crop protection in paddy, cotton, and vegetable cultivation. Thermal fog penetrates dense canopy — reaching leaf undersides where pests like whitefly and thrips harbour — unlike conventional compression sprayers. Use oil-based insecticide or fungicide formulations approved for thermal application. Apply during early morning or evening when wind is calm." },
  { q: "How long does the 12V battery last, and how is it charged?", a: "The 12V battery powers the auto-start ignition only — not continuous operation. Recharge after each use with the supplied charger (5–6 hours). Battery life is approximately 100–150 start cycles before replacement is needed. Replacement batteries are stocked by 100X Circle." },
  { q: "What spare parts are available and how quickly can I get them?", a: "100X Circle stocks all critical spare parts at our Gurugram facility: nozzle assembly, fuel cap, chemical tank, 12V battery, carburetor set, chemical hose, air filter, pump kit, and ignition components. Standard parts ship pan-India within 3 working days. Emergency same-day dispatch available for orders before 12 PM. Parts availability guaranteed for minimum 5 years from purchase." },
  { q: "Is training provided with purchase?", a: "Yes — complimentary operator training with every purchase. Individual/small-fleet buyers receive video training materials and a Hindi-language operator manual. For bulk orders (5+ machines), on-site training at your facility can be arranged. Training covers safe start/shutdown, chemical handling, PPE, field maintenance, and basic fault diagnosis." },
  { q: "What is the warranty?", a: "1-year manufacturer warranty from purchase date. Covers manufacturing defects and material failure under normal operating conditions. Does not cover damage from incorrect chemical use, physical damage, or unauthorised modifications. Warranty claims require original purchase invoice. Claims assessed and resolved within 5 working days." },
  { q: "Can this machine be used for dengue control programmes?", a: "Yes. Thermal fogging is the WHO-recommended method for adult mosquito control during dengue, malaria, and chikungunya outbreak responses. Use pyrethroid insecticide formulations approved for thermal fogging. Follow National Vector Borne Disease Control Programme (NVBDCP) guidelines for dosage, timing, and operational protocols." },
  { q: "What is the delivery timeline?", a: "Standard pan-India delivery: 5–7 working days. Bulk government/institutional orders (10+ units): 10–15 working days. Emergency response orders can be expedited — contact us with your requirements. Volume pricing available for 5+ units. Special terms for government procurement through GeM." },
  { q: "How do I clean and maintain the machine after use?", a: "After each use: 1) Flush chemical tank with clean water or clean oil. 2) Run the flush through the system for 30 seconds. 3) Close all valves and drain remaining fuel/chemical. 4) Wipe exterior with dry cloth. 5) Recharge the 12V battery. 6) Store in a dry, ventilated location away from direct sunlight. Full servicing recommended after every 50 hours of operation." },
];

// ── Deployment UGC images (relevant outdoor/agricultural/pest-control photos) ─
const UGC_IMAGES = [
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop&q=80",
];

// ── Feature chapters generator ──────────────────────────────────────────────
function buildChapters(productName: string, images: string[]) {
  return [
    {
      title: "Built from Marine-Grade Stainless Steel",
      subtitle: "Grade 316L — the same steel used in pharmaceutical tanks and marine vessels",
      description: `Every surface the chemical touches in the ${productName} — the chemical tank, lance assembly, fittings, and seals — is fabricated from Grade 316L marine stainless steel. This specification resists chloride corrosion, handles all WHO-approved insecticide formulations without degradation, and withstands the thermal cycling of continuous fogging operations across thousands of hours. The machine you buy today will perform identically in year five.`,
      imageUrl: images[0] || "",
      videoUrl: "",
      sortOrder: 1,
    },
    {
      title: "One-Button Auto-Start. No Delays in the Field.",
      subtitle: "DC 12V electric ignition replaces manual priming and pull-start procedures",
      description: `Field operators lose critical time with manual-start foggers — priming pumps, troubleshooting flooding, managing ignition failures in humid conditions. The ${productName} eliminates all of this. A single DC 12V electronic ignition fires in under 3 seconds. Transparent fuel monitoring lines let operators check tank levels without stopping operations. For municipal teams running early morning drives across multiple wards, time saved on startup multiplies across every machine deployed.`,
      imageUrl: images[1] || images[0] || "",
      videoUrl: "",
      sortOrder: 2,
    },
    {
      title: "GeM Listed. Government Procurement Without the Wait.",
      subtitle: "Direct purchase available — no full tender process required",
      description: `100X Circle is GeM-registered, meaning Nagar Nigams, District Health Departments, and Agriculture Boards can purchase the ${productName} directly through the Government e-Marketplace without initiating a full tender process. We have supplied to 200+ municipalities across India. Complete documentation — MSME certificate, ISO 9001:2015 conformance, test certificates, GST invoice, and delivery proof — is included with every order. For emergency dengue or malaria outbreak response, equipment can be dispatched within 5 working days.`,
      imageUrl: images[2] || images[0] || "",
      videoUrl: "",
      sortOrder: 3,
    },
  ];
}

// ── Applications (standard) ──────────────────────────────────────────────────
const STANDARD_APPLICATIONS = [
  "Municipal mosquito and vector control (dengue, malaria, chikungunya prevention)",
  "District health department emergency fogging operations",
  "Agricultural crop protection — paddy, cotton, vegetables, orchards",
  "Licensed pest control company (PCO) operations",
  "Poultry farm disinfection and disease prevention",
  "Hospital and healthcare facility fumigation",
  "Warehousing and cold storage pest management",
  "Public housing society and residential complex fogging",
  "Cantonment board and defence establishment pest control",
  "Food processing plant and FMCG facility sanitation",
];

// ── Full specifications builder ──────────────────────────────────────────────
function buildSpecs(tankLitres: number, outputLhr: number, weightKg: number, extraSpecs?: string[]) {
  const base = [
    "Machine Type: Pulse-Jet Resonance Thermal Fogger",
    "Start System: DC 12V Electric Auto-Start",
    "Power Source: Rechargeable 12V DC Battery",
    "Combustion: Pulse-Jet Resonance Chamber",
    `Chemical Tank Capacity: ${tankLitres} litres`,
    "Tank Material: Grade 316L Marine Stainless Steel",
    "Fuel Tank Capacity: 1.8 litres",
    `Output Rate: ${outputLhr} litres/hour`,
    "Fuel Consumption: 1.5 litres/hour",
    "Spray Distance: Up to 6–8 metres",
    "Chemical Pressure: 0.3 bar",
    "Heat Shield Length: 90 cm",
    "Machine Dimensions: 136 × 24 × 35 cm",
    `Operating Weight: ${weightKg} kg (empty tanks)`,
    "Droplet Size: 8–15 microns (ultra-fine thermal fog)",
    "Operation Mode: Continuous duty",
    "Certifications: ISO 9001:2015, GeM Registered, MSME/UDYAM",
    "Origin: India",
  ];
  return extraSpecs ? [...base, ...extraSpecs] : base;
}

// ── Features list builder ────────────────────────────────────────────────────
function buildFeatures(tankLitres: number, outputLhr: number, weightKg: number) {
  return [
    `Auto-Start: DC 12V battery system — no manual priming`,
    `Tank Material: Grade 316L Marine Stainless Steel`,
    `Tank Capacity: ${tankLitres} litre chemical tank`,
    `Output Rate: ${outputLhr} litres/hour continuous`,
    `Operating Weight: ${weightKg} kg (single-operator portable)`,
    "Spray Distance: Up to 6–8 metres",
    "Continuous Duty: no mandatory rest cycles",
    "Transparent fuel and chemical monitoring lines",
    "Heat Shield: 90 cm resonance chamber",
    "GeM Registered: government procurement ready",
  ];
}

// ── Certifications (standard) ────────────────────────────────────────────────
const STANDARD_CERTS = ["ISO 9001:2015", "GeM Registered", "MSME/UDYAM Certified", "Made in India", "Heavy Duty"];

// ── Warranty (standard) ──────────────────────────────────────────────────────
const WARRANTY = {
  warrantyEnabled: true,
  warrantyPeriod: "1 Year",
  warrantyDescription: "Covers manufacturing defects and material failure under normal operating conditions. Genuine spare parts availability guaranteed for a minimum of 5 years from date of purchase. Contact 100X Circle support with your original purchase invoice.",
  warrantyIcon: "🛡️",
};

// ── Product-specific enrichment map ─────────────────────────────────────────
// Keyed by slug to handle the variety of 100X Circle products
function getEnrichmentBySlug(slug: string, name: string, images: string[]) {
  const lowerName = name.toLowerCase();
  const lowerSlug = slug.toLowerCase();

  // Vehicle-mounted / double barrel → larger capacity
  if (lowerName.includes("vehicle") || lowerName.includes("double") || lowerName.includes("db") || lowerName.includes("400")) {
    return {
      tagline: "Vehicle-mounted thermal fogging power for city-scale vector control operations.",
      specifications: buildSpecs(50, 120, 32, [
        "Configuration: Vehicle-Mountable",
        "Chemical Tank: 50 litres",
        "Dual Barrel: Twin nozzle configuration",
        "Output Rate: Up to 120 litres/hour",
        "Spray Distance: Up to 15–20 metres",
        "Power: Engine-driven (fuel)",
        "Operating Weight: 32 kg (excluding vehicle mount)",
      ]),
      features: [
        "Dual-barrel configuration: 2× output coverage",
        "Vehicle mountable: pickup, tractor, or flat-bed compatible",
        "Tank Capacity: 50-litre chemical tank",
        "Output Rate: Up to 120 litres/hour",
        "Spray Distance: Up to 20 metres",
        "Municipal-scale coverage: 10,000+ sq metres/hr",
        "Engine-driven: independent power source",
        "GeM Registered: government procurement ready",
      ],
      filmChapters: [
        {
          title: "City-Scale Coverage in Every Morning Drive",
          subtitle: "Twin-barrel output covers entire wards before sunrise",
          description: `The ${name} vehicle-mounted system allows municipal teams to cover entire wards — thousands of residents — in a single morning fogging drive. The dual-barrel configuration delivers up to 120 litres of insecticide fog per hour, while the 50-litre chemical tank means fewer stops for refilling. Mounted on a pickup truck or tractor, one machine and two operators can achieve what would require 6–8 portable machines.`,
          imageUrl: images[0] || "",
          videoUrl: "",
          sortOrder: 1,
        },
        {
          title: "20-Metre Fog Throw — Reaches Where Operators Cannot",
          subtitle: "Fog penetrates drainage channels, dense vegetation, and elevated zones",
          description: "A 20-metre fog throw distance means the operator vehicle never needs to stop at every drain and gutter — the fog does the work. In drainage-heavy municipal environments where dengue mosquitoes breed in standing water, the vehicle-mounted system reaches across roads, medians, and elevated structures without requiring personnel to enter hazardous locations.",
          imageUrl: images[1] || images[0] || "",
          videoUrl: "",
          sortOrder: 2,
        },
        {
          title: "50-Litre Tank. Fewer Stops. More Coverage.",
          subtitle: "Large-capacity operations without constant refilling",
          description: "The 50-litre stainless steel chemical tank is the operational heart of this system. At 120 L/hr output, a full tank provides 25 minutes of uninterrupted fogging — enough to cover an entire residential sector. The vehicle-mounted configuration means refilling is done at a central point, not in the field, minimising chemical handling exposure for operators.",
          imageUrl: images[2] || images[0] || "",
          videoUrl: "",
          sortOrder: 3,
        },
      ],
    };
  }

  // Backpack models
  if (lowerName.includes("backpack") || lowerName.includes("knapsack") || lowerSlug.includes("backpack")) {
    return {
      tagline: "Hands-free thermal fogging — designed for difficult terrain and dense agriculture.",
      specifications: buildSpecs(12, 35, 8, [
        "Configuration: Backpack / Knapsack",
        "Carry System: Ergonomic backpack harness",
        "Spray Distance: Up to 8–10 metres",
        "Ideal For: Dense crop canopy, difficult terrain",
      ]),
      features: [
        "Backpack configuration: hands-free operation",
        "Tank Capacity: 12-litre backpack chemical tank",
        "Output Rate: 35 litres/hour",
        "Ergonomic harness: padded shoulder and waist straps",
        "Spray Distance: Up to 8–10 metres",
        "Weight: 8 kg (empty) — designed for extended field wear",
        "Auto-Start: DC 12V battery ignition",
        "Ideal for dense canopy and difficult terrain access",
      ],
      filmChapters: buildChapters(name, images),
    };
  }

  // ULV / Cold fogger
  if (lowerName.includes("ulv") || lowerName.includes("cold") || lowerSlug.includes("ulv")) {
    return {
      tagline: "Precision cold fogging — safe for occupied spaces, effective for indoor disinfection.",
      specifications: [
        "Machine Type: ULV Cold Fogger (Ultra-Low Volume)",
        "Fog Type: Cold Fog — no heat source required",
        "Power: Electric motor (battery / mains)",
        "Chemical Tank: 8 litres",
        "Output Rate: 0–20 litres/hour (adjustable)",
        "Droplet Size: 5–50 microns (adjustable orifice)",
        "Spray Distance: 3–8 metres",
        "Chemical Compatibility: Water-based and oil-based formulations",
        "Operating Weight: 6 kg",
        "Dimensions: 55 × 20 × 28 cm",
        "Certifications: ISO 9001:2015, GeM Registered",
        "Ideal Use: Indoor disinfection, hospitals, food facilities",
      ],
      features: [
        "Cold fog: no heat — safe for occupied spaces",
        "Adjustable droplet size: 5–50 microns",
        "Water and oil-based formulation compatible",
        "Electric operation: no fuel, no combustion",
        "Output Rate: 0–20 L/hr (adjustable flow control)",
        "6 kg operating weight",
        "Quiet operation: suitable for indoor hospital/school use",
        "GeM Registered: government procurement ready",
      ],
      filmChapters: [
        {
          title: "Safe in Occupied Spaces — No Heat, No Fumes",
          subtitle: "Cold fog technology eliminates heat and combustion risks",
          description: `Unlike thermal foggers, the ${name} ULV cold fogger generates ultra-fine droplets through air-shear atomisation at ambient temperature. No open combustion. No hot surfaces. No fuel vapour. This makes it safe for use in occupied hospitals, schools, food processing facilities, and server rooms where thermal fog cannot be deployed. The same WHO-approved chemicals deliver the same efficacy — without the heat risk.`,
          imageUrl: images[0] || "",
          videoUrl: "",
          sortOrder: 1,
        },
        {
          title: "Adjustable Droplet Size for Precise Applications",
          subtitle: "5–50 microns — dialled to your exact application requirement",
          description: "The variable orifice nozzle system allows operators to adjust droplet diameter from 5 microns (near-vapour for air sanitisation) to 50 microns (larger droplets for surface coating). This makes the same machine effective for aerial mosquito control, surface disinfection, fungicide application, and deodorisation — without changing equipment.",
          imageUrl: images[1] || images[0] || "",
          videoUrl: "",
          sortOrder: 2,
        },
        {
          title: "Water-Based Formulations — Lower Operating Cost",
          subtitle: "No oil carrier required — direct chemical dilution in water",
          description: "Thermal foggers require oil-based carrier formulations, which add cost per hectare. The ULV cold fogger works directly with water-diluted concentrates — significantly reducing chemical cost per square metre. For hospital disinfection programmes and public health operations requiring daily or twice-daily application, the operating cost saving is substantial over a season.",
          imageUrl: images[2] || images[0] || "",
          videoUrl: "",
          sortOrder: 3,
        },
      ],
    };
  }

  // Stainless steel / premium models
  if (lowerName.includes("stainless") || lowerName.includes("ssma") || lowerSlug.includes("stainless")) {
    return {
      tagline: "All-stainless construction for the most demanding chemical environments.",
      specifications: buildSpecs(20, 60, 14, [
        "Body Construction: Full Stainless Steel SS 316L",
        "Chemical Tank: 20 litres SS 316L",
        "Spray Distance: Up to 10 metres",
        "Premium Grade: All-stainless exterior construction",
      ]),
      features: buildFeatures(20, 60, 14),
      filmChapters: buildChapters(name, images),
    };
  }

  // Default — standard portable thermal fogger (TF-150/TF-200 type)
  return {
    tagline: "Professional thermal fogging technology engineered for India's toughest public health challenges.",
    specifications: buildSpecs(8, 40, 9),
    features: buildFeatures(8, 40, 9),
    filmChapters: buildChapters(name, images),
  };
}

// ── Main seed handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.token !== SEED_TOKEN) {
      return NextResponse.json({ error: "Invalid seed token" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const products = await db.collection("products").find({}).toArray();

    if (!products.length) {
      return NextResponse.json({ message: "No products found in database", updated: 0 });
    }

    const results: string[] = [];

    for (const product of products) {
      const id = product._id;
      const name = String(product.name || "Product");
      const slug = String(product.slug || product._id || "");
      const images: string[] = Array.isArray(product.imageUrls) ? product.imageUrls : [];
      const youtubeLink = String(product.youtubeLink || "");

      const enrichment = getEnrichmentBySlug(slug, name, images);

      // Only add filmChapters videoUrl for chapter 1 if product has a youtube link
      const chapters = enrichment.filmChapters.map((ch, i) => ({
        ...ch,
        videoUrl: i === 0 && youtubeLink ? youtubeLink : "",
      }));

      const update: Record<string, unknown> = {
        tagline: enrichment.tagline,
        certifications: STANDARD_CERTS,
        applications: STANDARD_APPLICATIONS,
        filmChapters: chapters,
        ugcImages: UGC_IMAGES,
        productFaqs: THERMAL_FAQS,
        ...WARRANTY,
        updatedAt: new Date().toISOString(),
      };

      // Only update specs/features if they're empty or minimal
      const existingSpecs = Array.isArray(product.specifications) ? product.specifications : [];
      const existingFeatures = Array.isArray(product.features) ? product.features : [];

      if (existingSpecs.length < 5) {
        update.specifications = enrichment.specifications;
      }
      if (existingFeatures.length < 4) {
        update.features = enrichment.features;
      }

      await db.collection("products").updateOne(
        { _id: id },
        { $set: update }
      );

      results.push(`✓ ${name}`);
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.length} products with full demo content`,
      products: results,
    });

  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Seed failed", detail: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Seed route is active. POST with { token: '100x_seed_demo_2026' } to populate demo content.",
    endpoint: "POST /api/admin/seed-demo",
  });
}
