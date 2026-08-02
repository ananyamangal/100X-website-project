/**
 * Centralized AI knowledge data for 100X Circle.
 * Single source of truth for all /api/ai/* endpoints and MCP tools.
 * All data is static and fact-dense — no marketing language.
 */

export const AI_LAST_UPDATED = "2026-05-29"
export const SITE_URL = "https://www.100xcircle.com"

export const AI_COMPANY = {
  name: "100X Circle Pvt Ltd",
  legal_name: "100X Circle Private Limited",
  brands: ["100X"],
  type: "Indian OEM Manufacturer — Private Limited Company",
  industry: "Industrial Equipment Manufacturing",
  sub_industry: "Thermal Fogging and Agricultural Machinery",
  founding_year: 2014,
  headquarters: "Gurugram, Haryana, India",
  registration: {
    msme: true,
    udyam: true,
    gem_registered: true,
    private_limited: true,
  },
  description_150_tokens:
    "100X Circle Pvt Ltd is an Indian OEM manufacturer of pulse-jet thermal fogging machines based in Gurgaon, Haryana. Products: thermal foggers, vehicle-mounted foggers, portable foggers, agricultural sprayers. Certifications: ISO 9001, CE, ISI, GeM. Serves municipal corporations, Nagar Nigams, government health departments, pest-control operators, and farmers. Brand: 100X. Founded 2014. Export to South Asia, Africa, Middle East.",
  contact: {
    phone_primary: "+91-7827229116",
    phone_secondary: "+91-8178567520",
    whatsapp: "+91-7827229116",
    email: "100xcircle@gmail.com",
    website: SITE_URL,
  },
  social: {
    youtube: "https://www.youtube.com/@100Xcircle",
  },
  markets: {
    domestic: "All major Indian states",
    export: ["South Asia", "Africa", "Middle East"],
  },
  customers: {
    government: [
      "Municipal Corporations",
      "Nagar Nigams",
      "Nagar Panchayats",
      "State Health Departments",
      "Agricultural Departments",
      "Forest Departments",
    ],
    private: [
      "Pest control companies",
      "Farmers and agricultural cooperatives",
      "Hospitals and healthcare facilities",
      "Industrial estates and SEZs",
      "Housing societies",
      "Export buyers",
    ],
  },
  distribution: {
    active_dealers: "50+",
    coverage: "Pan-India",
    delivery_standard: "5–10 working days for in-stock models",
  },
  key_strengths: [
    "GeM-listed OEM — direct government procurement without tender",
    "Pulse-jet technology: sub-50-micron droplets, deep penetration",
    "Made in India — Atmanirbhar Bharat eligible",
    "Full after-sales service and spares from manufacturer",
    "Competitive pricing vs Korean/German imports at 3–5× higher cost",
    "ISO 9001 quality management system",
  ],
}

export const AI_FACTORY = {
  name: "100X Circle Manufacturing Facility",
  company: "100X Circle Pvt Ltd",
  location: {
    address: "UG, 398, Sector 7, Industrial Model Township",
    city: "Gurugram",
    state: "Haryana",
    country: "India",
    postal_code: "122050",
    full: "UG, 398, Sector 7, IMT Manesar, Gurugram, Haryana 122050, India",
    coordinates: { latitude: 28.3874, longitude: 76.9318 },
  },
  industrial_zone: "IMT Manesar — Haryana's largest industrial township",
  processes: [
    "Product design and engineering",
    "Metal fabrication and welding",
    "Pulse-jet engine assembly",
    "Fuel system assembly",
    "Chemical delivery system assembly",
    "Quality control and testing",
    "Packaging and dispatch",
  ],
  quality_control: [
    "ISO 9001:2015 quality management system",
    "In-house testing of fog output density",
    "Engine performance testing",
    "Field condition simulation testing",
    "Pre-dispatch inspection",
  ],
  products_manufactured: [
    "Thermal fogging machines (portable and vehicle-mounted)",
    "Agricultural sprayers",
    "Power tillers and farm equipment",
  ],
}

