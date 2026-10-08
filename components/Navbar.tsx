'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Download, Menu, Phone, X } from 'lucide-react';
import { WhatsAppIcon } from '@/components/WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BUSINESS } from '@/lib/seo/site-config';
import type { VisibleSocialLink } from '@/lib/socialLinksShared';
import { SOCIAL_ICONS } from '@/components/seo/SocialIcons';
import BrochureLeadModal from '@/components/BrochureLeadModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { DesktopNavDropdown, MobileNavAccordion, productsPanel, performancePanel, blogPanel, sparePartsPanel, type PanelContent } from '@/components/NavMenus';
import type { NavProductGroup } from '@/lib/navProducts';
import type { NavCaseStudy } from '@/lib/navPerformance';
import type { NavBlogPost } from '@/lib/navBlog';
import type { NavSparePartGroup } from '@/lib/navSpareParts';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/past-performance-government', label: 'Performance' },
  { href: '/spare-parts', label: 'Spare Parts' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact-us', label: 'Contact' },
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
  hasBrochure?: boolean
  socialLinks?: VisibleSocialLink[]
  /** Header Products menu; empty → the plain "Products" link. */
  productGroups?: NavProductGroup[]
  /** Case studies for the Performance menu (its quick links are static). */
  caseStudies?: NavCaseStudy[]
  /** Latest posts for the Blog menu; empty → the plain "Blog" link. */
  blogPosts?: NavBlogPost[]
  /** Machine-grouped parts for the Spare Parts menu; empty → the plain link. */
  sparePartGroups?: NavSparePartGroup[]
}

