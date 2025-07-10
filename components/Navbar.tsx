'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Helper for nav links
  const aboutLink = isHome ? '#about' : '/about';
  const contactLink = isHome ? '#contact' : '/#contact';

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-sm border-b">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <img src="/logo-main.png" alt="100X Logo" className="w-16 h-auto" />
          <span className="text-2xl font-bold text-green-700">100X</span>
        </Link>
        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center space-x-8">
          <Link href="/" className="text-gray-700 hover:text-green-600 transition-colors">
            Home
          </Link>
          <Link href="/products" className="text-gray-700 hover:text-green-600 transition-colors">
            Products
          </Link>
          <Link href={contactLink} className="text-gray-700 hover:text-green-600 transition-colors">
            Contact
          </Link>
          <Button className="bg-green-600 hover:bg-green-700">
            <Download size={16} className="mr-2" />
            Brochure
          </Button>
        </div>
        {/* Mobile Menu Button */}
        <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white shadow-md border-t">
          <div className="flex flex-col space-y-4 p-4">
            <Link href="/" className="text-left text-green-600 font-semibold" onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
            <Link href="/products" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
              Products
            </Link>
            <Link href={contactLink} className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
              Contact
            </Link>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsMenuOpen(false)}>
              <Download size={16} className="mr-2" />
              Brochure
            </Button>
          </div>
        </div>
      )}
    </header>
  );
} 