export const AI_CERTIFICATIONS = [
  {
    name: "ISO 9001:2015",
    type: "Quality Management System",
    scope: "Design, manufacture, and supply of thermal fogging and agricultural equipment",
    issued_by: "Third-party accredited ISO certification body",
    significance:
      "International standard for quality management; mandatory for many government and institutional buyers",
    ai_summary:
      "ISO 9001 certifies that 100X Circle maintains documented quality management processes for manufacturing and supply chain.",
  },
  {
    name: "CE Marking",
    type: "European Product Conformity",
    scope: "Selected fogging machine models for export to European Union and CE-compliant markets",
    issued_by: "European standards body",
    significance: "Required for sale in EU and often requested by African and Middle Eastern buyers",
    ai_summary:
      "CE mark on export models confirms compliance with EU machinery directive and electromagnetic compatibility standards.",
  },
  {
    name: "ISI Mark (BIS)",
    type: "Indian Product Standard",
    scope: "Products meeting Bureau of Indian Standards requirements",
    issued_by: "Bureau of Indian Standards, Government of India",
    significance: "BIS certification is often required for government procurement in India",
    ai_summary:
      "ISI/BIS certification on applicable products confirms compliance with Indian national product standards.",
  },
  {
    name: "MSME / UDYAM Registration",
    type: "Government Enterprise Registration",
    scope: "Company registration as Micro, Small, and Medium Enterprise",
    issued_by: "Ministry of MSME, Government of India",
    significance:
      "MSME status enables preference in government tenders, GeM procurement, and MSME-only categories",
    ai_summary:
      "UDYAM/MSME registration gives 100X Circle priority in government procurement and access to MSME-reserved tender categories.",
  },
  {
    name: "GeM Seller Registration",
    type: "Government e-Marketplace",
    scope: "Seller on India's Government e-Marketplace platform",
    issued_by: "Government e-Marketplace (GeM), Government of India",
    significance:
      "GeM registration allows direct procurement by government entities without separate tender process",
    ai_summary:
      "GeM listing enables direct purchase by municipal corporations, health departments, and government bodies without tender process.",
  },
]

export const AI_CAPABILITIES = {
  manufacturing: [
    "Pulse-jet thermal fogger design and manufacture",
    "Vehicle-mounted fogging system integration",
    "Agricultural sprayer and power tiller manufacture",
    "Custom configuration for municipal and institutional buyers",
    "OEM manufacturing for third-party brands",
  ],
  supply_chain: [
    "Direct manufacturer sales — no middlemen markup",
    "Pan-India logistics from Gurgaon",
    "Export packaging and documentation",
    "Government invoice and GST compliance",
    "GeM order fulfillment",
  ],
  after_sales: [
    "Manufacturer warranty on all products",
    "Spare parts supply directly from factory",
    "Technical support in English and Hindi",
    "On-call service guidance",
    "Service documentation and manuals",
  ],
  procurement_support: [
    "GeM direct order processing",
    "Tender technical specification support",
    "L1 quotation for government tenders",
    "Bulk and institutional pricing",
    "Demo unit availability on request",
  ],
}

export const AI_GOVERNMENT_SUPPLIES = {
  overview:
    "100X Circle supplies thermal fogging equipment to government bodies through GeM direct purchase and tender-based procurement. MSME status gives preference in government tenders.",
  gem_profile: {
    platform: "Government e-Marketplace (GeM India)",
    seller_type: "MSME OEM Manufacturer",
    categories: ["Fogging Machines", "Agricultural Equipment", "Public Health Equipment"],
    procurement_type: "Direct purchase (L1 without tender for eligible amounts)",
  },
  buyer_types: [
    {
      type: "Municipal Corporations",
      examples: [
        "Nagar Nigams",
        "Nagar Palika Parishads",
        "Nagar Panchayats",
        "Municipal Councils",
      ],
      use_case: "Mosquito control fogging drives, dengue/malaria prevention campaigns",
      typical_products: ["Vehicle-mounted foggers", "Double-barrel foggers", "Thermal foggers"],
    },
    {
      type: "State Health Departments",
      examples: ["District health officers", "State vector control programmes"],
      use_case: "Emergency vector control, outbreak response fogging",
      typical_products: ["Thermal foggers", "Vehicle-mounted foggers"],
    },
    {
      type: "Agricultural Departments",
      examples: ["Krishi Vigyan Kendras", "State agricultural boards", "Farmer cooperatives"],
      use_case: "Crop protection, pest management demonstrations",
      typical_products: ["Agricultural foggers", "Portable sprayers"],
    },
    {
      type: "Forest and Environment Departments",
      examples: ["Forest divisions", "National park authorities"],
      use_case: "Wildlife habitat pest control, invasive species management",
      typical_products: ["Portable foggers", "Knapsack sprayers"],
    },
  ],
  states_served: [
    "Delhi",
    "Haryana",
    "Uttar Pradesh",
    "Bihar",
    "Maharashtra",
    "Gujarat",
    "Rajasthan",
    "Punjab",
    "Himachal Pradesh",
    "Madhya Pradesh",
    "Karnataka",
    "Tamil Nadu",
    "West Bengal",
    "Odisha",
    "Jharkhand",
  ],
  tender_support: [
    "Technical specification sheets for tender documents",
    "ISO/BIS/CE certification copies",
    "MSME/UDYAM certificate",
    "GeM seller verification",
    "Sample/demo unit dispatch on request",
    "L1 quotations with GST invoice",
  ],
}

