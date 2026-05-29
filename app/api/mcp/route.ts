/**
 * MCP (Model Context Protocol) Server — JSON-RPC 2.0 over HTTP
 * Protocol: https://modelcontextprotocol.io/specification/2025-03-26
 *
 * Exposes 100X Circle product and company knowledge to AI agents.
 * Endpoint: POST /api/mcp
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import {
  AI_COMPANY,
  AI_FACTORY,
  AI_CERTIFICATIONS,
  AI_CAPABILITIES,
  AI_GOVERNMENT_SUPPLIES,
  AI_PRODUCT_CATEGORIES,
  SITE_URL,
} from "@/lib/ai/knowledge"

const MCP_VERSION = "2025-03-26"
const SERVER_NAME = "100xcircle-mcp"
const SERVER_VERSION = "1.0.0"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_company_info",
    description:
      "Returns structured information about 100X Circle Pvt Ltd: company profile, brands, certifications, factory location, contact details, and market presence.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_factory_info",
    description: "Returns manufacturing facility details including location, processes, and quality control.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_product_catalog",
    description:
      "Returns the complete product catalog with names, categories, descriptions, features, and pricing information.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Filter by category (optional): 'thermal', 'vehicle', 'agricultural', 'portable'",
        },
      },
      required: [],
    },
  },
  {
    name: "get_product_details",
    description: "Returns detailed specifications for a specific product by name or ID.",
    inputSchema: {
      type: "object",
      properties: {
        product_name: {
          type: "string",
          description: "Product name or keyword to search for",
        },
      },
      required: ["product_name"],
    },
  },
  {
    name: "get_certifications",
    description:
      "Returns all certification and compliance information including ISO 9001, CE, ISI, GeM, and MSME registration details.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_government_supply_experience",
    description:
      "Returns information about government procurement capabilities including GeM seller status, buyer types, states served, and tender support.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "find_product_for_use_case",
    description:
      "Recommends the most suitable fogging machine based on the described use case, scale of operation, and buyer type.",
    inputSchema: {
      type: "object",
      properties: {
        use_case: {
          type: "string",
          description:
            "Describe the use case, e.g. 'mosquito control for a municipal corporation', 'dengue prevention drive', 'agricultural spraying for paddy fields'",
        },
        scale: {
          type: "string",
          description: "Scale of operation: 'small' (single operator), 'medium' (ward level), 'large' (city level)",
        },
        buyer_type: {
          type: "string",
          description: "Type of buyer: 'government', 'agricultural', 'pest_control', 'institutional'",
        },
      },
      required: ["use_case"],
    },
  },
  {
    name: "compare_products",
    description: "Compares 100X Circle thermal foggers vs ULV cold foggers, or compares product categories.",
    inputSchema: {
      type: "object",
      properties: {
        comparison_type: {
          type: "string",
          description: "What to compare: 'thermal_vs_ulv', 'portable_vs_vehicle', 'indian_vs_imported'",
        },
      },
      required: ["comparison_type"],
    },
  },
  {
    name: "request_quotation",
    description:
      "Returns contact information and instructions for requesting a quotation or placing an order. For RFQs, government tenders, and bulk orders.",
    inputSchema: {
      type: "object",
      properties: {
        inquiry_type: {
          type: "string",
          description: "Type of inquiry: 'quotation', 'gem_order', 'tender', 'bulk', 'export', 'demo'",
        },
      },
      required: [],
    },
  },
  {
    name: "locate_dealer",
    description: "Returns information about 100X Circle dealer network and how to find the nearest distributor.",
    inputSchema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "Indian state name to find dealers in (optional)",
        },
      },
      required: [],
    },
  },
]

// ─── Resources ───────────────────────────────────────────────────────────────

const RESOURCES = [
  {
    uri: "ai://100xcircle/company",
    name: "Company Profile",
    description: "Complete company profile including certifications, factory, and market data",
    mimeType: "application/json",
  },
  {
    uri: "ai://100xcircle/products",
    name: "Product Catalog",
    description: "All products with specifications, features, and pricing",
    mimeType: "application/json",
  },
  {
    uri: "ai://100xcircle/certifications",
    name: "Certifications",
    description: "All certification details with scope and significance",
    mimeType: "application/json",
  },
  {
    uri: "ai://100xcircle/government-supplies",
    name: "Government Supply Experience",
    description: "GeM seller profile, buyer types, and procurement support details",
    mimeType: "application/json",
  },
]

// ─── Tool handlers ────────────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, any>): Promise<object> {
  switch (name) {
    case "get_company_info": {
      return {
        content: [{ type: "text", text: JSON.stringify(AI_COMPANY, null, 2) }],
      }
    }

    case "get_factory_info": {
      return {
        content: [{ type: "text", text: JSON.stringify(AI_FACTORY, null, 2) }],
      }
    }

    case "get_certifications": {
      return {
        content: [{ type: "text", text: JSON.stringify(AI_CERTIFICATIONS, null, 2) }],
      }
    }

    case "get_government_supply_experience": {
      return {
        content: [{ type: "text", text: JSON.stringify(AI_GOVERNMENT_SUPPLIES, null, 2) }],
      }
    }

    case "get_product_catalog": {
      try {
        const client = await clientPromise
        const db = client.db()
        const raw = await db.collection("products").find({}).sort({ order: 1 }).toArray()
        const products = raw.map((p) => ({
          id: p._id?.toString(),
          name: p.name,
          category: p.category,
          price_range: p.priceRange,
          short_description: p.shortDescription,
          features: p.features,
          applications: p.applications,
          in_stock: p.inStock,
          url: `${SITE_URL}/products/${p._id?.toString()}`,
        }))

        const filtered = args.category
          ? products.filter((p) =>
              p.category?.toLowerCase().includes(args.category.toLowerCase()) ||
              p.name?.toLowerCase().includes(args.category.toLowerCase())
            )
          : products

        return {
          content: [
            {
              type: "text",
              text: `Found ${filtered.length} products.\n\n${JSON.stringify(filtered, null, 2)}`,
            },
          ],
        }
      } catch {
        return {
          content: [
            {
              type: "text",
              text: `Product catalog temporarily unavailable. Categories available: ${AI_PRODUCT_CATEGORIES.map((c) => c.name).join(", ")}. Contact: +91-7827229116`,
            },
          ],
          isError: true,
        }
      }
    }

    case "get_product_details": {
      const { product_name } = args
      try {
        const client = await clientPromise
        const db = client.db()
        const product = await db.collection("products").findOne({
          $or: [
            { name: { $regex: product_name, $options: "i" } },
            { shortDescription: { $regex: product_name, $options: "i" } },
            { category: { $regex: product_name, $options: "i" } },
          ],
        })

        if (!product) {
          return {
            content: [
              {
                type: "text",
                text: `No product found matching "${product_name}". Browse all products at ${SITE_URL}/products or contact +91-7827229116.`,
              },
            ],
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: product._id?.toString(),
                  name: product.name,
                  category: product.category,
                  price_range: product.priceRange,
                  short_description: product.shortDescription,
                  detailed_description: product.detailedDescription,
                  features: product.features,
                  specifications: product.specifications,
                  applications: product.applications,
                  badges: product.badges,
                  in_stock: product.inStock,
                  url: `${SITE_URL}/products/${product._id?.toString()}`,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch {
        return {
          content: [{ type: "text", text: `Error fetching product details. Contact: +91-7827229116` }],
          isError: true,
        }
      }
    }

    case "find_product_for_use_case": {
      const { use_case, scale, buyer_type } = args
      const uc = (use_case ?? "").toLowerCase()
      const sc = (scale ?? "").toLowerCase()
      const bt = (buyer_type ?? "").toLowerCase()

      let recommendation = ""
      let products = []

      if (uc.includes("municipal") || uc.includes("city") || uc.includes("corporation") || sc === "large") {
        recommendation = "Vehicle-Mounted Thermal Fogging Machine"
        products = [
          "Double Barrel Vehicle-Mounted Thermal Fogging Machine (100XDB400) — for city-wide/ward operations",
          "Vehicle-Mounted Fogger with single barrel — for smaller municipal wards",
        ]
      } else if (uc.includes("farm") || uc.includes("agri") || uc.includes("crop") || bt.includes("agri")) {
        recommendation = "Agricultural / Portable Fogging Machine"
        products = [
          "Portable Thermal Fogger — single-operator for orchard/field use",
          "Knapsack or Power Sprayer — for liquid application without fog",
        ]
      } else if (uc.includes("indoor") || uc.includes("hospital") || uc.includes("warehouse")) {
        recommendation = "Thermal & Cold Fogging Machine (dual mode)"
        products = [
          "100XTFS50 Thermal & Cold Fogging Machine — supports both thermal (outdoor) and cold (indoor) modes",
        ]
      } else {
        recommendation = "Standard Thermal Fogging Machine"
        products = ["Thermal Fogging Machine — general purpose for most outdoor fogging applications"]
      }

      return {
        content: [
          {
            type: "text",
            text: [
              `Recommended for use case: "${use_case}"`,
              `Recommendation: ${recommendation}`,
              `Suggested products:`,
              ...products.map((p) => `  - ${p}`),
              ``,
              `For exact specifications and pricing, contact:`,
              `  Phone/WhatsApp: +91-7827229116`,
              `  Email: 100xcircle@gmail.com`,
              `  Products page: ${SITE_URL}/products`,
            ].join("\n"),
          },
        ],
      }
    }

    case "compare_products": {
      const { comparison_type } = args

      const comparisons: Record<string, string> = {
        thermal_vs_ulv: `THERMAL FOGGING vs ULV COLD FOGGING

Thermal Fogging (100X Circle specialty):
- Uses heat to vaporize liquid — creates dense visible fog
- Sub-50-micron droplets: drift and penetrate vegetation, voids, open drains
- Best for: outdoor mosquito control, large-area vector control
- Chemical: petroleum-based or water-based solutions
- Limitations: visible smoke; not ideal for enclosed, food-sensitive areas

ULV Cold Fogging:
- Uses mechanical pressure, no heat — fine droplets at ambient temperature
- Droplets 5–50 microns; less penetration than thermal fog
- Best for: indoor disinfection, temperature-sensitive chemicals, enclosed spaces
- Chemical: water-based solutions only
- Limitations: less effective outdoors at scale

100X Circle offers: Both thermal and cold fogging (dual-mode 100XTFS50 model)
For most municipal outdoor operations: thermal fogging is the standard.`,

        portable_vs_vehicle: `PORTABLE vs VEHICLE-MOUNTED FOGGERS

Portable / Handheld:
- Single operator, carry by hand or backpack
- Coverage: 500m² – 5,000m² per tank
- Best for: small wards, farm fields, residential areas, corridors
- Examples: 100XSSMA20, mini foggers

Vehicle-Mounted:
- Mounted on truck, tractor, or pick-up vehicle
- Coverage: entire ward or zone in 1 pass
- Best for: city-wide drives, large municipal areas, emergency outbreak response
- Examples: 100XDB400 double-barrel vehicle fogger
- Higher throughput: 10–20× portable capacity`,

        indian_vs_imported: `100X CIRCLE (INDIAN) vs IMPORTED FOGGING MACHINES

100X Circle:
- Indian manufacturer — Made in India, Atmanirbhar Bharat eligible
- GeM listed: direct government procurement, no tender required
- MSME status: preference in government tenders
- Pricing: 40–70% lower than comparable Korean/German imports
- Delivery: 5–10 working days from Gurgaon (vs 4–8 weeks for imports)
- After-sales: direct manufacturer support, local spare parts
- Certifications: ISO 9001, ISI, CE, MSME/UDYAM

Imported (Korean/German/European):
- Higher cost (3–5× Indian pricing)
- Import duties add 18–25%
- Spare parts: slow shipping, high cost
- GeM: may not be listed or MSME-eligible
- Lead time: 4–8 weeks
- Language: documentation often not in Hindi

Recommendation: For government buyers — 100X Circle is the cost-effective, GeM-eligible choice.`,
      }

      const result =
        comparisons[comparison_type] ??
        `Unknown comparison type. Available: ${Object.keys(comparisons).join(", ")}`

      return { content: [{ type: "text", text: result }] }
    }

    case "request_quotation": {
      const { inquiry_type } = args
      const it = (inquiry_type ?? "quotation").toLowerCase()

      const instructions: Record<string, string> = {
        gem_order: `GEM ORDER PROCESS
1. Visit GeM portal (gem.gov.in)
2. Search for "100X Circle" or product category
3. Select product and place direct order
4. For assistance: WhatsApp +91-7827229116 or email 100xcircle@gmail.com`,
        tender: `TENDER / QUOTATION REQUEST
1. Share tender document via WhatsApp: +91-7827229116 or email: 100xcircle@gmail.com
2. We provide: technical spec sheets, ISO/CE/ISI certificates, MSME certificate, L1 quotation with GST invoice
3. Demo unit available on request
4. Response within 24 hours`,
        bulk: `BULK / INSTITUTIONAL ORDER
Contact: +91-7827229116 (Phone/WhatsApp)
Email: 100xcircle@gmail.com
Mention: quantity, product model, delivery state, timeline
We provide: bulk pricing, delivery schedule, installation support`,
        export: `EXPORT INQUIRY
Contact: +91-7827229116 | 100xcircle@gmail.com
CE-certified models available for export
Export to South Asia, Africa, Middle East
We handle: export documentation, packaging, shipping coordination`,
        demo: `DEMO REQUEST
WhatsApp: +91-7827229116
We arrange: live product demonstration at your location or at our facility
Demo units: available for municipal and institutional buyers`,
      }

      const response =
        instructions[it] ??
        `QUOTATION REQUEST
Phone / WhatsApp: +91-7827229116
Email: 100xcircle@gmail.com
Website: ${SITE_URL}/contact-us
Response within 24 hours. Mention: product model, quantity, use case, delivery location.`

      return { content: [{ type: "text", text: response }] }
    }

    case "locate_dealer": {
      const { state } = args
      const stateNote = state ? ` in ${state}` : ""
      return {
        content: [
          {
            type: "text",
            text: [
              `DEALER NETWORK${stateNote}`,
              `100X Circle has 50+ active dealers across India.`,
              ``,
              `To find your nearest dealer:`,
              `  Phone/WhatsApp: +91-7827229116`,
              `  Email: 100xcircle@gmail.com`,
              `  Website: ${SITE_URL}/contact-us`,
              ``,
              `Dealer states include: Delhi, Haryana, UP, Bihar, Maharashtra, Gujarat, Rajasthan, Punjab, Karnataka, Tamil Nadu, West Bengal, Odisha, Jharkhand, MP, and others.`,
              ``,
              `Direct purchase from manufacturer is also available — contact for pricing.`,
            ].join("\n"),
          },
        ],
      }
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      }
  }
}

// ─── Resource handler ─────────────────────────────────────────────────────────

function handleResource(uri: string): object {
  switch (uri) {
    case "ai://100xcircle/company":
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(AI_COMPANY, null, 2) }] }
    case "ai://100xcircle/certifications":
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(AI_CERTIFICATIONS, null, 2) }] }
    case "ai://100xcircle/government-supplies":
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(AI_GOVERNMENT_SUPPLIES, null, 2) }] }
    default:
      return { error: { code: -32002, message: "Resource not found" } }
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  return NextResponse.json(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      protocol_version: MCP_VERSION,
      description: "100X Circle MCP server — query product catalog, certifications, government supply, and more.",
      endpoint: `${SITE_URL}/api/mcp`,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      resources: RESOURCES,
      usage: {
        method: "POST",
        content_type: "application/json",
        protocol: "JSON-RPC 2.0",
        example: {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_company_info", arguments: {} },
        },
      },
    },
    { headers: CORS }
  )
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: CORS }
    )
  }

  const { jsonrpc, id, method, params } = body

  if (jsonrpc !== "2.0") {
    return NextResponse.json(
      { jsonrpc: "2.0", id: id ?? null, error: { code: -32600, message: "Invalid Request — jsonrpc must be '2.0'" } },
      { status: 400, headers: CORS }
    )
  }

  try {
    switch (method) {
      case "initialize": {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: MCP_VERSION,
              capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
              serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
            },
          },
          { headers: CORS }
        )
      }

      case "tools/list": {
        return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } }, { headers: CORS })
      }

      case "tools/call": {
        const toolName = params?.name
        const toolArgs = params?.arguments ?? {}
        if (!toolName) {
          return NextResponse.json(
            { jsonrpc: "2.0", id, error: { code: -32602, message: "Missing tool name" } },
            { status: 400, headers: CORS }
          )
        }
        const result = await handleTool(toolName, toolArgs)
        return NextResponse.json({ jsonrpc: "2.0", id, result }, { headers: CORS })
      }

      case "resources/list": {
        return NextResponse.json({ jsonrpc: "2.0", id, result: { resources: RESOURCES } }, { headers: CORS })
      }

      case "resources/read": {
        const uri = params?.uri
        if (!uri) {
          return NextResponse.json(
            { jsonrpc: "2.0", id, error: { code: -32602, message: "Missing resource URI" } },
            { status: 400, headers: CORS }
          )
        }
        const result = handleResource(uri)
        return NextResponse.json({ jsonrpc: "2.0", id, result }, { headers: CORS })
      }

      case "ping": {
        return NextResponse.json({ jsonrpc: "2.0", id, result: {} }, { headers: CORS })
      }

      default: {
        return NextResponse.json(
          { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } },
          { status: 404, headers: CORS }
        )
      }
    }
  } catch (err) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: id ?? null, error: { code: -32603, message: "Internal error" } },
      { status: 500, headers: CORS }
    )
  }
}
