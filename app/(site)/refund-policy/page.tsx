import type { Metadata } from "next"
import LegalPage from "@/components/LegalPage"
import { BUSINESS, SITE_NAME, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Refund Policy | 100x Circle",
  description:
    "Refund and cancellation policy for 100X Circle products — thermal fogging machines and agricultural equipment sold across India.",
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: `Refund Policy | ${SITE_NAME}`,
    url: `${SITE_URL}/refund-policy`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Refund Policy | ${SITE_NAME}` },
}

const ADDRESS = `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated="Last updated: May 2026"
      intro={[
        "100X Circle Private Limited is committed to fair and transparent commercial practices. This Refund Policy explains the conditions under which refunds or credits may be issued for products and services supplied by us.",
        "Because our products are industrial and agricultural equipment sold primarily to businesses, government bodies, and professional users, our refund policy reflects the B2B nature of these transactions.",
      ]}
      sections={[
        {
          number: "1.",
          heading: "Order Cancellation",
          blocks: [
            {
              kind: "p",
              text: "Orders may be cancelled before dispatch without any penalty. Once a product has been dispatched, cancellation is subject to the return process described below. Custom-built or government-tender orders cannot be cancelled after production has commenced.",
            },
          ],
        },
        {
          number: "2.",
          heading: "Eligibility for Refund",
          blocks: [
            { kind: "p", text: "A refund or replacement may be requested if:" },
            {
              kind: "ul",
              items: [
                "The product received is materially different from what was ordered",
                "The product is dead on arrival (DOA) — non-functional when first switched on, reported within 48 hours of delivery",
                "The product sustains damage in transit that renders it unusable, supported by delivery documentation and photographs",
                "A manufacturing defect is identified within the warranty period (see Warranty Policy)",
              ],
            },
            {
              kind: "p",
              text: "Refund requests must be raised within 7 days of delivery by contacting our support team. Requests raised after this period will be handled under the Warranty Policy.",
            },
          ],
        },
        {
          number: "3.",
          heading: "Non-Refundable Situations",
          blocks: [
            { kind: "p", text: "Refunds will not be issued in the following situations:" },
            {
              kind: "ul",
              items: [
                "Change of mind after purchase or delivery",
                "Damage caused by misuse, improper storage, or unauthorised modification",
                "Products that have been used and show signs of wear beyond initial inspection",
                "Custom-configured or specially ordered equipment built to buyer specifications",
                "Consumable items such as nozzles, filters, and gaskets",
                "Digital or downloadable resources",
              ],
            },
          ],
        },
        {
          number: "4.",
          heading: "Refund Process",
          blocks: [
            { kind: "p", text: "Once a refund is approved:" },
            {
              kind: "ul",
              items: [
                "We will arrange collection of the product at our cost (for eligible claims only)",
                "Upon receipt and inspection, we will process the refund within 10 business days",
                "Refunds are issued via the original payment method or bank transfer as agreed",
                "For orders paid via demand draft, cheque, or NEFT/RTGS, the refund will be via bank transfer to the account details you provide",
              ],
            },
          ],
        },
        {
          number: "5.",
          heading: "Government & GeM Orders",
          blocks: [
            {
              kind: "p",
              text: "Refunds and cancellations for orders placed through the Government e-Marketplace (GeM) or direct government procurement are governed by the respective purchase order terms, GeM policies, and applicable government financial rules. We will comply with all such requirements.",
            },
          ],
        },
        {
          number: "6.",
          heading: "Amendments",
          blocks: [
            {
              kind: "p",
              text: "We reserve the right to amend this Refund Policy at any time. Changes will be published on this page with an updated date. Please review periodically.",
            },
          ],
        },
      ]}
      contact={{
        entity: "100X Circle Private Limited — Support",
        lines: [
          ADDRESS,
          `Email: ${BUSINESS.email}`,
          `Phone: ${BUSINESS.phonePrimary}`,
        ],
      }}
    />
  )
}
