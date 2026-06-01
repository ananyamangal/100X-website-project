"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import ContactSection from "@/components/ContactSection"
import { BUSINESS } from "@/lib/seo/site-config"

type ProductOption = { _id?: string; id?: string; name: string }

const TEL_HREF = `tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`
const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100x Circle — I'd like a quote for fogging machines.",
)}`
const ADDRESS = `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`

export default function ContactUsPage() {
  const [products, setProducts] = useState<ProductOption[]>([])

  useEffect(() => {
    fetch("/api/admin/products")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setProducts(
          list.map((p: { _id?: string; id?: string; name?: string }) => ({
            _id: p._id,
            id: p.id,
            name: p.name || "Product",
          })),
        )
      })
      .catch(() => setProducts([]))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Cinematic hero */}
      <section className="bg-gray-950 pt-24 pb-14 md:pt-28 md:pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Contact</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-4">Get in Touch</p>
            <h1 className="text-4xl md:text-5xl font-800 text-white mb-5 leading-tight text-balance">
              Talk to our team.
            </h1>
            <p className="text-cinema-300 text-lg leading-relaxed">
              Whether you're a municipality, pest control operator, farmer, or dealer — our team responds within 24 hours with the information you need.
            </p>
          </div>
        </div>
      </section>

      <div className="bg-gray-50">
      <section
        aria-label="Direct contact channels"
        className="container mx-auto px-4 py-12 max-w-5xl"
      >
        <ul className="grid sm:grid-cols-3 gap-4 list-none">
          <li>
            <a
              href={TEL_HREF}
              data-gtm="contact_page_call"
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              <Phone size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700" />
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Phone
                </span>
                <span className="block mt-0.5 text-base font-semibold text-gray-900">
                  {BUSINESS.phonePrimary}
                </span>
              </span>
            </a>
          </li>
          <li>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              data-gtm="contact_page_whatsapp"
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              <MessageCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700" />
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  WhatsApp
                </span>
                <span className="block mt-0.5 text-base font-semibold text-gray-900">
                  Chat with our team
                </span>
              </span>
            </a>
          </li>
          <li>
            <a
              href={`mailto:${BUSINESS.email}`}
              data-gtm="contact_page_email"
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              <Mail size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700" />
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </span>
                <span className="block mt-0.5 text-base font-semibold text-gray-900 break-all">
                  {BUSINESS.email}
                </span>
              </span>
            </a>
          </li>
        </ul>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5">
          <MapPin size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Office &amp; manufacturing
            </p>
            <address className="mt-0.5 text-base font-semibold text-gray-900 not-italic">
              {ADDRESS}
            </address>
            <p className="mt-1 text-sm text-gray-600">
              Business hours: Monday to Saturday, 9:00 AM to 6:00 PM IST.
            </p>
          </div>
        </div>
      </section>

      {/* Near-me SEO blocks — visible content targeting local-intent queries. */}
      <section
        aria-labelledby="near-me-heading"
        className="container mx-auto px-4 mb-12 max-w-4xl"
      >
        <h2
          id="near-me-heading"
          className="text-2xl md:text-3xl font-bold text-gray-900 mb-3"
        >
          Fogging Machine Supplier with Pan-India Reach
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We know how frustrating it is to find a fogging-machine supplier near you who actually has the product in stock, knows the specifications, and can answer your questions without reading from a brochure. With over 50 distributor locations across India, there's a good chance we have someone close to you. Even when we're not just around the corner, our direct sales team handles enquiries by phone and WhatsApp with the same level of attention.
        </p>

        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6 mt-8">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
              Mosquito fogging machine — enquire about availability
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Tell us your location, application, and required scale. We'll confirm the right model, availability, and the fastest delivery route to your area. Stock is held at multiple distribution points including Bihar, Uttar Pradesh, Delhi NCR, Maharashtra, and Gujarat.
            </p>
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
              Thermal fogging machine dealer — connect with our network
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Want to inspect a machine before buying or prefer to deal locally? Ask us for the nearest authorised distributor. Our channel partners are trained on the full product range and carry spare parts.
            </p>
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
              Cold fogging machine — product guidance
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Not sure whether you need a thermal fogger or a cold fogger? Share your application details and we'll walk you through the right model and configuration. We also offer after-sales support by phone and WhatsApp for existing customers.
            </p>
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
              Vehicle-mounted fogging machine — fleet and institutional orders
            </h3>
            <p className="text-gray-700 leading-relaxed">
              For municipal corporations, Nagar Nigams, and district health departments looking for a supplier who can handle fleet orders with proper documentation, we issue formal quotations, provide technical datasheets, and complete all compliance documentation required for institutional purchases.
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-600">
          For government procurement, we are listed on the{" "}
          <span className="font-semibold">Government e-Marketplace (GeM)</span> under OEM listings — search for 100X Circle to raise a purchase order through the portal with full GST documentation. Need help locating our GeM listings?{" "}
          <Link href="/gem-approved-fogging-machine-oem" className="text-green-700 font-semibold hover:underline">
            See our GeM page →
          </Link>
        </p>
      </section>

      <ContactSection products={products} id="contact-form" />
      </div>
    </div>
  )
}
