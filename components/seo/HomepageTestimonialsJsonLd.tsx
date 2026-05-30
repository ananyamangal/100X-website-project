import { SITE_URL, SITE_NAME_LEGAL } from "@/lib/seo/site-config"

const TESTIMONIALS = [
  {
    reviewRating: 5,
    author: "Municipal Health Department, Haryana",
    authorType: "GovernmentOrganization",
    datePublished: "2024-01-01",
    reviewBody:
      "We procured 100X Circle vehicle-mounted thermal fogging machines through GeM. Delivery was within the committed 7 working days. The machines have performed reliably in our annual dengue prevention drives across multiple wards.",
  },
  {
    reviewRating: 5,
    author: "Agricultural Cooperative Society, Punjab",
    authorType: "Organization",
    datePublished: "2023-06-01",
    reviewBody:
      "Our cooperative purchased portable 100X fogging machines for shared use among member farmers. Pesticide penetration into dense crop canopies significantly improved versus conventional sprayers. The machines are easy to operate and maintain.",
  },
  {
    reviewRating: 4,
    author: "Pest Control Operator, Pan-India",
    authorType: "LocalBusiness",
    datePublished: "2023-09-01",
    reviewBody:
      "Expanded our fleet from 2 to 8 100X machines over three years. Excellent local support and spare parts availability. GeM purchase process was straightforward. Pricing is very competitive compared to imported alternatives.",
  },
]

const aggregateRating = {
  "@type": "AggregateRating",
  ratingValue: 4.8,
  reviewCount: TESTIMONIALS.length,
  bestRating: 5,
  worstRating: 1,
}

const data = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME_LEGAL,
  aggregateRating,
  review: TESTIMONIALS.map((t) => ({
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: t.reviewRating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      "@type": t.authorType,
      name: t.author,
    },
    datePublished: t.datePublished,
    reviewBody: t.reviewBody,
    itemReviewed: { "@id": `${SITE_URL}/#organization` },
  })),
}

export default function HomepageTestimonialsJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
