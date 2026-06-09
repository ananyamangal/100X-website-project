import { SITE_URL } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"

interface Props {
  id: string
  name: string
  category: string
  shortDescription: string
  priceRange?: string
  inStock: boolean
  features: string[]
  badges: string[]
}

/**
 * Server-rendered AI summary for product pages.
 * Gives AI crawlers structured product facts without JS execution.
 */
export default function ProductAiSummary({
  id, name, category, shortDescription, priceRange, inStock, features, badges
}: Props) {
  const descPlain = plainTextFromHtml(shortDescription)
  const summary = `${name} by 100X Circle Pvt Ltd. Category: ${category}. ${descPlain ? descPlain.slice(0, 200) : ""} ${priceRange ? `Price: ${priceRange}.` : ""} In stock: ${inStock ? "Yes" : "No"}. Manufacturer: 100X Circle Pvt Ltd, IMT Manesar, Gurugram, India. ISO 9001:2015 certified. GeM eligible.`

  return (
    <aside
      data-ai-entity="product"
      data-ai-product-id={id}
      data-ai-product-name={name}
      data-ai-summary={summary}
      className="sr-only"
      aria-label={`AI-readable product summary for ${name}`}
    >
      <h2>{name} — Product Summary</h2>
      <dl>
        <dt>Product Name</dt><dd>{name}</dd>
        <dt>Category</dt><dd>{category}</dd>
        <dt>Manufacturer</dt><dd>100X Circle Pvt Ltd</dd>
        <dt>Description</dt><dd>{descPlain}</dd>
        {priceRange && <><dt>Price Range</dt><dd>{priceRange}</dd></>}
        <dt>Availability</dt><dd>{inStock ? "In Stock" : "Out of Stock"}</dd>
        <dt>Certifications</dt><dd>ISO 9001:2015, GeM listed, MSME/UDYAM</dd>
        <dt>Origin</dt><dd>Made in India — IMT Manesar, Gurugram, Haryana</dd>
        <dt>Product URL</dt><dd>{SITE_URL}/products/{id}</dd>
        <dt>API Endpoint</dt><dd>{SITE_URL}/api/ai/products</dd>
        {features.length > 0 && (
          <><dt>Key Features</dt><dd>{features.slice(0, 5).join("; ")}</dd></>
        )}
        {badges.length > 0 && (
          <><dt>Badges / Certifications</dt><dd>{badges.join(", ")}</dd></>
        )}
      </dl>
    </aside>
  )
}
