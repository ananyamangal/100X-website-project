'use client';

import React, { useEffect, useState } from 'react';
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
        setProducts(Array.isArray(data) ? data : []);
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
    <div className="pt-32 min-h-screen bg-gray-50">
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