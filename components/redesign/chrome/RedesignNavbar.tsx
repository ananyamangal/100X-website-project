"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, Menu, X } from "lucide-react"
import Button from "../primitives/Button"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/gem-approved-fogging-machine-oem", label: "GeM" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Insights" },
  { href: "/contact-us", label: "Contact" },
]

/**
 * Sticky top navbar tuned for the black-industrial redesign. Background
 * shifts from transparent at top → blurred translucent black after a
 * small scroll delta, so the hero feels uninterrupted while the nav
 * gains contrast over body content.
 *
 * Mobile: simple expanding panel below the bar (no Radix drawer cost).
 * Closes on ESC and route change. Hamburger has aria-controls /
 * aria-expanded.
 */
export default function RedesignNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <header
      className={
        "sticky top-0 z-50 border-b transition-all duration-200 " +
        (scrolled
          ? "border-[var(--rd-border)] bg-black/70 backdrop-blur-md"
          : "border-transparent bg-transparent")
      }
    >
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-6 md:px-8 py-4 md:py-5">
        <Link
          href="/"
          className="group flex items-center gap-2 text-[var(--rd-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-accent)] rounded-md"
        >
          <span className="font-bold text-lg tracking-tight">
            100x <span className="text-[var(--rd-accent)]">Circle</span>
          </span>
        </Link>

        <ul className="hidden lg:flex items-center gap-7 list-none">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-sm font-medium text-[var(--rd-text-muted)] transition-colors hover:text-[var(--rd-text)] focus-visible:outline-none focus-visible:text-[var(--rd-accent)]"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden lg:block">
          <Button href="/contact-us#brochure" variant="primary" size="md" trailing dataGtm="nav_brochure">
            <Download size={14} aria-hidden="true" />
            Brochure
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="rd-nav-mobile"
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden p-2 -mr-2 text-[var(--rd-text)] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-accent)]"
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </nav>

      {open ? (
        <div
          id="rd-nav-mobile"
          className="lg:hidden border-t border-[var(--rd-border)] bg-black/90 backdrop-blur-md"
        >
          <ul className="mx-auto flex max-w-[1280px] flex-col gap-1 px-6 py-5 list-none">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base font-medium text-[var(--rd-text-muted)] hover:text-[var(--rd-text)] transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-3">
              <Button
                href="/contact-us#brochure"
                variant="primary"
                size="md"
                trailing
                className="w-full"
                dataGtm="nav_brochure_mobile"
              >
                <Download size={14} aria-hidden="true" />
                Download Brochure
              </Button>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  )
}
