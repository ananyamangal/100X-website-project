/**
 * CATEGORY_CATALOG — master list of all supported intelligence categories.
 * Shared between API routes and UI components.
 * Source of truth for keyword sets, estimates, and default pack states.
 */

export interface CategoryDefinition {
  slug:          string
  name:          string
  icon:          string
  description:   string
  keywords:      string[]
  gemCollection?: string  // optional: use a curated collection instead of gem_contracts tagging
  estimate: {
    contracts:     number
    gmvCr:         number
    importTimeMin: number
    storageMb:     number
  }
  packs: Record<string, string>
}

export const CATEGORY_CATALOG: CategoryDefinition[] = [
  {
    slug:          "fogging-machines",
    name:          "Thermal Fogging Machines",
    icon:          "🌫️",
    description:   "Thermal and cold-fog mosquito control, disinfection, and agricultural spraying equipment",
    keywords:      ["fogging", "fogger", "thermal fog", "cold fog", "fog machine", "mist blower", "ulv sprayer"],
    gemCollection: "fogging_contracts",
    estimate:      { contracts: 1418, gmvCr: 75.08, importTimeMin: 0, storageMb: 4 },
    packs:         { procurement: "active", buyer: "active", supplier: "active", oem: "active", competitor: "active", market: "active", aiSearch: "pending" },
  },
  {
    slug:        "note-sorting-machines",
    name:        "Note Sorting Machines",
    icon:        "💴",
    description: "Currency note sorting, counting, and authentication machines for banking and cash management",
    keywords:    ["note sorting", "currency sorting", "banknote sorting", "note sorter", "cash sorting", "currency counting machine", "note counting", "banknote counter"],
    estimate:    { contracts: 2500, gmvCr: 150, importTimeMin: 8, storageMb: 6 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
  {
    slug:        "currency-counting-machines",
    name:        "Currency Counting Machines",
    icon:        "🏧",
    description: "Coin and note counting machines for treasury, banks, and retail cash operations",
    keywords:    ["currency counting", "coin counting", "cash counting", "note counting machine", "cash counter", "banknote counting"],
    estimate:    { contracts: 3000, gmvCr: 120, importTimeMin: 9, storageMb: 7 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
  {
    slug:        "banking-equipment",
    name:        "Banking Equipment",
    icon:        "🏦",
    description: "ATMs, cash dispensers, bank safes, vault doors, strong rooms, and cash management systems",
    keywords:    ["ATM", "cash dispenser", "bank safe", "vault", "strong room", "cash management system", "banking equipment"],
    estimate:    { contracts: 8000, gmvCr: 500, importTimeMin: 15, storageMb: 18 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
  {
    slug:        "electrical-switchgear",
    name:        "Electrical Switchgear",
    icon:        "⚡",
    description: "Circuit breakers, MCBs, MCCBs, distribution boards, transformers, and HV/LV switchgear",
    keywords:    ["switchgear", "circuit breaker", "MCB", "MCCB", "distribution board", "transformer", "panel board", "HT switchgear", "LT switchgear"],
    estimate:    { contracts: 25000, gmvCr: 2000, importTimeMin: 45, storageMb: 58 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
  {
    slug:        "agricultural-machinery",
    name:        "Agricultural Machinery",
    icon:        "🚜",
    description: "Tractors, harvesters, rotavators, crop sprayers, and agricultural implements",
    keywords:    ["tractor", "harvester", "rotavator", "agricultural machinery", "farming equipment", "crop sprayer", "power tiller", "seed drill"],
    estimate:    { contracts: 15000, gmvCr: 800, importTimeMin: 30, storageMb: 35 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
  {
    slug:        "medical-equipment",
    name:        "Medical Equipment",
    icon:        "🏥",
    description: "Ventilators, ECG machines, X-Ray, ultrasound, hospital furniture, and diagnostic equipment",
    keywords:    ["ventilator", "ECG", "X-Ray", "ultrasound", "hospital equipment", "medical device", "surgical", "diagnostic", "ICU equipment"],
    estimate:    { contracts: 50000, gmvCr: 5000, importTimeMin: 90, storageMb: 115 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
  {
    slug:        "airport-equipment",
    name:        "Airport Equipment",
    icon:        "✈️",
    description: "Ground support equipment, airfield lighting, FIDS boards, baggage handling, and air traffic systems",
    keywords:    ["airport equipment", "ground support", "airfield", "baggage handling", "FIDS", "aircraft tow", "runway equipment"],
    estimate:    { contracts: 3000, gmvCr: 400, importTimeMin: 10, storageMb: 7 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
  {
    slug:        "defence-equipment",
    name:        "Defence Equipment",
    icon:        "🛡️",
    description: "Defence vehicles, communication systems, surveillance, personal protection, and field equipment",
    keywords:    ["defence equipment", "army", "military equipment", "surveillance", "communication system", "field equipment", "body armour", "defence vehicle"],
    estimate:    { contracts: 5000, gmvCr: 1200, importTimeMin: 15, storageMb: 12 },
    packs:       { procurement: "pending", buyer: "pending", supplier: "pending", oem: "not_started", competitor: "not_started", market: "pending", aiSearch: "not_started" },
  },
]

export const BUILT_IN_SLUGS = new Set(CATEGORY_CATALOG.map(c => c.slug))
