"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import ProductCard from "@/components/ProductCard"

// Local Product interface — matches the one declared in app/page.tsx.
// Duplicated for Phase 1 to keep the move purely local. Move to a shared
// types file in a later pass.
interface Product {
  _id?: string;
  id?: string;
  name: string;
  imageUrls: string[];
  priceRange: string;
  rating: number;
  reviewsCount: number;
  shortDescription: string;
  detailedDescription: string;
  features: string[];
  specifications: string[];
  applications: string[];
  badges: string[];
  youtubeLink?: string;
  whatsappMessageText: string;
  category: string;
  inStock: boolean;
  brochureUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  products: Product[];
  onBrochureDownload: (productName: string, brochureUrl?: string) => void;
}

export default function ProductsBlock({ products, onBrochureDownload }: Props) {
  return (
    <section id="products" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="eyebrow text-brand-600 mb-3">Product Catalogue</p>
          <h2 className="text-display-xs text-gray-900 mb-4 text-balance">Machines for every application.</h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            GeM-approved, OEM-manufactured fogging machines for municipal vector control, agricultural spraying, and industrial pest management.
          </p>
        </div>

        {products.length === 0 ? (
          // Graceful fallback when the products API returns no rows
          // (e.g. Mongo unreachable from a dev environment). In
          // production this branch is never hit because Mongo serves
          // the live catalogue.
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-14 px-6 text-center">
            <p className="mx-auto max-w-2xl text-base md:text-lg text-gray-600 leading-relaxed">
              Browse our complete catalogue of industrial fogging machines, vehicle-mounted systems, and agricultural equipment.
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/products" className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm transition-all">
                View All Products <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ) : products.length <= 6 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.map((product, index) => (
              <ProductCard
                key={product._id || product.id || index}
                product={product}
                onViewDetails={() => { }}
                onBrochureDownload={() => onBrochureDownload(product.name, product.brochureUrl)}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {products.slice(0, 6).map((product, index) => (
                <ProductCard
                  key={product._id || product.id || index}
                  product={product}
                  onViewDetails={() => { }}
                  onBrochureDownload={() => onBrochureDownload(product.name, product.brochureUrl)}
                />
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <Link href="/products" className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full text-sm shadow-lg shadow-brand-900/15 transition-all">
                View All Products <ArrowRight size={15} />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
