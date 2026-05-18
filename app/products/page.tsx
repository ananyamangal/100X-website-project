'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link'
import { Menu, X, Download, MessageCircle } from 'lucide-react'
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';

// Default categories (fallback)
const DEFAULT_CATEGORIES = [
  'Vehicle mountable Fogging Machines',
  'Cold Foggers',
  'Agriculture Sprayers',
  'Power Weeders and Tillers',
  'Brush Cutter',
  'Lawn mower',
  'Water pumps',
  'Chain Saw',
  'Chaff Cutter',
  'seeders',
  'Trolleys'
];

export default function AllProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // For product details navigation, you may want to use a modal or router push
  const handleViewDetails = (product: any) => {
    // TODO: Implement navigation to product details (modal or page)
    // For now, just alert
    alert(`View details for: ${product.name}`);
  };

  const handleBrochureDownload = (product: any) => {
    // TODO: Implement brochure download logic
    alert(`Download brochure for: ${product.name}`);
  };

  useEffect(() => {
    fetch('/api/admin/products')
      .then(res => res.json())
      .then(data => {
        const productsList = Array.isArray(data) ? data : [];
        // Sort by order (lower numbers first), then by creation date
        productsList.sort((a: any, b: any) => {
          const orderA = a.order !== undefined ? a.order : Infinity;
          const orderB = b.order !== undefined ? b.order : Infinity;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setProducts(productsList);
        setLoading(false);
      });
  }, []);

  // Load categories from localStorage (set by admin panel)
  useEffect(() => {
    const loadCategories = () => {
      if (typeof window !== 'undefined') {
        const savedCategories = localStorage.getItem('admin-categories');
        console.log('Loading categories from localStorage:', savedCategories);
        if (savedCategories) {
          try {
            const parsedCategories = JSON.parse(savedCategories);
            console.log('Parsed categories:', parsedCategories);
            setCategories(parsedCategories);
          } catch (e) {
            console.error('Failed to parse saved categories:', e);
          }
        }
      }
    };

    // Load categories initially
    loadCategories();

    // Listen for changes to localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin-categories') {
        loadCategories();
      }
    };

    // Listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      console.log('Categories updated event received');
      loadCategories();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('categoriesUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('categoriesUpdated', handleCustomStorageChange);
    };
  }, []);

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hide global Navbar from layout on this page */}
      <style jsx global>{`
        header.bg-white.shadow-sm.border-b { display: none !important; }
      `}</style>

      {/* Header (same as Home page) */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md shadow-lg z-50 border-b">
        {/* Green utility bar removed — phone + WhatsApp now live in the
            global Navbar as compact icon buttons. */}

        {/* Navbar */}
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/logo-main.png" alt="100X Logo" className="w-24 h-auto" />
              <div className="flex flex-col">
                <span className="text-base md:text-lg text-black font-bold">Circle Pvt Ltd.</span>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-green-600 transition-colors">
                Home
              </Link>
              <Link href="/products" className="text-green-600 font-semibold transition-colors">
                Products
              </Link>
              <a href="/#about" className="text-gray-700 hover:text-green-600 transition-colors">
                About Us
              </a>
              <Link href="/contact-us" className="text-gray-700 hover:text-green-600 transition-colors" onClick={() => { if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) { (window as any).gtag_report_conversion(); } }}>
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
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t">
              <div className="flex flex-col space-y-4 pt-4">
                <Link href="/" className="text-left text-green-600 font-semibold" onClick={() => setIsMenuOpen(false)}>
                  Home
                </Link>
                <Link href="/products" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  Products
                </Link>
                <a href="/#about" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  About Us
                </a>
                <Link href="/contact-us" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  Contact
                </Link>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsMenuOpen(false)}>
                  <Download size={16} className="mr-2" />
                  Brochure
                </Button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Spacer for fixed header */}
      <div className="pt-32" />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">All Products</h1>
          <p className="text-lg text-gray-600">
            Browse our complete range of products. Use the categories below to filter.
            {categories.length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-gray-500 block mb-2">Available categories:</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.map((category, index) => (
                    <span 
                      key={category} 
                      className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </p>
        </div>
        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Button
            variant={selectedCategory === 'All' ? 'default' : 'outline'}
            className={selectedCategory === 'All' ? 'bg-green-600 text-white' : ''}
            onClick={() => setSelectedCategory('All')}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className={selectedCategory === cat ? 'bg-green-600 text-white' : ''}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        {/* Products Grid */}
        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-gray-500 py-20">No products found in this category.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map(product => (
              <ProductCard
                key={product._id || product.id}
                product={product}
                onViewDetails={() => handleViewDetails(product)}
                onBrochureDownload={() => handleBrochureDownload(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 