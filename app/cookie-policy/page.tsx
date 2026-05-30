import type { Metadata } from "next"
import LegalPage from "@/components/LegalPage"
import { BUSINESS, SITE_NAME, SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Cookie Policy | 100x Circle",
  description:
    "Cookie policy for 100X Circle — what cookies we use, why, and how to manage your preferences.",
  alternates: { canonical: "/cookie-policy" },
  openGraph: {
    title: `Cookie Policy | ${SITE_NAME}`,
    url: `${SITE_URL}/cookie-policy`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: { card: "summary", title: `Cookie Policy | ${SITE_NAME}` },
}

const ADDRESS = `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="Last updated: May 2026"
      intro={[
        `This Cookie Policy explains how 100X Circle Private Limited ("100X Circle", "We", "Us") uses cookies and similar tracking technologies on our website at ${SITE_URL}. By continuing to use our website, you consent to the use of cookies as described in this policy.`,
      ]}
      sections={[
        {
          number: "1.",
          heading: "What Are Cookies?",
          blocks: [
            {
              kind: "p",
              text: "Cookies are small text files stored on your device (computer, tablet, or mobile phone) when you visit a website. They allow the website to recognise your device on subsequent visits and remember certain preferences or actions.",
            },
          ],
        },
        {
          number: "2.",
          heading: "Types of Cookies We Use",
          blocks: [
            {
              kind: "ul",
              items: [
                "Strictly Necessary Cookies — required for the website to function correctly, such as session management for the admin portal. These cannot be disabled.",
                "Analytics Cookies — help us understand how visitors interact with our website (e.g. pages visited, session duration). We use Google Analytics / Google Tag Manager for this purpose.",
                "Marketing & Advertising Cookies — used to measure the effectiveness of our marketing campaigns (e.g. Google Ads conversion tracking). These are only set if you interact with our ads.",
                "Functional Cookies — remember preferences such as whether you have already submitted a quotation request, to avoid showing you the same prompt repeatedly.",
              ],
            },
          ],
        },
        {
          number: "3.",
          heading: "Third-Party Cookies",
          blocks: [
            {
              kind: "p",
              text: "Some cookies on our website are set by third-party services that appear on our pages. These include:",
            },
            {
              kind: "ul",
              items: [
                "Google Analytics — measures traffic and engagement",
                "Google Tag Manager — manages analytics and marketing tags",
                "YouTube — when product demonstration videos are embedded, YouTube may set its own cookies",
                "Cloudinary — used for optimised image delivery; may use performance cookies",
              ],
            },
            {
              kind: "p",
              text: "We do not control the cookies set by these third parties. Please refer to their respective privacy and cookie policies for details.",
            },
          ],
        },
        {
          number: "4.",
          heading: "Local Storage and Session Storage",
          blocks: [
            {
              kind: "p",
              text: "In addition to cookies, we use browser localStorage and sessionStorage to store lightweight preferences — for example, to remember that you have already submitted a quotation request so that we do not display the same pop-up repeatedly during your visit. This data is stored entirely on your device and is not transmitted to our servers.",
            },
          ],
        },
        {
          number: "5.",
          heading: "How to Manage Cookies",
          blocks: [
            {
              kind: "p",
              text: "You can control and manage cookies through your browser settings. Most browsers allow you to view, delete, or block cookies. Please note that disabling certain cookies may affect the functionality of our website.",
            },
            {
              kind: "ul",
              items: [
                "Google Chrome: Settings → Privacy and security → Cookies and other site data",
                "Mozilla Firefox: Options → Privacy & Security → Cookies and Site Data",
                "Safari: Preferences → Privacy → Manage Website Data",
                "Microsoft Edge: Settings → Cookies and site permissions",
              ],
            },
            {
              kind: "p",
              text: "To opt out of Google Analytics tracking specifically, you may install the Google Analytics Opt-out Browser Add-on available at tools.google.com/dlpage/gaoptout.",
            },
          ],
        },
        {
          number: "6.",
          heading: "Updates to This Policy",
          blocks: [
            {
              kind: "p",
              text: "We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our practices. We encourage you to review this page periodically.",
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
