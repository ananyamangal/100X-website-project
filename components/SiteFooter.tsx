import Link from "next/link"
import { Mail, MapPin, Phone, Youtube } from "lucide-react"
import { getAllLandingPages, getLandingDisplayName } from "@/lib/seo/landing-pages"

const YOUTUBE_CHANNEL = "https://www.youtube.com/@100Xcircle"

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-white py-16 mt-24">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center space-x-3 mb-6">
              <img src="/logo-main.png" alt="100X Circle home" className="w-24 h-auto" />
              <div>
                <h3 className="text-xl font-bold">100X</h3>
                <p className="text-green-400 text-sm">Certified professional products</p>
              </div>
            </Link>
            <p className="text-gray-400 mb-6">Leading manufacturer of premium products across India.</p>
            <div className="flex space-x-4">
              <a
                href={YOUTUBE_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="100X Circle on YouTube"
              >
                <Youtube size={20} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-lg">Popular Products</h4>
            <ul className="space-y-3 text-gray-400">
              {getAllLandingPages().map((def) => (
                <li key={def.slug}>
                  <Link
                    href={`/${def.slug}`}
                    className="hover:text-green-400 transition-colors line-clamp-2"
                  >
                    {getLandingDisplayName(def.slug) ?? def.slug}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/products"
                  className="hover:text-green-400 transition-colors font-semibold text-green-400"
                >
                  View all products →
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/" className="hover:text-green-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-green-400 transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-green-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="hover:text-green-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-green-400 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <a href="/sitemap.xml" className="hover:text-green-400 transition-colors">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-lg">Contact</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-2">
                <Mail className="mt-1 shrink-0" size={16} aria-hidden="true" />
                <a
                  href="mailto:100xcircle@gmail.com"
                  className="hover:text-green-400 transition-colors break-all"
                >
                  100xcircle@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-1 shrink-0" size={16} aria-hidden="true" />
                <a href="tel:+917827229116" className="hover:text-green-400 transition-colors">
                  +91 7827229116
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-1 shrink-0" size={16} aria-hidden="true" />
                <address className="not-italic">
                  UG, 398, Sector 7, IMT Manesar, Gurugram
                </address>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-gray-500 text-sm border-t border-gray-800 pt-8">
          <div className="flex justify-center items-center space-x-4 flex-wrap gap-2 mb-4">
            <span>&copy; 2026 100X Circle Pvt Ltd. All rights reserved.</span>
            <a href="/sitemap.xml" className="text-xs text-gray-400 hover:text-green-400 underline transition-colors">
              Sitemap
            </a>
            <Link href="/privacy-policy" className="text-xs text-gray-400 hover:text-green-400 underline transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="text-xs text-gray-400 hover:text-green-400 underline transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/return-policy" className="text-xs text-gray-400 hover:text-green-400 underline transition-colors">
              Return Policy
            </Link>
            <Link href="/shipping-policy" className="text-xs text-gray-400 hover:text-green-400 underline transition-colors">
              Shipping Policy
            </Link>
            <a href="/admin" className="text-xs text-gray-400 hover:text-green-400 underline transition-colors">
              Admin
            </a>
          </div>
          <p className="text-gray-600 text-[10px] leading-relaxed">
            fogging machine, fogging machine price, fogger, fogger machine price, thermal fogging machine, Double barrel
            fogging machine, best thermal fogging machine, fogging machine in bihar, fogging machine in delhi, fogging
            machine in india, fogging machine in mumbai, fogging machine pune, thermal fogging machine manufacturer in
            india, fogging machine in uttar pradesh, Best foggers, Foggers india, giant fogging machine, Mosquito fogger
          </p>
        </div>
      </div>
    </footer>
  )
}
