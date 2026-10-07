import type { Metadata } from "next"
import LegalPage from "@/components/LegalPage"
import { BUSINESS, SITE_NAME, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

// TODO: Legal review pending. The copy below was provided by the
// SEO/marketing agency and applied verbatim so navigation, indexing,
// and trust signals stop relying on the previous placeholder. Replace
// or amend with company-counsel-approved text when ready.

export const metadata: Metadata = {
  title: "Terms & Conditions | 100x Circle",
  description:
    "Terms and conditions for using the 100X Circle website and purchasing thermal fogging machines, agricultural equipment, and related products.",
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

const ADDRESS = `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      intro={[
        `Please read these Terms and Conditions carefully before using the website ${SITE_URL} (the "Platform") operated by 100X Circle Private Limited (referred to as the "Company", "We", "Us", or "Our"). By accessing or using this Platform, you agree to be bound by these terms. If you do not agree with any part of these terms, please do not continue to use the Platform.`,
      ]}
      sections={[
        {
          number: "1.",
          heading: "Use of the Platform",
          blocks: [
            {
              kind: "p",
              text:
                "The Platform is intended for lawful use by individuals and organisations seeking information about our products, placing enquiries, and making purchases. You agree to use the Platform only for its intended purposes and in accordance with applicable Indian laws and regulations.",
            },
            {
              kind: "p",
              text:
                "You must not use the Platform to distribute harmful content, attempt to gain unauthorised access to any part of our systems, or engage in any activity that disrupts or interferes with the operation of the website.",
            },
          ],
        },
        {
          number: "2.",
          heading: "Products and Pricing",
          blocks: [
            {
              kind: "p",
              text:
                "All products listed on our Platform are subject to availability. We reserve the right to limit quantities, withdraw products from sale, or modify product specifications without prior notice. Product images are provided for illustrative purposes only and the actual product may vary slightly in appearance.",
            },
            {
              kind: "p",
              text:
                "Prices displayed on the Platform are inclusive of applicable taxes unless otherwise stated. We reserve the right to revise prices at any time. The price applicable to your order is the price confirmed at the time your order is accepted by us.",
            },
          ],
        },
        {
          number: "3.",
          heading: "Orders and Payment",
          blocks: [
            {
              kind: "p",
              text:
                "Placing an order through our Platform or via WhatsApp constitutes an offer to purchase. An order is confirmed only when we send you a written acknowledgement. We reserve the right to decline any order at our discretion.",
            },
            {
              kind: "p",
              text:
                "Payment terms will be communicated at the time of order confirmation. For institutional and government procurement, payment may be processed through the Government e-Marketplace (GeM) or via bank transfer with appropriate documentation.",
            },
          ],
        },
        {
          number: "4.",
          heading: "Shipping and Delivery",
          blocks: [
            {
              kind: "p",
              text:
                "We deliver products across India. Delivery timelines vary based on your location and product availability. We aim to dispatch orders within the timeframe communicated at the time of order confirmation. We are not responsible for delays caused by logistics partners, natural events, or circumstances beyond our control.",
            },
            {
              kind: "p",
              text:
                "Risk of damage or loss of goods passes to you upon delivery. Please inspect your order at the time of delivery and report any visible damage to us within 48 hours of receipt.",
            },
          ],
        },
        {
          number: "5.",
          heading: "Returns and Warranty",
          blocks: [
            {
              kind: "p",
              text:
                "Our products are covered by a manufacturer's warranty as specified in the product documentation accompanying each machine. Warranty covers manufacturing defects under normal use conditions. It does not cover damage resulting from misuse, unauthorised modification, or failure to follow the operating guidelines.",
            },
            {
              kind: "p",
              text:
                "Returns are accepted only for products found to have manufacturing defects and reported within the warranty period. Please contact our support team with your order details and a description of the issue. We will assess the claim and advise on the appropriate resolution, which may include repair, replacement, or a credit note at our discretion.",
            },
          ],
        },
        {
          number: "6.",
          heading: "Intellectual Property",
          blocks: [
            {
              kind: "p",
              text:
                "All content on this Platform, including product descriptions, images, logos, and the brand name, is the property of 100X Circle Private Limited or its content suppliers. You may not copy, reproduce, distribute, or create derivative works from any content on this Platform without our prior written consent.",
            },
          ],
        },
        {
          number: "7.",
          heading: "Limitation of Liability",
          blocks: [
            {
              kind: "p",
              text:
                "To the extent permitted by applicable law, 100X Circle shall not be liable for any indirect, incidental, or consequential loss arising from your use of the Platform or from products purchased through it. Our total liability to you for any claim arising from a purchase shall not exceed the amount you paid for the relevant product.",
            },
          ],
        },
        {
          number: "8.",
          heading: "Third-Party Links",
          blocks: [
            {
              kind: "p",
              text:
                "Our Platform may contain links to external websites for your convenience. We do not control those websites and are not responsible for their content, privacy practices, or terms. Accessing third-party websites from our Platform is at your own risk.",
            },
          ],
        },
        {
          number: "9.",
          heading: "Governing Law and Jurisdiction",
          blocks: [
            {
              kind: "p",
              text:
                "These Terms and Conditions are governed by the laws of India. Any disputes arising from your use of the Platform or from purchases made through it shall be subject to the exclusive jurisdiction of the courts in Gurugram, Haryana.",
            },
          ],
        },
        {
          number: "10.",
          heading: "Amendments",
          blocks: [
            {
              kind: "p",
              text:
                "We reserve the right to update or modify these Terms and Conditions at any time. Changes take effect immediately upon being posted to the Platform. Continued use of the Platform after changes are posted constitutes your acceptance of the revised terms. We recommend reviewing this page periodically.",
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