export default function Navbar({ logoUrl = '/logo-main.png', logoAlt = '100x Circle', hasBrochure: hasBrochureProp, socialLinks = [], productGroups = [], caseStudies = [], blogPosts = [], sparePartGroups = [] }: NavbarProps) {
  // Dropdown per nav item; an item without an entry renders as a plain link.
  const dropdowns: Partial<Record<string, { toggleLabel: string; panel: (v: 'desktop' | 'mobile') => PanelContent }>> = {
    ...(productGroups.length > 0 && {
      '/products': { toggleLabel: 'Show all products', panel: (v) => productsPanel(productGroups, v) },
    }),
    '/past-performance-government': { toggleLabel: 'Show past performance', panel: (v) => performancePanel(caseStudies, v) },
    ...(sparePartGroups.length > 0 && {
      '/spare-parts': { toggleLabel: 'Show spare parts', panel: (v) => sparePartsPanel(sparePartGroups, v) },
    }),
    ...(blogPosts.length > 0 && {
      '/blog': { toggleLabel: 'Show latest articles', panel: (v) => blogPanel(blogPosts, v) },
    }),
  }
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hasBrochure, setHasBrochure] = useState(hasBrochureProp ?? false)
  const [modalOpen, setModalOpen] = useState(false)
  const pathname = usePathname()
  const isHeroPage = pathname === '/'
  const transparent = isHeroPage && !scrolled

  useEffect(() => {
    // Only fetch if not pre-resolved from server
    if (hasBrochureProp !== undefined) return
    fetch('/api/brochure')
      .then((r) => r.json())
      .then((data) => { if (data?.hasBrochure) setHasBrochure(true) })
      .catch(() => {})
  }, [hasBrochureProp])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
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
    : 'inline-flex items-center gap-1.5 h-10 px-2.5 md:px-3 rounded-full text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2'

  // Icon-only (40 px targets) so the desktop nav fits from 1024 px; the label
  // lives in aria-label and the title tooltip.
  const contactIconClass = cn(iconClass, 'w-10 justify-center px-0 md:px-0')

  const contactIcons = (
    <div data-gtm-location="navbar" className="flex items-center gap-1 md:gap-2" aria-label="Quick contact">
      <a href={TEL_HREF} aria-label={`Call ${BUSINESS.phonePrimary}`} title={`Call ${BUSINESS.phonePrimary}`} className={contactIconClass}>
        <Phone size={18} aria-hidden="true" />
      </a>
      <a href={WA_HREF} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" title="Chat on WhatsApp" className={contactIconClass}>
        <WhatsAppIcon size={18} />
      </a>
      <LanguageSwitcher triggerClassName={cn(iconClass, 'text-sm font-semibold')} />
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
            className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <Image src={logoUrl} alt={logoAlt} width={160} height={40} className="h-9 md:h-10 w-auto" draggable={false} priority />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-5 2xl:gap-7">
            {NAV_LINKS.map((l) => {
              const active = isActive(pathname, l.href)
              const linkClassName = cn(
                'text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded-sm',
                active
                  ? transparent ? 'text-brand-400' : 'text-brand-700'
                  : transparent ? 'text-white/85 hover:text-white' : 'text-gray-700 hover:text-brand-600',
              )
              const dd = dropdowns[l.href]
              if (dd) {
                return (
                  <DesktopNavDropdown
                    key={l.href}
                    href={l.href}
                    label={l.label}
                    toggleLabel={dd.toggleLabel}
                    active={active}
                    linkClassName={linkClassName}
                    chevronClassName={transparent ? 'text-white/85 hover:text-white' : 'text-gray-700 hover:text-brand-600'}
                  >
                    {dd.panel('desktop')}
                  </DesktopNavDropdown>
                )
              }
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  // Below xl the logo is the home link, which leaves room for five dropdowns.
                  className={cn(linkClassName, l.href === '/' && 'hidden xl:inline')}
                >
                  {l.label}
                </Link>
              )
            })}
          </div>

          {/* Right cluster: social + contact + brochure (desktop) + hamburger */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Social icons — desktop only */}
            {socialLinks.length > 0 && (
              <div className="hidden xl:flex items-center gap-1 mr-1">
                {socialLinks.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`100X Circle on ${s.label}`}
                    className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                      transparent ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-brand-600 hover:bg-brand-50",
                    )}
                  >
                    {SOCIAL_ICONS[s.key]}
                  </a>
                ))}
              </div>
            )}

            {contactIcons}

            {/* Brochure — desktop: full button; mobile: icon-only button (always visible) */}
            <button
              onClick={openBrochure}
              data-download
              aria-label="Download company brochure"
              className={cn(
                "lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                transparent ? "text-white/90 hover:bg-white/10" : "text-gray-700 hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              <Download size={18} aria-hidden="true" />
            </button>

            <Button
              onClick={openBrochure}
              className="hidden lg:inline-flex bg-brand-600 hover:bg-brand-700 ml-1"
              data-download
              aria-label="Download company brochure"
            >
              <Download size={16} className="mr-2" aria-hidden="true" />
              Brochure
            </Button>

            <button
              type="button"
              className={cn(
                'lg:hidden p-2 -mr-2 ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded-md transition-colors',
                transparent ? 'text-white hover:text-white/80' : 'text-gray-700 hover:text-brand-600',
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
          <div id="navbar-mobile-menu" className="lg:hidden bg-white shadow-md border-t border-gray-200 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
            <div className="flex flex-col p-3">
              {NAV_LINKS.map((l) => {
                const active = isActive(pathname, l.href)
                const dd = dropdowns[l.href]
                if (dd) {
                  return (
                    <MobileNavAccordion
                      key={l.href}
                      href={l.href}
                      label={l.label}
                      toggleLabel={dd.toggleLabel}
                      active={active}
                      onNavigate={() => setIsMenuOpen(false)}
                    >
                      {dd.panel('mobile')}
                    </MobileNavAccordion>
                  )
                }
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-3 py-3 text-base font-medium transition-colors',
                      active ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50',
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                )
              })}
              <Button
                className="mt-3 bg-brand-600 hover:bg-brand-700"
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
