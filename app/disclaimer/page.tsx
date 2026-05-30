import type { Metadata } from "next"
import LegalPage from "@/components/LegalPage"
import { BUSINESS, SITE_NAME, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Disclaimer | 100x Circle",
  description:
    "Disclaimer for 100X Circle website — limitation of liability, accuracy of information, and third-party content.",
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: `Disclaimer | ${SITE_NAME}`,
    url: `${SITE_URL}/disclaimer`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Disclaimer | ${SITE_NAME}` },
}

const ADDRESS = `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      lastUpdated="Last updated: May 2026"
      intro={[
        `The information provided on this website (${SITE_URL}) is for general informational and commercial purposes only. By using our website, you accept this Disclaimer in full. If you disagree with any part of this Disclaimer, please do not use our website.`,
      ]}
      sections={[
        {
          number: "1.",
          heading: "Accuracy of Information",
          blocks: [
            {
              kind: "p",
              text: "100X Circle Private Limited makes every effort to ensure that product specifications, prices, availability, and other information on this website are accurate and up to date. However, we do not warrant or represent that all information is free from errors or omissions. Specifications, pricing, and product availability are subject to change without notice.",
            },
            {
              kind: "p",
              text: "The images, technical diagrams, and illustrations on this website are for representative purposes only. Actual products may vary in appearance, specifications, or accessories from those shown.",
            },
          ],
        },
        {
          number: "2.",
          heading: "No Professional Advice",
          blocks: [
            {
              kind: "p",
              text: "Nothing on this website constitutes technical, legal, financial, agricultural, or professional advice. Users should seek independent expert advice before making purchasing decisions, particularly for large-scale government, municipal, or agricultural deployments. 100X Circle accepts no liability for decisions made based on information from this website.",
            },
          ],
        },
        {
          number: "3.",
          heading: "Limitation of Liability",
          blocks: [
            {
              kind: "p",
              text: "To the maximum extent permitted by applicable law, 100X Circle Private Limited, its directors, employees, and agents shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of, or inability to use, this website or the information contained herein.",
            },
            {
              kind: "p",
              text: "This includes, without limitation, loss of revenue, loss of data, business interruption, or any other commercial losses, even if we have been advised of the possibility of such damages.",
            },
          ],
        },
        {
          number: "4.",
          heading: "Third-Party Links and Content",
          blocks: [
            {
              kind: "p",
              text: "This website may contain links to third-party websites, videos, or resources (including YouTube, government portals, and industry associations). These links are provided for your convenience only. We do not endorse, control, or accept responsibility for the content, privacy practices, or availability of third-party sites. Accessing them is entirely at your own risk.",
            },
          ],
        },
        {
          number: "5.",
          heading: "Product Application Disclaimer",
          blocks: [
            {
              kind: "p",
              text: "Our thermal fogging machines, agricultural sprayers, and related equipment are designed for specific applications as described in the product documentation. Users are responsible for operating equipment in accordance with applicable laws, safety regulations, and the operator manual. Misuse of fogging equipment, chemicals, or pesticides may be subject to regulatory penalties. 100X Circle is not liable for any misuse or application of its products.",
            },
          ],
        },
        {
          number: "6.",
          heading: "Government Procurement",
          blocks: [
            {
              kind: "p",
              text: "Information about GeM (Government e-Marketplace) listings, government approvals, and tender participation on this website is subject to change and may not reflect current portal status. Buyers should verify GeM catalogue listings and government approval status directly on the relevant official portals.",
            },
          ],
        },
        {
          number: "7.",
          heading: "Changes to This Disclaimer",
          blocks: [
            {
              kind: "p",
              text: "We reserve the right to update this Disclaimer at any time. Updated versions will be published on this page with a revised date. Your continued use of the website after changes constitutes your acceptance of the updated Disclaimer.",
            },
          ],
        },
      ]}
      contact={{
        entity: "100X Circle Private Limited",
        lines: [
          ADDRESS,
          `Email: ${BUSINESS.email}`,
          `Phone: ${BUSINESS.phonePrimary}`,
        ],
      }}
    />
  )
}
