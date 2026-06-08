/**
 * Recovery script — inserts the 7 missing Thai-origin products into production MongoDB.
 * Mirrors the logic in /api/admin/seed-complete/route.ts exactly.
 * Safe to run multiple times: skips any slug that already exists.
 */

import { MongoClient } from "mongodb";

const MONGODB_URI =
  "mongodb://ananyamangal20:CtzH9HMgZy3COE6k@ac-0w8luaw-shard-00-00.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-01.sq3cjz5.mongodb.net:27017,ac-0w8luaw-shard-00-02.sq3cjz5.mongodb.net:27017/100xDB?authSource=admin&replicaSet=atlas-fmfsa5-shard-0&tls=true&retryWrites=true&w=majority&appName=100x-website-project";

const V = "https://www.bestfoggerthailand.com/wp-content/uploads/2025/08";

const CERTS = ["ISO 9001:2015", "GeM Registered", "MSME/UDYAM Certified", "Made in India"];
const WARRANTY = {
  warrantyEnabled: true,
  warrantyPeriod: "1 Year",
  warrantyDescription:
    "Covers manufacturing defects and material failure under normal operating conditions. Genuine spare parts guaranteed for 5+ years. Contact 100X Circle with original invoice for claims.",
  warrantyIcon: "🛡️",
};

const FOGGING_FAQS = [
  { q: "What chemicals can be used with this machine?", a: "Compatible with all WHO-approved fogging formulations: oil-based pyrethroid concentrates, fungicides, and disinfectants. The Grade 316L stainless steel construction handles all standard formulations. For thermal foggers, use oil-based carrier formulations only. ULV models support water-based and oil-based solutions." },
  { q: "Is this machine suitable for government tenders?", a: "Yes. 100X Circle is GeM-registered (Government e-Marketplace) and MSME/UDYAM certified. Complete tender documentation — product test certificates, ISO certificate, GST registration, MSME certificate — is provided with every order. Respond to tenders within 24 hours." },
  { q: "What is the delivery timeline?", a: "Standard pan-India delivery: 5–7 working days. Bulk/government orders (10+ units): 10–15 working days. Emergency orders available — contact us for expedited dispatch. Volume pricing for 5+ units." },
  { q: "Do you provide operator training?", a: "Yes — complimentary training with every purchase. Includes video materials and Hindi-language operator manual. On-site training available for bulk orders (5+ machines). Training covers safe operation, chemical handling, PPE, and basic maintenance." },
  { q: "What warranty is provided?", a: "1-year manufacturer warranty covering manufacturing defects and material failure under normal use. Genuine OEM spare parts guaranteed for 5+ years from purchase date. Claims assessed and resolved within 5 working days." },
  { q: "Are spare parts readily available?", a: "Yes. 100X Circle stocks all critical spare parts at our Gurugram facility. Standard parts ship pan-India within 3 working days. Emergency same-day dispatch for orders before 12 PM. 50+ individual components available." },
  { q: "Can this machine be used for dengue control programmes?", a: "Yes. Thermal fogging is WHO-recommended for adult mosquito control during dengue, malaria, and chikungunya outbreaks. Use approved pyrethroid formulations and follow NVBDCP guidelines for dosage, timing, and operational protocols." },
];

