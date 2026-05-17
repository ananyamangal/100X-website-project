import type { Metadata } from "next"
import PolicyPlaceholder from "@/components/PolicyPlaceholder"
import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Privacy Policy | 100x Circle",
  description: "Privacy policy for 100X Circle Pvt Ltd.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: `Privacy Policy | ${SITE_NAME}`,
    url: `${SITE_URL}/privacy-policy`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Privacy | ${SITE_NAME}` },
}

export default function PrivacyPolicyPage() {
  return (
    <PolicyPlaceholder
      title="Privacy Policy"
      intro="This Privacy Policy describes how 100X Circle Pvt Ltd collects, uses, and protects information when you use our website and services. Detailed sections will be added when your team provides the final legal text."
    />
  )
}
