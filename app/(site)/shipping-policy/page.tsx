import type { Metadata } from "next"
import PolicyPlaceholder from "@/components/PolicyPlaceholder"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Shipping Policy | 100x Circle",
  description: "Shipping and delivery information for 100X Circle orders.",
  alternates: { canonical: "/shipping-policy" },
  openGraph: {
    title: `Shipping Policy | ${SITE_NAME}`,
    url: `${SITE_URL}/shipping-policy`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Shipping | ${SITE_NAME}` },
}

export default function ShippingPolicyPage() {
  return (
    <PolicyPlaceholder
      title="Shipping Policy"
      intro="Shipping timelines, coverage areas, and freight terms will appear on this page. Use the content your logistics team prepares to replace this summary."
    />
  )
}