const NEW_PRODUCTS = [
  {
    slug: "100x-ulv-cold-fogger-bf105",
    name: "100X ULV Cold Fogger BF-105",
    category: "ULV Cold Fogging Machines",
    tagline: "Electric cold fogging for indoor disinfection, hospitals, and precision pest control.",
    priceRange: "Price on Request",
    badges: ["Made in India", "GeM Registered"],
    rating: 4.7,
    reviewsCount: 18,
    inStock: true,
    imageUrls: [`${V}/bf105.jpg`],
    shortDescription: "<p>The 100X BF-105 ULV Cold Fogger is an electric-powered fine-mist sprayer designed for indoor disinfection, hospital sanitisation, and precision pest control. Cold fog technology eliminates heat risk, making it safe for occupied spaces. Adjustable droplet size 5–50 microns. Compatible with water-based and oil-based formulations.</p>",
    detailedDescription: "<p>The 100X BF-105 ULV Cold Fogger represents the precision end of the fogging spectrum. While thermal foggers rely on combustion heat to generate fog, the BF-105 uses air-shear atomisation at ambient temperature to create ultra-fine droplets of 5–50 microns — completely adjustable via the variable orifice nozzle.</p><p><strong>Safe in Occupied Spaces.</strong> No heat. No combustion. No fuel vapour. The BF-105 can be operated in occupied hospitals, schools, food processing facilities, and server rooms where thermal fog is not suitable. The same WHO-approved active ingredients deliver equivalent efficacy without thermal risk.</p><p><strong>Water-Based Formulations.</strong> Unlike thermal foggers requiring oil-based carrier formulations, the BF-105 works with standard water-diluted chemical concentrates — significantly reducing per-application operating cost for high-frequency disinfection programmes.</p><p><strong>GeM Ready.</strong> Supplied with complete government procurement documentation for direct GeM purchase by hospitals, health departments, and institutional buyers.</p>",
    features: [
      "Cold fog: no heat — safe for occupied spaces",
      "Adjustable droplet size: 5–50 microns",
      "Compatible with water-based and oil-based formulations",
      "Electric operation: no fuel, no combustion",
      "Compact and lightweight: ~4 kg operating weight",
      "Quiet operation: suitable for hospital and school use",
      "Variable flow control: 0–15 L/hr adjustable",
      "GeM Registered: government procurement ready",
    ],
    specifications: [
      "Machine Type: ULV Cold Fogger (Ultra-Low Volume)",
      "Fog Type: Cold Fog — ambient temperature atomisation",
      "Power Source: Electric (AC 220V / DC 12V battery)",
      "Tank Capacity: 5 litres",
      "Output Rate: 0–15 litres/hour (adjustable)",
      "Droplet Size: 5–50 microns (variable orifice nozzle)",
      "Spray Distance: 3–6 metres",
      "Chemical Compatibility: Water-based and oil-based formulations",
      "Operating Weight: approx. 4 kg",
      "Noise Level: Low — suitable for occupied spaces",
      "Origin: India",
      "Certifications: ISO 9001:2015, GeM Registered",
    ],
    applications: [
      "Hospital and healthcare facility disinfection",
      "School and institutional campus sanitisation",
      "Food processing plant sanitation",
      "Hotel and hospitality hygiene programmes",
      "Office and commercial building disinfection",
      "Cold storage and warehouse fumigation",
      "Precision agricultural pesticide application",
      "Poultry and livestock farm sanitation",
      "Municipal public health disinfection",
      "Airport and transit hub sanitisation",
    ],
    certifications: CERTS,
    ...WARRANTY,
    productFaqs: FOGGING_FAQS,
    filmChapters: [
      { title: "Safe for Occupied Spaces — No Heat, No Risk", subtitle: "Cold fog technology: ambient temperature atomisation", description: "The BF-105 generates ultra-fine fog through air-shear atomisation — no heat source, no combustion, no fuel vapour. This makes it safe to operate in occupied hospitals, schools, and food facilities where thermal foggers cannot be deployed.", imageUrl: `${V}/bf105.jpg`, videoUrl: "", sortOrder: 1 },
      { title: "Adjustable Droplet Size: 5–50 Microns", subtitle: "One machine, multiple applications", description: "The variable orifice nozzle system allows precise adjustment from 5-micron near-vapour to 50-micron larger droplets. The same BF-105 handles aerial mosquito control, surface disinfection, and deodorisation without changing equipment.", imageUrl: `${V}/bf105.jpg`, videoUrl: "", sortOrder: 2 },
      { title: "Water-Based Formulations — Lower Operating Cost", subtitle: "No oil carrier required", description: "Unlike thermal foggers requiring oil-based carrier formulations, the BF-105 works directly with water-diluted concentrates. For hospitals requiring daily disinfection, this reduces chemical cost per sq. metre significantly over a full year.", imageUrl: `${V}/bf105.jpg`, videoUrl: "", sortOrder: 3 },
    ],
    ugcImages: [],
    whatsappMessageText: "Hi 100X Circle, I'm interested in the ULV Cold Fogger BF-105. Please share pricing and availability.",
    h1Title: "BF-105 ULV Cold Fogger — Electric Indoor Disinfection Machine",
  },
  {
    slug: "100x-ulv-cold-fogger-bf115",
    name: "100X ULV Cold Fogger BF-115",
    category: "ULV Cold Fogging Machines",
    tagline: "High-capacity electric ULV fogger for large-area indoor disinfection and vector control.",
    priceRange: "Price on Request",
    badges: ["Made in India", "GeM Registered", "Heavy Duty"],
    rating: 4.8,
    reviewsCount: 24,
    inStock: true,
    imageUrls: [`${V}/bf115.jpg`],
    shortDescription: "<p>The 100X BF-115 is the high-capacity version of our ULV cold fogger range. With an 8-litre tank and extended spray range, it is designed for large indoor areas — hospitals, warehouse facilities, school campuses, and commercial complexes. Adjustable droplet size 5–50 microns. Electric operation — no fuel, no combustion, safe for occupied spaces.</p>",
    detailedDescription: "<p>The BF-115 is engineered for operators who need the safety of cold fog technology but require the capacity for large-area disinfection programmes. The 8-litre tank and enhanced output rate mean fewer refill stops during extended operations in hospitals, warehouse complexes, and institutional campuses.</p><p><strong>Extended Tank, Extended Operations.</strong> The 8-litre chemical tank provides longer uninterrupted operation than standard-capacity models.</p><p><strong>Enhanced Spray Distance.</strong> The BF-115 delivers extended spray distance for higher ceilings and larger open-plan spaces.</p><p><strong>Government Procurement Ready.</strong> GeM-registered for direct institutional procurement.</p>",
    features: [
      "Large capacity: 8-litre chemical tank",
      "Extended spray distance: up to 8 metres",
      "Cold fog: safe in occupied spaces",
      "Adjustable droplet size: 5–50 microns",
      "Variable output: 0–20 L/hr adjustable",
      "Electric operation: AC 220V or DC 12V",
      "Suited for: hospitals, warehouses, large campuses",
      "GeM Registered: government procurement ready",
    ],
    specifications: [
      "Machine Type: ULV Cold Fogger — Large Capacity",
      "Fog Type: Cold Fog — ambient temperature atomisation",
      "Power Source: Electric (AC 220V / DC 12V battery option)",
      "Tank Capacity: 8 litres",
      "Output Rate: 0–20 litres/hour (adjustable)",
      "Droplet Size: 5–50 microns (variable orifice nozzle)",
      "Spray Distance: Up to 8 metres",
      "Chemical Compatibility: Water-based and oil-based formulations",
      "Operating Weight: approx. 6 kg",
      "Continuous Operation: Yes — no rest cycle required",
      "Origin: India",
      "Certifications: ISO 9001:2015, GeM Registered, MSME/UDYAM",
    ],
    applications: [
      "Hospital ward and ICU disinfection",
      "Large warehouse and cold storage fumigation",
      "University and school campus sanitisation",
      "Hotel and hospitality large-area programmes",
      "Airport terminal and gate disinfection",
      "Food processing facility sanitation",
      "Municipal indoor public space disinfection",
      "Shopping mall and commercial complex hygiene",
      "Pharmaceutical manufacturing facility sanitisation",
      "Residential housing society common area treatment",
    ],
    certifications: CERTS,
    ...WARRANTY,
    productFaqs: FOGGING_FAQS,
    filmChapters: [
      { title: "8-Litre Tank — Fewer Stops, More Coverage", subtitle: "Large capacity for extended hospital and campus operations", description: "The BF-115's 8-litre chemical tank provides extended uninterrupted operation. For hospital infection control teams running ward-by-ward sanitisation, fewer refill stops means less disruption to patients and staff.", imageUrl: `${V}/bf115.jpg`, videoUrl: "", sortOrder: 1 },
      { title: "8-Metre Spray Range — Reaches Every Corner", subtitle: "High ceilings and open-plan spaces covered", description: "The enhanced output system delivers fog up to 8 metres — addressing high ceilings, elevated HVAC duct zones, and large open-plan spaces that compact ULV foggers cannot effectively cover.", imageUrl: `${V}/bf115.jpg`, videoUrl: "", sortOrder: 2 },
      { title: "No Combustion — No Evacuation Required", subtitle: "Operate safely in occupied, semi-occupied, or sensitive environments", description: "Cold fog atomisation at ambient temperature means no fire risk, no fuel vapour, no heat-generated toxic compounds. The BF-115 can operate in semi-occupied spaces, reducing the operational complexity of large-scale disinfection programmes.", imageUrl: `${V}/bf115.jpg`, videoUrl: "", sortOrder: 3 },
    ],
    ugcImages: [],
    whatsappMessageText: "Hi 100X Circle, I'm interested in the ULV Cold Fogger BF-115 (large capacity). Please share pricing and availability.",
    h1Title: "BF-115 ULV Cold Fogger — High-Capacity Electric Disinfection Fogger",
  },
  {
    slug: "100x-heavy-duty-thermal-fogger-bf400",
    name: "100X Heavy-Duty Thermal Fogger BF-400",
    category: "Thermal Fogging Machines",
    tagline: "High-output thermal fogging system for large-area municipal and agricultural operations.",
    priceRange: "Price on Request",
    badges: ["Made in India", "GeM Registered", "Heavy Duty", "Best Seller"],
    rating: 4.9,
    reviewsCount: 31,
    inStock: true,
    imageUrls: [`${V}/bf400-1.jpg`],
    shortDescription: "<p>The 100X BF-400 is our heavy-duty thermal fogging system built for high-volume municipal vector control, large-scale agricultural operations, and industrial pest management. Powered by a pulse-jet resonance engine with a large-capacity stainless steel chemical tank, it delivers sustained high-output fogging across large areas with a single operator.</p>",
    detailedDescription: "<p>The 100X BF-400 Heavy-Duty Thermal Fogger is engineered for operators who need more than a standard portable fogger can deliver. With a larger chemical tank capacity and higher sustained output rate, the BF-400 is the preferred choice for municipal corporations handling large wards, agricultural cooperatives treating extensive crop areas, and institutional pest control operators with high throughput requirements.</p><p><strong>High-Volume Output.</strong> The BF-400's enhanced resonance combustion chamber delivers up to 80 litres of chemical per hour.</p><p><strong>Government-Trusted Reliability.</strong> GeM-registered for direct purchase by Nagar Nigams, District Health Departments, and State Agriculture Departments.</p>",
    features: [
      "High output rate: up to 80 L/hr for large-area coverage",
      "Large-capacity stainless steel Grade 316L chemical tank",
      "DC 12V electric auto-start: no manual priming",
      "Spray distance: up to 10+ metres outdoor",
      "Continuous duty operation — no rest cycles",
      "Suitable for vehicle mounting on trucks/tractors",
      "Municipal and agriculture preferred model",
      "GeM Registered: government procurement ready",
    ],
    specifications: [
      "Machine Type: Heavy-Duty Pulse-Jet Thermal Fogger",
      "Start System: DC 12V Electric Auto-Start",
      "Power Source: Rechargeable 12V DC Battery (ignition)",
      "Chemical Tank Material: Grade 316L Marine Stainless Steel",
      "Output Rate: Up to 80 litres/hour",
      "Spray Distance: Up to 10–12 metres (outdoor conditions)",
      "Fuel Consumption: approx. 2.0 litres/hour",
      "Droplet Size: 8–15 microns (ultra-fine thermal fog)",
      "Operation Mode: Continuous duty",
      "Configuration: Portable / Vehicle-Mountable",
      "Origin: India",
      "Certifications: ISO 9001:2015, GeM Registered, MSME/UDYAM",
    ],
    applications: [
      "Large-area municipal mosquito control (dengue, malaria, chikungunya)",
      "District health department large-scale vector control",
      "Agricultural estate and plantation pest management",
      "Vehicle-mounted municipal fogging operations",
      "Industrial zone and SEZ pest control",
      "Cantonment and defence area large-scale fogging",
      "Export and port phytosanitary fumigation",
      "Large poultry and livestock farm disinfection",
      "Railway yard and transit corridor pest management",
      "Stadium, sports complex, and event venue fogging",
    ],
    certifications: CERTS,
    ...WARRANTY,
    productFaqs: FOGGING_FAQS,
    filmChapters: [
      { title: "80 Litres Per Hour — Municipal-Scale Output", subtitle: "Double the throughput of standard portable models", description: "The BF-400's enhanced resonance chamber delivers up to 80 litres of chemical per hour. For Nagar Nigams running large-ward dengue prevention drives, higher output means more residents covered per operator shift.", imageUrl: `${V}/bf400-1.jpg`, videoUrl: "", sortOrder: 1 },
      { title: "Continuous Duty. No Mandatory Rest.", subtitle: "Built for sustained high-volume operations", description: "The BF-400 is designed for continuous operation during extended morning fogging campaigns. The advanced dual-cooling system maintains stable output through multiple consecutive tank cycles.", imageUrl: `${V}/bf400-1.jpg`, videoUrl: "", sortOrder: 2 },
      { title: "GeM Listed. Direct Purchase for Government Departments.", subtitle: "Emergency procurement in days, not months", description: "The BF-400 is GeM-listed for direct purchase by government departments — no tender required. 100X Circle has supplied BF-400 class machines to district health departments for emergency outbreak response.", imageUrl: `${V}/bf400-1.jpg`, videoUrl: "", sortOrder: 3 },
    ],
    ugcImages: [],
    whatsappMessageText: "Hi 100X Circle, I'm interested in the Heavy-Duty BF-400 Thermal Fogger. Please share pricing and availability.",
    h1Title: "BF-400 Heavy-Duty Thermal Fogger — High-Output Municipal & Agricultural Fogging",
  },
  {
    slug: "100x-minisuper-2000-gold-classic",
    name: "100X Minisuper 2000 Gold — Classic Edition",
    category: "Thermal Fogging Machines",
    tagline: "Compact pulse-jet thermal fogger — the classic Korean design trusted for decades.",
    priceRange: "Price on Request",
    badges: ["Made in India", "GeM Registered"],
    rating: 4.6,
    reviewsCount: 42,
    inStock: true,
    imageUrls: [`${V}/2000old.jpg`],
    shortDescription: "<p>The 100X Minisuper 2000 Gold Classic Edition is a compact, lightweight portable thermal fogger based on the time-tested Korean pulse-jet design. Favoured by pest control professionals and health departments for its simplicity, reliability, and ease of field maintenance.</p>",
    detailedDescription: "<p>The Minisuper 2000 Gold Classic Edition embodies the simplicity that made Korean pulse-jet thermal foggers the standard for professional mosquito control operations worldwide. With decades of field-proven performance in demanding tropical environments, this design has been refined through thousands of hours of real-world operator feedback.</p><p><strong>Proven Design.</strong> The classic pulse-jet resonance chamber geometry proven in field operations across Southeast Asia, South Asia, and Africa.</p><p><strong>Field-Serviceable.</strong> All critical components accessible without specialised tools. Field technicians can resolve most issues without returning the machine to a service centre.</p>",
    features: [
      "Compact classic Korean pulse-jet design",
      "Field-serviceable: all parts accessible without specialist tools",
      "Trusted by pest control professionals globally",
      "Compatible with all WHO-approved thermal fogging formulations",
      "DC 12V auto-start system",
      "Stainless steel chemical contact surfaces",
      "Easy operator familiarity and training",
      "GeM Registered: government procurement ready",
    ],
    specifications: [
      "Machine Type: Classic Pulse-Jet Thermal Fogger",
      "Start System: DC 12V Electric Auto-Start",
      "Power Source: Rechargeable 12V DC Battery",
      "Chemical Tank: Stainless Steel (Grade 316L)",
      "Spray Distance: Up to 6–8 metres",
      "Droplet Size: 8–15 microns",
      "Operation Mode: Continuous duty",
      "Design: Classic compact portable configuration",
      "Origin: India",
      "Certifications: ISO 9001:2015, GeM Registered",
    ],
    applications: [
      "Municipal mosquito and vector control programmes",
      "Pest control company field operations",
      "Agricultural crop protection",
      "Hospital and healthcare facility fumigation",
      "Residential colony and housing society fogging",
      "Government health department vector control",
      "Industrial zone pest management",
      "Poultry farm disinfection",
    ],
    certifications: CERTS,
    ...WARRANTY,
    productFaqs: FOGGING_FAQS,
    filmChapters: [
      { title: "Proven Design — Decades of Field Performance", subtitle: "The original Korean pulse-jet geometry, unchanged for good reason", description: "The Minisuper 2000 Gold Classic design has been operating in demanding tropical environments for decades, refined through thousands of hours of real-world feedback in mosquito control operations.", imageUrl: `${V}/2000old.jpg`, videoUrl: "", sortOrder: 1 },
      { title: "Field Serviceable — No Workshop Required", subtitle: "Every component accessible with basic tools", description: "Professional pest control operators value machines they can fix in the field. The Minisuper 2000 Classic's open architecture means nozzle, carburetor, fuel lines, and valves can all be serviced in the field.", imageUrl: `${V}/2000old.jpg`, videoUrl: "", sortOrder: 2 },
    ],
    ugcImages: [],
    whatsappMessageText: "Hi 100X Circle, I'm interested in the Minisuper 2000 Gold Classic thermal fogger. Please share pricing and availability.",
    h1Title: "Minisuper 2000 Gold Classic — Compact Korean Pulse-Jet Thermal Fogger",
  },
  {
    slug: "100x-thermal-fogger-bf150",
    name: "100X Thermal Fogger BF-150",
    category: "Thermal Fogging Machines",
    tagline: "The professional standard — DC 12V auto-start pulse-jet thermal fogger trusted by municipalities and pest control professionals.",
    priceRange: "Price on Request",
    badges: ["Made in India", "GeM Registered", "Best Seller"],
    rating: 4.8,
    reviewsCount: 56,
    inStock: true,
    imageUrls: [`${V}/bf150-3.jpg`],
    shortDescription: "<p>The 100X BF-150 is the professional benchmark in portable thermal fogging — a DC 12V auto-start pulse-jet fogger built from Grade 316L marine stainless steel. With an 8-litre chemical tank, 40 litre/hour output, and continuous-duty operation, it is the preferred machine for municipal mosquito control, licensed pest control companies, and government health departments.</p>",
    detailedDescription: "<p>The 100X BF-150 represents the professional standard in portable thermal fogging technology. Built on a Korean-origin pulse-jet resonance design, it combines reliable auto-start ignition, Grade 316L stainless steel construction, and continuous-duty operation into a single-operator portable unit.</p><p><strong>DC 12V Auto-Start — One Button, Three Seconds.</strong> Electronic ignition fires in under 3 seconds from a fully charged battery.</p><p><strong>Grade 316L Stainless Steel.</strong> Every chemical-contact surface fabricated from Grade 316L marine stainless steel — handles all WHO-approved formulations without degradation.</p><p><strong>Complete Spare Parts Ecosystem.</strong> 100X Circle stocks all 50+ BF-150 spare parts at our Gurugram facility.</p>",
    features: [
      "DC 12V Electric Auto-Start: ignition in under 3 seconds",
      "Grade 316L Marine Stainless Steel chemical tank and lance",
      "8-litre chemical tank capacity",
      "Output Rate: 40 litres/hour continuous",
      "Operating Weight: 9 kg (single-operator portable)",
      "Dual cooling system: continuous-duty without rest cycles",
      "Spray Distance: up to 6 metres effective range",
      "Transparent fuel and chemical monitoring lines",
      "Droplet Size: 8–15 microns ultra-fine thermal fog",
      "GeM Registered: government procurement ready",
      "50+ spare parts stocked at 100X Gurugram facility",
    ],
    specifications: [
      "Machine Type: Pulse-Jet Resonance Thermal Fogger",
      "Model: BF-150",
      "Start System: DC 12V Electric Auto-Start",
      "Power Source: Rechargeable 12V DC Battery",
      "Combustion: Pulse-Jet Resonance Chamber",
      "Chemical Tank Capacity: 8 litres",
      "Tank Material: Grade 316L Marine Stainless Steel",
      "Fuel Tank Capacity: 1.8 litres",
      "Output Rate: 40 litres/hour",
      "Fuel Consumption: approx. 1.5 litres/hour",
      "Spray Distance: Up to 6 metres",
      "Droplet Size: 8–15 microns (ultra-fine thermal fog)",
      "Operating Weight: 9 kg (empty tanks)",
      "Operation Mode: Continuous duty",
      "Origin: India",
      "Certifications: ISO 9001:2015, GeM Registered, MSME/UDYAM",
    ],
    applications: [
      "Municipal mosquito and vector control (dengue, malaria, chikungunya)",
      "District health department emergency fogging operations",
      "Licensed pest control company (PCO) field operations",
      "Agricultural crop protection — paddy, cotton, vegetables, orchards",
      "Poultry farm and livestock facility disinfection",
      "Hospital and healthcare facility fumigation",
      "Public housing society and residential complex fogging",
      "Warehousing and cold storage pest management",
      "Cantonment board and defence establishment pest control",
      "Food processing plant and facility sanitation",
    ],
    certifications: CERTS,
    ...WARRANTY,
    productFaqs: FOGGING_FAQS,
    filmChapters: [
      { title: "Grade 316L Stainless Steel — Built to Last", subtitle: "Marine-grade steel handles all WHO-approved fogging chemicals", description: "Every chemical-contact surface in the BF-150 is fabricated from Grade 316L marine stainless steel. The machine you buy today performs identically in year five.", imageUrl: `${V}/bf150-3.jpg`, videoUrl: "", sortOrder: 1 },
      { title: "DC 12V Auto-Start — No Delays in the Field", subtitle: "Electronic ignition in under 3 seconds, every time", description: "One button. Under 3 seconds. The DC 12V electronic ignition fires reliably in all weather conditions. For municipal teams running pre-dawn dengue prevention drives, fast consistent starts multiply into significantly more wards covered.", imageUrl: `${V}/bf150-3.jpg`, videoUrl: "", sortOrder: 2 },
      { title: "50+ Spare Parts. 5-Year Availability Guarantee.", subtitle: "Never stranded — all parts stocked at Gurugram facility", description: "100X Circle stocks all 50+ BF-150 spare parts at our Gurugram facility. Standard parts ship pan-India within 3 working days. Emergency same-day dispatch before 12 PM.", imageUrl: `${V}/bf150-3.jpg`, videoUrl: "", sortOrder: 3 },
    ],
    ugcImages: [],
    whatsappMessageText: "Hi 100X Circle, I'm interested in the BF-150 Thermal Fogger. Please share pricing and availability.",
    h1Title: "BF-150 Thermal Fogger — Professional DC 12V Auto-Start Pulse-Jet Fogging Machine",
  },
  {
    slug: "100x-thermal-fogger-bf200",
    name: "100X Thermal Fogger BF-200",
    category: "Thermal Fogging Machines",
    tagline: "Higher output Korean thermal fogger — 50 L/hr for demanding municipal and agricultural operations.",
    priceRange: "Price on Request",
    badges: ["Made in India", "GeM Registered", "Heavy Duty"],
    rating: 4.9,
    reviewsCount: 38,
    inStock: true,
    imageUrls: [`${V}/bf200.jpg`],
    shortDescription: "<p>The 100X BF-200 is the higher-output version of our flagship thermal fogger series. With a 50-litre/hour output rate and Grade 316L stainless steel construction, it is designed for operators requiring faster area coverage. DC 12V auto-start, 8-litre tank, 10 kg operating weight.</p>",
    detailedDescription: "<p>The 100X BF-200 builds on the proven BF-150 platform with a 25% increase in output capacity — from 40 to 50 litres per hour.</p><p><strong>50 L/hr — 25% More Coverage Per Shift.</strong> In a standard 3-hour morning municipal fogging campaign, this additional output means 30 more litres treated per machine per shift.</p><p><strong>Same Trusted Platform, Higher Output.</strong> Operators trained on the BF-150 require no additional training. Maintenance is identical. Spare parts are shared across the BF-150/200 range.</p>",
    features: [
      "Higher output: 50 litres/hour — 25% more than BF-150",
      "DC 12V Electric Auto-Start: ignition in under 3 seconds",
      "Grade 316L Marine Stainless Steel — all chemical-contact surfaces",
      "8-litre chemical tank capacity",
      "Dimensions: 24 × 136 × 35 cm — compact portable form factor",
      "Operating Weight: 10 kg (single-operator portable)",
      "Dual cooling system: continuous-duty operation",
      "Spray Distance: up to 6 metres effective range",
      "Transparent fuel and chemical monitoring lines",
      "Shared spare parts with BF-150 — single inventory for both models",
    ],
    specifications: [
      "Machine Type: Pulse-Jet Resonance Thermal Fogger",
      "Model: BF-200",
      "Start System: DC 12V Electric Auto-Start",
      "Power Source: Rechargeable 12V DC Battery",
      "Combustion: Pulse-Jet Resonance Chamber",
      "Chemical Tank Capacity: 8 litres",
      "Tank Material: Grade 316L Marine Stainless Steel",
      "Fuel Tank Capacity: 1.8 litres",
      "Output Rate: 50 litres/hour",
      "Fuel Consumption: approx. 1.5 litres/hour",
      "Spray Distance: Up to 6 metres",
      "Machine Dimensions: 24 × 136 × 35 cm",
      "Droplet Size: 8–15 microns (ultra-fine thermal fog)",
      "Operating Weight: 10 kg (empty tanks)",
      "Operation Mode: Continuous duty",
      "Origin: India",
      "Certifications: ISO 9001:2015, GeM Registered, MSME/UDYAM",
    ],
    applications: [
      "Municipal large-ward mosquito and vector control operations",
      "District health department high-throughput fogging campaigns",
      "Licensed pest control companies with high daily volume",
      "Agricultural estate and plantation pest management",
      "Poultry farm and large livestock facility disinfection",
      "Industrial zone and SEZ pest control",
      "Cantonment board and defence area large-scale fogging",
      "Hospital and healthcare campus fumigation",
      "Food processing facility and cold storage pest management",
      "Residential housing society and township fogging",
    ],
    certifications: CERTS,
    ...WARRANTY,
    productFaqs: FOGGING_FAQS,
    filmChapters: [
      { title: "50 Litres/Hour — Faster Area Coverage, Same Operator", subtitle: "25% output advantage over BF-150 without additional machines", description: "The BF-200's enhanced resonance combustion chamber delivers 50 litres per hour. For health departments managing multiple wards, the BF-200 effectively stretches the same operator headcount across more coverage area.", imageUrl: `${V}/bf200.jpg`, videoUrl: "", sortOrder: 1 },
      { title: "One Spare Parts Inventory for Two Machines", subtitle: "BF-150 and BF-200 share the full 50+ part catalogue", description: "Fleet operators managing both BF-150 and BF-200 machines maintain a single shared spare parts inventory — carburetor assemblies, diaphragms, hoses, valves, ignition components, and pumps are fully interchangeable across both models.", imageUrl: `${V}/bf200.jpg`, videoUrl: "", sortOrder: 2 },
      { title: "Same Training. Zero Additional Learning Curve.", subtitle: "BF-150 operators run the BF-200 from day one", description: "An operator qualified on the BF-150 requires zero additional training to operate the BF-200. For municipal departments upgrading existing fleets, the BF-200 slots directly into existing operational protocols.", imageUrl: `${V}/bf200.jpg`, videoUrl: "", sortOrder: 3 },
    ],
    ugcImages: [],
    whatsappMessageText: "Hi 100X Circle, I'm interested in the BF-200 Thermal Fogger (50 L/hr). Please share pricing and availability.",
    h1Title: "BF-200 Thermal Fogger — 50 L/hr High-Output Korean Pulse-Jet Fogging Machine",
  },
  {
    slug: "100x-minisuper-2000-gold-new",
    name: "100X Minisuper 2000 Gold — New Edition",
    category: "Thermal Fogging Machines",
    tagline: "Updated Korean pulse-jet fogger — improved ergonomics, enhanced durability, same trusted core.",
    priceRange: "Price on Request",
    badges: ["Made in India", "GeM Registered", "Heavy Duty"],
    rating: 4.8,
    reviewsCount: 29,
    inStock: true,
    imageUrls: [`${V}/2000new.jpg`],
    shortDescription: "<p>The 100X Minisuper 2000 Gold New Edition is the updated design incorporating operator feedback and enhanced material specifications. Improved ergonomic carry handle, updated chemical circuit, and reinforced frame construction — built on the same reliable pulse-jet core.</p>",
    detailedDescription: "<p>The Minisuper 2000 Gold New Edition represents the evolution of the proven classic design. Genuine OEM engineers incorporated feedback from thousands of field operators to address the most common maintenance points and operational improvement requests.</p><p><strong>Enhanced Ergonomics.</strong> The redesigned carry handle and improved weight distribution reduce operator fatigue during extended morning fogging operations.</p><p><strong>Updated Chemical Circuit.</strong> Improved valve geometry delivers more consistent output control.</p><p><strong>Reinforced Frame.</strong> Updated frame construction provides greater resistance to the mechanical stress of daily loading and field deployment.</p>",
    features: [
      "Updated ergonomic carry handle and weight distribution",
      "Improved chemical circuit with enhanced valve geometry",
      "Reinforced frame construction for extended service life",
      "Same reliable pulse-jet resonance core as classic edition",
      "DC 12V auto-start: electronic ignition",
      "Grade 316L stainless steel chemical contact surfaces",
      "Compatible with all WHO-approved thermal fogging chemicals",
      "GeM Registered: government procurement ready",
    ],
    specifications: [
      "Machine Type: Updated Pulse-Jet Thermal Fogger",
      "Edition: New Design (2024 Update)",
      "Start System: DC 12V Electric Auto-Start",
      "Power Source: Rechargeable 12V DC Battery",
      "Chemical Tank: Grade 316L Stainless Steel",
      "Spray Distance: Up to 6–8 metres",
      "Droplet Size: 8–15 microns (ultra-fine thermal fog)",
      "Key Improvement: Enhanced ergonomics + reinforced frame",
      "Operation Mode: Continuous duty",
      "Origin: India (updated design)",
      "Certifications: ISO 9001:2015, GeM Registered, MSME/UDYAM",
    ],
    applications: [
      "Municipal mosquito control (dengue, malaria, chikungunya)",
      "Professional pest control company operations",
      "Agricultural crop and plantation pest management",
      "Hospital and facility fumigation",
      "Government health department vector control",
      "Poultry and livestock farm disinfection",
      "Residential colony fogging",
      "Industrial zone pest control",
    ],
    certifications: CERTS,
    ...WARRANTY,
    productFaqs: FOGGING_FAQS,
    filmChapters: [
      { title: "Same Core. Better Ergonomics.", subtitle: "Operator feedback built into every design decision", description: "The New Edition retains the proven pulse-jet resonance core that field operators worldwide have trusted for decades. Updates came directly from feedback by professional field operators who run these machines 5 days a week.", imageUrl: `${V}/2000new.jpg`, videoUrl: "", sortOrder: 1 },
      { title: "Reinforced Frame — Built for Daily Professional Use", subtitle: "Updated joint specifications for longer service intervals", description: "The New Edition's reinforced frame addresses the most common maintenance point of the classic design. Improved joint and mounting specifications extend service intervals and reduce total maintenance cost.", imageUrl: `${V}/2000new.jpg`, videoUrl: "", sortOrder: 2 },
    ],
    ugcImages: [],
    whatsappMessageText: "Hi 100X Circle, I'm interested in the Minisuper 2000 Gold New Edition. Please share pricing and availability.",
    h1Title: "Minisuper 2000 Gold New Edition — Updated Korean Pulse-Jet Thermal Fogger",
  },
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log("Connected to MongoDB Atlas.");

  const db = client.db("100xDB");
  const col = db.collection("products");
  const now = new Date().toISOString();

  const inserted = [];
  const skipped = [];

  for (const p of NEW_PRODUCTS) {
    const existing = await col.findOne({ slug: p.slug });
    if (existing) {
      skipped.push(p.slug);
      console.log(`  SKIP (exists): ${p.slug}`);
      continue;
    }
    const doc = { ...p, createdAt: now, updatedAt: now, order: 100 };
    const result = await col.insertOne(doc);
    inserted.push(p.name);
    console.log(`  INSERT: ${p.name} → ${result.insertedId}`);
  }

  console.log("\n--- SUMMARY ---");
  console.log(`Inserted: ${inserted.length} products`);
  console.log(`Skipped:  ${skipped.length} (already existed)`);
  if (inserted.length > 0) {
    console.log("Inserted products:");
    inserted.forEach((n) => console.log("  •", n));
  }

  // Verify final count
  const total = await col.countDocuments();
  console.log(`\nFinal products count in MongoDB: ${total}`);

  await client.close();
  console.log("Done. Connection closed.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
