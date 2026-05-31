'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Menu, MessageCircle, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BUSINESS } from '@/lib/seo/site-config';
import BrochureLeadModal from '@/components/BrochureLeadModal';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/contact-us', label: 'Contact' },
  { href: '/blog', label: 'Blog' },
  { href: '/knowledge', label: 'Knowledge' },
] as const

const TEL_HREF = `tel:${BUSINESS.phonePrimary.replace(/\s+/g, '')}`
const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100x Circle, I'd like to know more about your fogging machines.",
)}`

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

interface NavbarProps {
  logoUrl?: string
  logoAlt?: string
}

export default function Navbar({ logoUrl = '/logo-main.png', logoAlt = '100x Circle' }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hasBrochure, setHasBrochure] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const pathname = usePathname()
  const isHeroPage = pathname === '/'
  const transparent = isHeroPage && !scrolled

  useEffect(() => {
    fetch('/api/brochure')
      .then((r) => r.json())
      .then((data) => { if (data?.hasBrochure) setHasBrochure(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isMenuOpen])

  const openBrochure = () => {
    if (hasBrochure) {
      setIsMenuOpen(false)
      setModalOpen(true)
    } else {
      window.location.href = '/contact-us'
    }
  }

  const iconClass = transparent
    ? 'inline-flex items-center gap-1.5 h-10 px-2.5 md:px-3 rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2'
    : 'inline-flex items-center gap-1.5 h-10 px-2.5 md:px-3 rounded-full text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2'

  const contactIcons = (
    <div data-gtm-location="navbar" className="flex items-center gap-1 md:gap-2" aria-label="Quick contact">
      <a href={TEL_HREF} aria-label={`Call ${BUSINESS.phonePrimary}`} className={iconClass}>
        <Phone size={18} aria-hidden="true" />
        <span className="hidden md:inline text-sm font-semibold">Call Now</span>
      </a>
      <a href={WA_HREF} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className={iconClass}>
        <MessageCircle size={18} aria-hidden="true" />
        <span className="hidden md:inline text-sm font-semibold">WhatsApp Us</span>
      </a>
    </div>
  )

  return (
    <>
      <BrochureLeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        source="navbar"
      />

      <header
        className={cn(
          'fixed top-0 left-0 w-full z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300',
          transparent
            ? 'bg-transparent border-b border-white/10'
            : scrolled
              ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200'
              : 'bg-white border-b border-gray-100',
        )}
      >
        <nav className="container mx-auto px-4 py-3.5 md:py-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="100x Circle home"
            className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <img src={logoUrl} alt={logoAlt} className="w-16 h-auto md:w-20" draggable={false} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((l) => {
              const active = isActive(pathname, l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 rounded-sm',
                    active
                      ? transparent ? 'text-green-400' : 'text-green-700'
                      : transparent ? 'text-white/85 hover:text-white' : 'text-gray-700 hover:text-green-600',
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
          </div>

          {/* Right cluster: contact + brochure (desktop) + brochure icon (mobile) + hamburger */}
          <div className="flex items-center gap-1 md:gap-2">
            {contactIcons}

            {/* Brochure — desktop: full button; mobile: icon-only button (always visible) */}
            <button
              onClick={openBrochure}
              data-download
              aria-label="Download company brochure"
              className={cn(
                "lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600",
                transparent ? "text-white/90 hover:bg-white/10" : "text-gray-700 hover:bg-green-50 hover:text-green-700",
              )}
            >
              <Download size={18} aria-hidden="true" />
            </button>

            <Button
              onClick={openBrochure}
              className="hidden lg:inline-flex bg-green-600 hover:bg-green-700 ml-1"
              data-download
              aria-label="Download company brochure"
            >
              <Download size={16} className="mr-2" aria-hidden="true" />
              Brochure
            </Button>

            <button
              type="button"
              className={cn(
                'lg:hidden p-2 -mr-2 ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded-md transition-colors',
                transparent ? 'text-white hover:text-white/80' : 'text-gray-700 hover:text-green-600',
              )}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              aria-controls="navbar-mobile-menu"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>
          </div>
        </nav>

        {isMenuOpen && (
          <div id="navbar-mobile-menu" className="lg:hidden bg-white shadow-md border-t border-gray-200">
            <div className="flex flex-col p-3">
              {NAV_LINKS.map((l) => {
                const active = isActive(pathname, l.href)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-3 py-3 text-base font-medium transition-colors',
                      active ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50',
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                )
              })}
              <Button
                className="mt-3 bg-green-600 hover:bg-green-700"
                onClick={openBrochure}
                data-download
                aria-label="Download company brochure"
              >
                <Download size={16} className="mr-2" aria-hidden="true" />
                Brochure
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
