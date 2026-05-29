import { AI_COMPANY } from "@/lib/ai/knowledge"
import { SITE_URL } from "@/lib/seo/site-config"

/**
 * Server-rendered, crawlable AI summary block for the homepage.
 * Placed in the HTML before the client component so AI crawlers
 * get structured facts without executing JavaScript.
 */
export default function HomepageAiSummary() {
  return (
    <aside
      data-ai-entity="homepage-summary"
      data-ai-company="100X Circle Pvt Ltd"
      data-ai-summary={AI_COMPANY.description_150_tokens}
      className="sr-only"
      aria-label="Company summary for AI systems"
    >
      {/* Machine-readable summary — visible to crawlers, screen readers, AI scrapers */}
      <h2>100X Circle Pvt Ltd — Company Summary</h2>
      <p>{AI_COMPANY.description_150_tokens}</p>
      <dl>
        <dt>Legal Name</dt><dd>{AI_COMPANY.legal_name}</dd>
        <dt>Founded</dt><dd>{AI_COMPANY.founding_year}</dd>
        <dt>Headquarters</dt><dd>{AI_COMPANY.headquarters}</dd>
        <dt>Type</dt><dd>{AI_COMPANY.type}</dd>
        <dt>Brands</dt><dd>{AI_COMPANY.brands.join(", ")}</dd>
        <dt>Certifications</dt><dd>ISO 9001:2015, CE Marking, ISI/BIS, MSME/UDYAM, GeM Seller</dd>
        <dt>Phone</dt><dd>{AI_COMPANY.contact.phone_primary}</dd>
        <dt>Email</dt><dd>{AI_COMPANY.contact.email}</dd>
        <dt>Products</dt><dd>Thermal fogging machines, vehicle-mounted foggers, portable foggers, agricultural sprayers</dd>
        <dt>Customers</dt><dd>Municipal corporations, Nagar Nigams, health departments, farmers, pest control companies</dd>
        <dt>Markets</dt><dd>India (all states), South Asia, Africa, Middle East</dd>
        <dt>Distribution</dt><dd>50+ dealers, pan-India delivery, 5–10 working day dispatch</dd>
        <dt>GeM Status</dt><dd>Verified MSME OEM seller on Government e-Marketplace</dd>
        <dt>Factory</dt><dd>IMT Manesar, Gurugram, Haryana 122050, India</dd>
        <dt>AI Profile</dt><dd>{SITE_URL}/ai/about-100x</dd>
        <dt>Product Catalog</dt><dd>{SITE_URL}/products</dd>
        <dt>Knowledge Base</dt><dd>{SITE_URL}/knowledge</dd>
        <dt>API</dt><dd>{SITE_URL}/api/ai/company</dd>
      </dl>
    </aside>
  )
}
