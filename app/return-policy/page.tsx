import type { Metadata } from "next"
import PolicyPlaceholder from "@/components/PolicyPlaceholder"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Return Policy | 100x Circle",
  description: "Return and refund policy for 100X Circle products.",
  alternates: { canonical: `${SITE_URL}/return-policy` },
  openGraph: {
    title: `Return Policy | ${SITE_NAME}`,
    url: `${SITE_URL}/return-policy`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Returns | ${SITE_NAME}` },
}

export default function ReturnPolicyPage() {
  return (
    <PolicyPlaceholder
      title="Return Policy"
      intro="Our return and refund rules will be listed here. This placeholder keeps the page available for footer links and search engines until your operations team supplies the final policy."
    />
  )
}
