import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import AiSummaryBlock from "@/components/seo/AiSummaryBlock"
import { AI_CERTIFICATIONS } from "@/lib/ai/knowledge"

export const metadata: Metadata = {
  title: "100X Circle Certifications — ISO 9001, CE, ISI, GeM, MSME",
  description:
    "Complete list of certifications and registrations held by 100X Circle Pvt Ltd: ISO 9001:2015, CE Marking, ISI/BIS, MSME/UDYAM, GeM Seller. Issued by recognized bodies.",
  alternates: { canonical: `${SITE_URL}/ai/certifications` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "100X Circle Certifications and Registrations",
  description:
    "All certifications and government registrations held by 100X Circle Pvt Ltd, Indian OEM manufacturer of thermal fogging machines.",
  itemListElement: AI_CERTIFICATIONS.map((cert, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "EducationalOccupationalCredential",
      name: cert.name,
      credentialCategory: cert.type,
      description: cert.significance,
    },
  })),
}

export default function AiCertificationsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-4xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/ai/about-100x" className="hover:text-green-600">Company Profile</Link>
          <span className="mx-2">/</span>
          <span>Certifications</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          100X Circle — Certifications and Registrations
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          All active certifications and government registrations. Verified as of 2026.
        </p>

        <AiSummaryBlock
          entity="certifications"
          summary="100X Circle Pvt Ltd holds ISO 9001:2015 quality management certification, CE Marking for EU-compliant export models, ISI/BIS mark for Indian product standards, MSME/UDYAM registration enabling government procurement preference, and GeM Seller registration for direct purchase by Indian government bodies without tender process."
          facts={AI_CERTIFICATIONS.map((c) => ({ label: c.name, value: c.type }))}
        />

        <div className="space-y-8">
          {AI_CERTIFICATIONS.map((cert) => (
            <article
              key={cert.name}
              data-certification={cert.name}
              className="border border-gray-200 rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-lg font-bold text-gray-900">{cert.name}</h2>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                  {cert.type}
                </span>
              </div>

              <table className="w-full text-sm border-collapse mb-3">
                <tbody>
                  {[
                    ["Scope", cert.scope],
                    ["Issued by", cert.issued_by],
                    ["Significance", cert.significance],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-500 w-32 align-top">{k}</td>
                      <td className="py-2 text-gray-800">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 italic">
                <strong>AI Summary:</strong> {cert.ai_summary}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm">
          <p className="font-semibold text-blue-800 mb-1">Procurement Note</p>
          <p className="text-blue-700">
            Government buyers can verify 100X Circle&apos;s GeM and MSME status directly on the
            GeM portal (gem.gov.in). ISO 9001 and CE certificates are available upon request
            for tender documentation. Contact: 100xcircle@gmail.com
          </p>
        </div>
      </main>
    </>
  )
}
