import type { Metadata } from "next"
import LegalPage from "@/components/LegalPage"
import { BUSINESS, SITE_NAME, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Warranty Policy | 100x Circle",
  description:
    "Warranty terms for 100X Circle thermal fogging machines, agricultural equipment, and related products sold across India.",
  alternates: { canonical: "/warranty-policy" },
  openGraph: {
    title: `Warranty Policy | ${SITE_NAME}`,
    url: `${SITE_URL}/warranty-policy`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Warranty | ${SITE_NAME}` },
}

const ADDRESS = `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`

export default function WarrantyPolicyPage() {
  return (
    <LegalPage
      title="Warranty Policy"
      lastUpdated="Last updated: May 2026"
      intro={[
        `100X Circle Private Limited ("100X Circle", "We", "Us") provides this Warranty Policy for products purchased directly from us or through our authorised distribution network. This policy applies to all thermal fogging machines, agricultural sprayers, power tillers, and related equipment manufactured or supplied under the 100X Circle brand.`,
        "Please retain your purchase invoice as proof of purchase — it is required for all warranty claims.",
      ]}
      sections={[
        {
          number: "1.",
          heading: "Warranty Period",
          blocks: [
            {
              kind: "p",
              text: "All 100X Circle products are warranted against manufacturing defects in materials and workmanship for a period of 12 months from the date of original purchase, unless otherwise stated on the product or invoice. Extended warranty periods may be offered on specific models as communicated at the time of sale.",
            },
          ],
        },
        {
          number: "2.",
          heading: "What the Warranty Covers",
          blocks: [
            { kind: "p", text: "Subject to the exclusions below, this warranty covers:" },
            {
              kind: "ul",
              items: [
                "Defects in manufacturing workmanship identified under normal operating conditions",
                "Failure of components due to faulty materials supplied by 100X Circle",
                "Premature mechanical breakdown not caused by misuse, accident, or neglect",
              ],
            },
          ],
        },
        {
          number: "3.",
          heading: "What the Warranty Does NOT Cover",
          blocks: [
            { kind: "p", text: "This warranty does not cover:" },
            {
              kind: "ul",
              items: [
                "Damage caused by accident, misuse, abuse, negligence, or unauthorised modification",
                "Normal wear and tear, including consumable parts such as nozzles, seals, filters, and fuel lines",
                "Damage caused by operating the product outside of its rated capacity or intended use",
                "Damage resulting from the use of incompatible fuels, chemicals, or accessories",
                "Cosmetic damage such as scratches, dents, or corrosion not affecting functionality",
                "Products with removed or defaced serial numbers or model identifiers",
                "Damage arising from transportation or storage after the product leaves our premises",
                "Products repaired or tampered with by persons not authorised by 100X Circle",
              ],
            },
          ],
        },
        {
          number: "4.",
          heading: "How to Make a Warranty Claim",
          blocks: [
            { kind: "p", text: "To initiate a warranty claim:" },
            {
              kind: "ul",
              items: [
                "Contact our support team by phone or email within the warranty period",
                "Provide your proof of purchase (invoice number and date)",
                "Describe the defect clearly and, where possible, share photographs or a short video",
                "Our team will assess the claim and advise on repair, replacement, or service centre visit",
              ],
            },
            {
              kind: "p",
              text: "We reserve the right to inspect the product before authorising a warranty claim. Products sent to us for warranty evaluation must be adequately packed to prevent transit damage.",
            },
          ],
        },
        {
          number: "5.",
          heading: "Warranty Remedies",
          blocks: [
            {
              kind: "p",
              text: "At our discretion, we will repair or replace the defective product or component at no charge to the customer. If the same model is unavailable, we may substitute an equivalent or superior model. The repaired or replaced product will be warranted for the remainder of the original warranty period or 90 days from the date of repair/replacement, whichever is longer.",
            },
          ],
        },
        {
          number: "6.",
          heading: "Government & GeM Procurement",
          blocks: [
            {
              kind: "p",
              text: "For equipment supplied to government bodies, municipalities, or purchased through the Government e-Marketplace (GeM), warranty terms as specified in the purchase order or tender documentation shall apply and may supersede the standard warranty above.",
            },
          ],
        },
        {
          number: "7.",
          heading: "Limitation of Liability",
          blocks: [
            {
              kind: "p",
              text: "To the maximum extent permitted by applicable law, 100X Circle's liability under this warranty is limited to the repair or replacement of the defective product. We shall not be liable for any incidental, consequential, or indirect damages, including but not limited to loss of revenue, crop damage, or loss of use.",
            },
          ],
        },
      ]}
      contact={{
        entity: "100X Circle Private Limited — Warranty Support",
        lines: [
          ADDRESS,
          `Email: ${BUSINESS.email}`,
          `Phone: ${BUSINESS.phonePrimary}`,
        ],
      }}
    />
  )
}
