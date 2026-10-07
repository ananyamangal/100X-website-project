import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, SITE_NAME, defaultOgImage } from '@/lib/seo/site-config'
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd'
import RFQForm from '@/components/forms/RFQForm'
import FaqBlock from '@/components/landing/FaqBlock'
import type { FaqEntry } from '@/lib/seo/landing-types'

// Agency on-page SEO copy (Sept 2026). Single source for the visible accordion
// AND the FAQPage JSON-LD (FaqBlock renders both from this array).
const VEHICLE_FAQS: FaqEntry[] = [
  { q: "What is a vehicle mounted fogging machine used for?", a: "It's a fogging unit mounted on a vehicle for large-area mosquito control, covering more ground per hour than handheld foggers." },
  { q: "What is the vehicle mounted fogging machine price?", a: "Price depends on tank size, engine type, and certification. Contact us for a direct factory quote." },
  { q: "What's the difference between thermal and cold fogging machines?", a: "Thermal foggers heat the chemical to create a dense, visible fog that's better for outdoor mosquito control. Cold foggers use a pump to create finer droplets, often used indoors or for larger particle-size needs. We manufacture both." },
  { q: "How much area can one machine cover?", a: "It depends on the model and fog output, but a vehicle mounted machine typically covers much larger areas per hour than backpack or handheld sprayers — ideal for city streets and large campuses." },
  { q: "What chemicals can be used in the machine?", a: "Most standard mosquito-control chemicals (like pyrethroid-based solutions) work fine. We can guide you on the right chemical-to-water ratio for your machine." },
  { q: "Is the machine safe to operate?", a: "Yes, when used as per guidelines. We provide basic operating instructions, and the machine is built for safe, continuous field use by trained operators." },
  { q: "Do you provide spare parts and after-sales support?", a: "Yes, we stock spare parts and offer service support pan-India, since we manufacture the machines ourselves." },
  { q: "How long does delivery take?", a: "Delivery time depends on your location and order quantity — share your details and we'll confirm a timeline with your quote." },
  { q: "Do you offer a warranty?", a: "Yes, our machines come with a standard warranty. Ask us for exact terms when you request a quote." },
  { q: "Is it GeM approved?", a: "Yes, 100x Circle is a GeM registered OEM." },
  { q: "Which vehicles can it mount on?", a: "Standard pickups, tempo travellers, and municipal tankers." },
  { q: "Do you supply outside Delhi?", a: "Yes — pan-India, with dedicated support for UP and Bihar." },
]

const KEY_FEATURES = [
  "High fog output for large treatment areas",
  "Mountable on pickups, tempos, and municipal tankers",
  "Corrosion-resistant tank",
  "Adjustable fog output",
  "Low maintenance",
  "IS 14855 compliant options for government tenders",
]

const WHY_US = [
  "Made in India, by us — not resold",
  "GeM registered, so government orders are hassle-free",
  "ISO certified for quality you can trust",
  "We deliver and support pan-India, not just in one city",
]

