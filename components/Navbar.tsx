'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/contact-us', label: 'Contact' },
  { href: '/blog', label: 'Blog' },
] as const

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isMenuOpen])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 w-full z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200',
        scrolled
          ? 'bg-white/85 backdrop-blur-md shadow-sm border-b border-gray-200'
          : 'bg-white border-b border-transparent',
      )}
    >
      <nav className="container mx-auto px-4 py-3.5 md:py-4 flex items-center justify-between">
        <Link
          href="/"
          aria-label="100x Circle home"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
          <img src="/logo-main.png" alt="" aria-hidden="true" className="w-14 h-auto md:w-16" />
          <span className="text-xl md:text-2xl font-bold tracking-tight text-green-700">
            100X
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:text-green-700',
                  active ? 'text-green-700' : 'text-gray-700 hover:text-green-600',
                  // Underline anchored to baseline; only shown for the active route.
                  "after:absolute after:left-0 after:-bottom-1.5 after:h-[2px] after:bg-green-600 after:transition-all",
                  active ? 'after:w-full' : 'after:w-0',
                )}
              >
                {l.label}
              </Link>
            )
          })}
          <Button className="bg-green-600 hover:bg-green-700 ml-1">
            <Download size={16} className="mr-2" aria-hidden="true" />
            Brochure
          </Button>
        </div>

        <button
          type="button"
          className="lg:hidden p-2 -mr-2 text-gray-700 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded-md transition-colors"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="navbar-mobile-menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </nav>

      {isMenuOpen && (
        <div
          id="navbar-mobile-menu"
          className="lg:hidden bg-white shadow-md border-t border-gray-200"
        >
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
            <Button className="mt-3 bg-green-600 hover:bg-green-700" onClick={() => setIsMenuOpen(false)}>
              <Download size={16} className="mr-2" aria-hidden="true" />
              Brochure
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
