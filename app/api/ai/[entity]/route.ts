import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import {
  AI_LAST_UPDATED,
  AI_COMPANY,
  AI_FACTORY,
  AI_CERTIFICATIONS,
  AI_CAPABILITIES,
  AI_GOVERNMENT_SUPPLIES,
  AI_PRODUCT_CATEGORIES,
  AI_KNOWLEDGE_ARTICLES,
  SITE_URL,
} from "@/lib/ai/knowledge"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
}

function json(data: object) {
  return NextResponse.json(data, { headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { entity: string } }
) {
  const { entity } = params

  switch (entity) {
    case "company": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/company`,
        data: AI_COMPANY,
      })
    }

    case "factory": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/factory`,
        data: AI_FACTORY,
      })
    }

    case "certifications": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/certifications`,
        count: AI_CERTIFICATIONS.length,
        data: AI_CERTIFICATIONS,
      })
    }

    case "capabilities": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/capabilities`,
        data: AI_CAPABILITIES,
      })
    }

    case "government-supplies": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/government-supplies`,
        data: AI_GOVERNMENT_SUPPLIES,
      })
    }

    case "categories": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/categories`,
        count: AI_PRODUCT_CATEGORIES.length,
        data: AI_PRODUCT_CATEGORIES,
      })
    }

    case "knowledge": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/knowledge`,
        count: AI_KNOWLEDGE_ARTICLES.length,
        data: AI_KNOWLEDGE_ARTICLES,
      })
    }

    case "products": {
      try {
        const client = await clientPromise
        const db = client.db()
        const raw = await db
          .collection("products")
          .find({})
          .sort({ order: 1, createdAt: -1 })
          .toArray()

        const products = raw.map((p) => ({
          id: p._id?.toString() ?? "",
          name: p.name ?? "",
          category: p.category ?? "",
          price_range: p.priceRange ?? "",
          short_description: p.shortDescription ?? "",
          features: Array.isArray(p.features) ? p.features : [],
          specifications: Array.isArray(p.specifications) ? p.specifications : [],
          applications: Array.isArray(p.applications) ? p.applications : [],
          badges: Array.isArray(p.badges) ? p.badges : [],
          in_stock: p.inStock !== false,
          gem_eligible: true,
          url: `${SITE_URL}/products/${p._id?.toString() ?? ""}`,
          image: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : null,
        }))

        return json({
          schema_version: "1.0",
          last_updated: new Date().toISOString().slice(0, 10),
          source: `${SITE_URL}/api/ai/products`,
          company: "100X Circle Pvt Ltd",
          count: products.length,
          data: products,
        })
      } catch {
        return json({
          schema_version: "1.0",
          last_updated: AI_LAST_UPDATED,
          source: `${SITE_URL}/api/ai/products`,
          company: "100X Circle Pvt Ltd",
          count: 0,
          data: [],
          error: "Products temporarily unavailable",
        })
      }
    }

    case "case-studies": {
      return json({
        schema_version: "1.0",
        last_updated: AI_LAST_UPDATED,
        source: `${SITE_URL}/api/ai/case-studies`,
        note: "Detailed case studies available on request. Contact 100xcircle@gmail.com.",
        data: [
          {
            type: "Municipal Vector Control",
            description:
              "Vehicle-mounted thermal foggers supplied to Nagar Nigams across Haryana, UP, and Bihar for monsoon mosquito control drives.",
            scale: "Multiple municipal corporations",
            product: "Vehicle-mounted thermal fogger",
          },
          {
            type: "Government GeM Procurement",
            description:
              "Direct GeM procurement by district health departments for emergency dengue outbreak fogging operations.",
            scale: "District-level procurement",
            product: "Portable thermal fogging machines",
          },
          {
            type: "Agricultural Sector",
            description:
              "Portable foggers deployed by agricultural cooperative societies for paddy and vegetable crop protection across Punjab and Haryana.",
            scale: "Farm cooperative level",
            product: "Agricultural fogging machines",
          },
        ],
      })
    }

    default: {
      return NextResponse.json(
        {
          error: "Unknown entity",
          available_entities: [
            "company",
            "factory",
            "certifications",
            "capabilities",
            "government-supplies",
            "categories",
            "products",
            "knowledge",
            "case-studies",
          ],
          docs: `${SITE_URL}/ai/about-100x`,
        },
        { status: 404, headers: CORS_HEADERS }
      )
    }
  }
}
