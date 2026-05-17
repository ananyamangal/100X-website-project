import Link from "next/link"
import { Mail, MapPin, Phone, Youtube } from "lucide-react"
import { BUSINESS, SITE_NAME_LEGAL } from "@/lib/seo/site-config"
import Container from "../primitives/Container"

const COLUMNS = [
  {
    heading: "Machines",
    links: [
      { href: "/products", label: "All products" },
      { href: "/thermal-and-cold-fogging-machine-100xtfs50", label: "Thermal + cold fogger" },
      { href: "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400", label: "Vehicle-mounted DB400" },
      { href: "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20", label: "SS-tank thermal" },
    ],
  },
  {
    heading: "Buyer hubs",
    links: [
      { href: "/gem-approved-fogging-machine-oem", label: "GeM approved OEM" },
      { href: "/fogging-machine-supplier-in-uttar-pradesh", label: "UP supplier" },
      { href: "/dengue-control-fogging-machine", label: "Dengue control" },
      { href: "/thermal-vs-cold-fogging-machine", label: "Thermal vs cold" },
      { href: "/fogging-machine-buying-guide", label: "Buying guide" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Insights" },
      { href: "/contact-us", label: "Contact" },
      { href: "/privacy-policy", label: "Privacy" },
      { href: "/terms-and-conditions", label: "Terms" },
    ],
  },
]

/**
 * Footer tuned for the black-industrial theme. Surface-1 base, accent
 * orange dividers, three narrow link columns, contact column with
 * tap-friendly tel/mailto/map. Doesn't replace the existing SiteFooter
 * — it's only mounted inside the redesigned preview route.
 */
export default function RedesignFooter() {
  return (
    <footer className="border-t border-[var(--rd-border)] bg-[var(--rd-surface-1)]/70 pt-16 md:pt-20 pb-10">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="text-xl font-bold tracking-tight">
              100x <span className="text-[var(--rd-accent)]">Circle</span>
            </div>
            <p className="mt-3 text-sm text-[var(--rd-text-muted)] max-w-xs leading-relaxed">
              Industrial fogging machines, agricultural equipment, and
              sanitation gear manufactured in Gurugram. GeM-approved OEM
              supplying municipal corporations, government health
              departments, and channel partners across India.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-[var(--rd-text-muted)] list-none">
              <li className="flex items-start gap-2.5">
                <Phone size={14} aria-hidden="true" className="mt-1 shrink-0 text-[var(--rd-accent)]" />
                <a
                  href={`tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`}
                  className="hover:text-[var(--rd-text)] transition-colors"
                >
                  {BUSINESS.phonePrimary}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail size={14} aria-hidden="true" className="mt-1 shrink-0 text-[var(--rd-accent)]" />
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="hover:text-[var(--rd-text)] transition-colors break-all"
                >
                  {BUSINESS.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin size={14} aria-hidden="true" className="mt-1 shrink-0 text-[var(--rd-accent)]" />
                <address className="not-italic">
                  {BUSINESS.streetAddress}, {BUSINESS.addressLocality}
                </address>
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={BUSINESS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="100x Circle on YouTube"
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--rd-border-strong)] bg-[var(--rd-surface-2)] text-[var(--rd-text-muted)] transition-colors hover:border-[var(--rd-accent)] hover:text-[var(--rd-accent)]"
              >
                <Youtube size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--rd-text-muted)]">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3 text-sm list-none">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[var(--rd-text)]/85 hover:text-[var(--rd-accent)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rd-border)] pt-6 text-xs text-[var(--rd-text-dim)]">
          <p>© {new Date().getUTCFullYear()} {SITE_NAME_LEGAL}. All rights reserved.</p>
          <a href="/sitemap.xml" className="hover:text-[var(--rd-text-muted)] transition-colors">
            Sitemap
          </a>
        </div>
      </Container>
    </footer>
  )
}
