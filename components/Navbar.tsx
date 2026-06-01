'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Menu, MessageCircle, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BUSINESS } from '@/lib/seo/site-config';
import BrochureLeadModal from '@/components/BrochureLeadModal';

const YT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const IG_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/spare-parts', label: 'Spare Parts' },
  { href: '/about', label: 'About' },
  { href: '/contact-us', label: 'Contact' },
  { href: '/blog', label: 'Blog' },
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
            <img src={logoUrl} alt={logoAlt} className="h-9 md:h-10 w-auto" draggable={false} />
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

          {/* Right cluster: social + contact + brochure (desktop) + hamburger */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Social icons — desktop only */}
            <div className="hidden xl:flex items-center gap-1 mr-1">
              <a
                href={BUSINESS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="100X Circle on YouTube"
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                  transparent ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-red-600 hover:bg-red-50",
                )}
              >
                {YT_ICON}
              </a>
              <a
                href={BUSINESS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="100X Circle on Instagram"
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                  transparent ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-pink-600 hover:bg-pink-50",
                )}
              >
                {IG_ICON}
              </a>
            </div>

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