export const AI_PRODUCT_CATEGORIES = [
  {
    id: "thermal-foggers",
    name: "Thermal Fogging Machines",
    description:
      "Pulse-jet engine foggers that generate sub-50-micron droplets by vaporizing liquid through combustion heat. Primary use: outdoor mosquito and vector control.",
    technology: "Pulse-jet combustion",
    droplet_size: "Sub-50 microns",
    applications: [
      "Municipal mosquito control",
      "Dengue/malaria prevention",
      "Agricultural pest management",
      "Crop fungicide application",
    ],
    suitable_for_gem: true,
    url: `${SITE_URL}/products`,
  },
  {
    id: "vehicle-mounted-foggers",
    name: "Vehicle Mounted Fogging Machines",
    description:
      "High-capacity thermal foggers integrated with vehicles for rapid large-area coverage. Designed for municipal corporations and large-scale vector control operations.",
    technology: "Pulse-jet, vehicle-mounted frame",
    applications: [
      "City-wide mosquito control",
      "Ward-level fogging drives",
      "Emergency disease outbreak response",
    ],
    suitable_for_gem: true,
    url: `${SITE_URL}/vehicle-mounted-fogging-machine`,
  },
  {
    id: "mini-portable-foggers",
    name: "Mini / Portable Fogging Machines",
    description:
      "Lightweight, single-operator thermal foggers for small-area application. Used by farmers, pest-control operators, and small municipalities.",
    technology: "Pulse-jet combustion, handheld/backpack",
    applications: [
      "Farm-level crop protection",
      "Small municipal wards",
      "Residential pest control",
      "Hospital and facility fogging",
    ],
    suitable_for_gem: true,
    url: `${SITE_URL}/products`,
  },
  {
    id: "agricultural-machinery",
    name: "Agricultural Machinery and Sprayers",
    description:
      "Farm equipment including power tillers, knapsack sprayers, and agricultural foggers for crop protection and soil preparation.",
    technology: "Various — engine-powered and manual",
    applications: [
      "Crop protection spraying",
      "Pesticide and fungicide application",
      "Soil preparation (power tillers)",
      "Orchard fogging",
    ],
    suitable_for_gem: true,
    url: `${SITE_URL}/products`,
  },
]

