import type { Metadata } from "next"
import LegalPage from "@/components/LegalPage"
import { BUSINESS, SITE_NAME, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

// TODO: Legal review pending. The copy below was provided by the
// SEO/marketing agency and applied verbatim so navigation, indexing,
// and trust signals stop relying on the previous placeholder. Replace
// or amend with company-counsel-approved text when ready.

export const metadata: Metadata = {
  title: "Privacy Policy | 100x Circle",
  description:
    "Privacy policy for 100X Circle Pvt Ltd — how we collect, use, and protect your personal information when you visit our website.",
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

const ADDRESS = `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={[
        `This Privacy Policy describes how 100X Circle Private Limited, registered under the Companies Act, 2013, with its office at ${ADDRESS} (referred to as the "Company", "We", "Us", or "Our"), collects, uses, and protects the personal information of individuals who visit and use our website ${SITE_URL} (the "Platform").`,
        "By using our Platform, you agree to the collection and use of information in accordance with this policy. We encourage you to read this document carefully and contact us if you have any questions.",
      ]}
      sections={[
        {
          number: "1.",
          heading: "Information We Collect",
          blocks: [
            {
              kind: "p",
              text:
                "When you use our Platform, we may collect personal information that you provide voluntarily. This includes your name, mobile number, email address, delivery address, and any other details you submit through our contact forms, enquiry forms, or order process.",
            },
            {
              kind: "p",
              text:
                "We also collect certain technical information automatically when you browse our website. This may include your IP address, browser type, pages visited, time spent on those pages, and the referring URL. This information helps us understand how our Platform is being used so we can improve it.",
            },
          ],
        },
        {
          number: "2.",
          heading: "How We Use Your Information",
          blocks: [
            {
              kind: "p",
              text: "We use the information we collect for the following purposes:",
            },
            {
              kind: "ul",
              items: [
                "To respond to product enquiries and send quotations",
                "To process and fulfil orders placed through our Platform",
                "To send order confirmations, delivery updates, and warranty documentation",
                "To provide after-sales support and technical assistance",
                "To improve our website and understand customer needs",
                "To contact you about promotions or new product launches, where you have consented to such communication",
              ],
            },
            {
              kind: "p",
              text:
                "We do not use your information for purposes beyond what is stated above without obtaining separate consent from you.",
            },
          ],
        },
        {
          number: "3.",
          heading: "Sharing of Information",
          blocks: [
            {
              kind: "p",
              text:
                "100X Circle does not sell, rent, or trade your personal information to third parties for their own marketing purposes. We do not share your data with any external parties except in the following circumstances:",
            },
            {
              kind: "ul",
              items: [
                "With logistics and shipping partners who need your delivery address to fulfil your order",
                "With payment gateway providers for processing transactions, where applicable",
                "With government or legal authorities when required by law or legal process",
                "With our authorised distributors, only when you have specifically requested a referral to a local dealer",
              ],
            },
            {
              kind: "p",
              text:
                "All third-party service providers we work with are required to handle your data securely and only for the purpose for which it was shared.",
            },
          ],
        },
        {
          number: "4.",
          heading: "Data Security",
          blocks: [
            {
              kind: "p",
              text:
                "We take reasonable technical and organisational measures to protect your personal information from unauthorised access, loss, or misuse. Our website uses secure connections for data transmission and we restrict access to personal information to those members of our team who genuinely need it to serve you.",
            },
            {
              kind: "p",
              text:
                "No method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security. If you suspect any unauthorised use of your information or any security concern related to your interaction with our Platform, please contact us immediately.",
            },
          ],
        },
        {
          number: "5.",
          heading: "Cookies",
          blocks: [
            {
              kind: "p",
              text:
                "Our website uses cookies to improve your browsing experience. Cookies are small files stored on your device that help us remember your preferences and understand how you navigate our site. You can choose to disable cookies through your browser settings. Please note that disabling cookies may affect certain features of our Platform.",
            },
          ],
        },
        {
          number: "6.",
          heading: "Your Rights",
          blocks: [
            { kind: "p", text: "You have the right to:" },
            {
              kind: "ul",
              items: [
                "Request access to the personal information we hold about you",
                "Request correction of inaccurate or incomplete information",
                "Request deletion of your personal data, subject to applicable legal requirements",
                "Withdraw consent for marketing communications at any time",
              ],
            },
            {
              kind: "p",
              text:
                "To exercise any of these rights, please write to us at the contact address provided on this page. We will respond to your request within a reasonable timeframe.",
            },
          ],
        },
        {
          number: "7.",
          heading: "Retention of Data",
          blocks: [
            {
              kind: "p",
              text:
                "We retain your personal information for as long as is necessary to fulfil the purpose for which it was collected, including any legal, accounting, or reporting obligations. Once data is no longer required, we take appropriate steps to delete or anonymise it.",
            },
          ],
        },
        {
          number: "8.",
          heading: "Children's Privacy",
          blocks: [
            {
              kind: "p",
              text:
                "Our Platform is not directed at individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has submitted information through our Platform, please contact us and we will take steps to remove that data promptly.",
            },
          ],
        },
        {
          number: "9.",
          heading: "Changes to This Policy",
          blocks: [
            {
              kind: "p",
              text:
                "We may update this Privacy Policy from time to time. When we make significant changes, we will update the date at the top of this document. We encourage you to review this policy periodically to stay informed about how we handle your information.",
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