const SERVICE_AREAS = [
  "Delhi & Gurugram (NCR)",
  "Uttar Pradesh",
  "Bihar",
  "Mumbai & Pune",
  "Pan-India via dealer and tender network",
]

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Vehicle Mounted Fogging Machine | 100x Circle',
  description:
    'Looking for a vehicle mounted fogging machine? 100x Circle makes reliable fogging machines for mosquito control, at a fair price. Delhi, UP, Bihar & pan-India delivery.',
  alternates: { canonical: "/vehicle-mounted-fogging-machine" },
  openGraph: {
    title: `Vehicle Mounted Fogger Delhi | ${SITE_NAME}`,
    url: `${SITE_URL}/vehicle-mounted-fogging-machine`,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Vehicle Fogging Machine | ${SITE_NAME}`,
    description: 'Large-area mosquito control fogging systems.',
  },
}

export default function VehicleMountedFoggingMachinePage() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-16">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Products', url: '/products' },
          { name: 'Vehicle Mounted Fogging Machine in Delhi', url: '/vehicle-mounted-fogging-machine' },
        ]}
      />
      <section className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Vehicle Mounted Fogging Machine in Delhi
        </h1>
        {/* Agency on-page SEO copy (Sept 2026) — added above the existing intro, which is kept */}
        <p className="text-lg text-gray-700 mb-6">
          Our vehicle mounted fogging machine helps you cover large areas fast, whether it&apos;s a
          city street, a housing society, or an industrial campus.
        </p>
        <p className="text-lg text-gray-700 mb-6">
          Just fit it on a pickup, tempo, or municipal vehicle, and one person can fog a huge area in
          a fraction of the time it&apos;d take on foot. That&apos;s why municipalities, pest control
          teams, and housing societies across Delhi, UP, Bihar, and the rest of India trust our
          vehicle fogging machine.
        </p>
        <p className="text-lg text-gray-700 mb-6">
          Our vehicle mounted fogging machines are engineered for large-scale mosquito and vector
          control. Built with robust components and high fog output, they are ideal for city-wide
          drives, industrial townships, and housing societies.
        </p>
        <p className="text-lg text-gray-700 mb-8">
          Connect with 100x Circle to discuss technical specifications, suitable models, and
          on-ground deployment support for your fogging operations.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            View All Products
          </Link>
          <a
            href="https://wa.me/917827229116?text=I%27m%20interested%20in%20the%20100x%20Circle%20vehicle%20mounted%20fogging%20machine.%20Please%20share%20details."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-brand-600 bg-white px-6 py-3 text-base font-semibold text-brand-700 transition-all hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Chat on WhatsApp
          </a>
        </div>
      </section>

      <section className="container mx-auto px-4 max-w-3xl mt-16" id="rfq">
        <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white shadow-xl p-6 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Request a Quote for Vehicle Mounted Fogger
            </h2>
            <p className="text-sm md:text-base text-gray-600">
              Tender, GeM, dealer &amp; bulk inquiries — we&apos;ll respond within 48 hours.
            </p>
          </div>
          <RFQForm
            variant="card"
            defaultProduct="Vehicle Mounted Fogger"
            defaultDescription="Inquiring about: Vehicle Mounted Fogging Machine"
            location="landing_vehicle_mounted_fogging"
          />
        </div>
      </section>

      {/* Agency on-page SEO copy (Sept 2026) */}
      <section className="container mx-auto px-4 max-w-5xl mt-16 space-y-12">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Key Features &amp; Applications</h2>
          <ul className="list-disc pl-6 space-y-1.5 text-lg text-gray-700">
            {KEY_FEATURES.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Simple to use. Built to last. Priced fairly.</h2>
          <p className="text-lg text-gray-700 mb-4">
            Not sure which model fits your need, or want to know the vehicle mounted{' '}
            <Link href="/" className="text-brand-700 underline underline-offset-2 hover:text-brand-600">fogging machine price</Link>?
            Just tell us your requirement — we&apos;ll help you pick the right one and send you a quote
            within 48 hours. No pressure, no middlemen — we manufacture these ourselves, so you get a
            straight price.
          </p>
          <p className="text-lg text-gray-700">
            <strong>Available in:</strong> Delhi, Gurugram, Uttar Pradesh, Bihar, Mumbai, Pune, and pan-India.
          </p>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Why 100x Circle for Your Vehicle Mounted Fogging Machine?</h2>
          <p className="text-lg text-gray-700 mb-4">
            We&apos;re not just another supplier — we manufacture our fogging machines ourselves, so
            you deal directly with the source. That means better quality control, honest pricing, and
            real support if you ever need spares or service.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-lg text-gray-700">
            {WHY_US.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Service Areas</h2>
          <p className="text-lg text-gray-700 mb-4">We supply and support vehicle mounted fogging machines in:</p>
          <ul className="list-disc pl-6 space-y-1.5 text-lg text-gray-700">
            {SERVICE_AREAS.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </section>

      <FaqBlock eyebrow="" title="FAQs" faqs={VEHICLE_FAQS} />
    </main>
  )
}