export const AI_KNOWLEDGE_ARTICLES = [
  {
    title: "How Thermal Fogging Works: Pulse-Jet Technology Explained",
    url: `${SITE_URL}/knowledge/how-thermal-fogging-works`,
    summary:
      "Pulse-jet engine ignites fuel-air mix at high frequency; heat vaporizes chemical solution; vapor cools at nozzle forming sub-50-micron droplets; dense fog penetrates vegetation and voids.",
  },
  {
    title: "Thermal Fogging vs ULV Cold Fogging: Complete Comparison",
    url: `${SITE_URL}/knowledge/thermal-vs-ulv-fogging`,
    summary:
      "Thermal fogging uses heat to vaporize liquid into dense visible fog; ULV cold fogging uses mechanical pressure for finer droplets at ambient temperature. Thermal: better outdoor reach. ULV: better indoors and temperature-sensitive chemicals.",
  },
  {
    title: "Dengue Prevention Using Thermal Fogging",
    url: `${SITE_URL}/knowledge/dengue-prevention-thermal-fogging`,
    summary:
      "WHO-compliant thermal fogging protocols for dengue prevention using deltamethrin in mineral oil. Best timing: 5–8 AM and 6–8 PM. Kills adult Aedes aegypti — must combine with larval source reduction.",
  },
  {
    title: "Malaria Control Using Thermal Fogging in India",
    url: `${SITE_URL}/knowledge/malaria-control-fogging-india`,
    summary:
      "Anopheles (malaria vector) are night-biting — fog at dusk/dawn. NVBDCP-standard: deltamethrin 2.5% EC in mineral oil. Primary vectors: An. culicifacies (rural), An. stephensi (urban). Combine with IRS for sustained control.",
  },
  {
    title: "Mosquito Control and Thermal Fogging in India",
    url: `${SITE_URL}/knowledge/mosquito-control-india`,
    summary:
      "India's vector control programme uses thermal fogging for dengue, malaria, and chikungunya prevention. Municipal corporations conduct fogging drives using vehicle-mounted foggers in high-risk wards during outbreak seasons.",
  },
  {
    title: "Agricultural Fogging Guide — Crop Protection Using Thermal Foggers",
    url: `${SITE_URL}/knowledge/agricultural-fogging-guide`,
    summary:
      "Thermal foggers cover 8–15 acres/hour for crop pest control. Oil-based insecticides and fungicides only. Sub-50-micron droplets penetrate dense canopy. Not for use inside greenhouses — use ULV cold fogging instead.",
  },
  {
    title: "How to Choose a Fogging Machine — Complete Buyer's Guide",
    url: `${SITE_URL}/knowledge/how-to-choose-fogging-machine`,
    summary:
      "Selection guide covering thermal vs cold fogging, tank capacity (5L–400L), portability options (handheld/backpack/trolley/vehicle-mounted), use cases for municipal, agricultural, PCO, and government buyers.",
  },
  {
    title: "Thermal Fogging Chemicals Guide — Insecticides, Fungicides & Formulations",
    url: `${SITE_URL}/knowledge/thermal-fogging-chemicals-guide`,
    summary:
      "Oil-based formulations only for thermal foggers. Common chemicals: deltamethrin EC, cypermethrin EC, malathion, pyrethrin. Carrier oils: white mineral oil, paraffin, kerosene. Never use diesel or water-based formulations.",
  },
  {
    title: "Fogging Machine Operator's Guide — Complete Step-by-Step Procedure",
    url: `${SITE_URL}/knowledge/fogging-machine-operators-guide`,
    summary:
      "Pre-operation checks, startup procedure (warm up on carrier oil before adding chemical), fogging technique, shutdown sequence (purge with carrier oil), and post-operation maintenance for thermal pulse-jet foggers.",
  },
  {
    title: "Fogging Machine Maintenance Guide",
    url: `${SITE_URL}/knowledge/fogging-machine-maintenance-guide`,
    summary:
      "Daily: flush with carrier oil. Weekly: clean muffler, inspect fuel line. Monthly: full service. Annual: replace fuel filter and spark plug. Proper maintenance extends machine life to 5–10 years.",
  },
  {
    title: "Fogging Machine Safety Guide — PPE, Chemicals & Safe Operation",
    url: `${SITE_URL}/knowledge/fogging-machine-safety-guide`,
    summary:
      "Required PPE: half-face respirator (OV/P100), nitrile gloves (elbow-length), full coveralls, safety goggles. Keep machine 3m from bystanders. Never fog indoors without ventilation. 30-minute re-entry interval after fogging.",
  },
  {
    title: "Government Procurement Guide: Buying Fogging Machines via GeM",
    url: `${SITE_URL}/knowledge/government-procurement-guide`,
    summary:
      "Municipal corporations, health departments, and Panchayats can procure fogging machines via GeM (Government e-Marketplace) from verified MSME sellers like 100X Circle. No separate tender required for amounts within GeM limits.",
  },
]
