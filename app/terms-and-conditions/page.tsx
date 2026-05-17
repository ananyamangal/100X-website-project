import type { Metadata } from "next"
import PolicyPlaceholder from "@/components/PolicyPlaceholder"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Terms & Conditions | 100x Circle",
  description: "Terms and conditions for using the 100X Circle website and purchasing our products.",
  alternates: { canonical: "/terms-and-conditions" },
  openGraph: {
    title: `Terms & Conditions | ${SITE_NAME}`,
    url: `${SITE_URL}/terms-and-conditions`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Terms | ${SITE_NAME}` },
}

export default function TermsPage() {
  return (
    <PolicyPlaceholder
      title="Terms & Conditions"
      intro="These Terms & Conditions govern your use of the 100X Circle website and the purchase and use of our products. Complete terms will be published here once provided by your team."
    />
  )
}
