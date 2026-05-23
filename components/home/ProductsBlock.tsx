"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-green-100 text-green-800 hover:bg-green-200 text-lg px-6 py-2">
            Our Products
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Buy GeM Approved OEM of Fogging Machines at Best Prices</h2>
          <p className="text-xl text-gray-600 max-w-5xl mb-4 mx-auto">
            We provide a wide range of high-quality fogging machines designed to meet different industrial and commercial needs across India. At 100x Circle, you can easily <a className="text-blue-500" href="https://www.100xcircle.com/">buy industrial fogging machines online</a> from a complete selection of advanced and reliable products.
          </p>
          <p className="text-xl text-gray-600 max-w-5xl mb-4 mx-auto">
            Our range includes thermal fogging machines, giant foggers, and heavy-duty industrial models suitable for mosquito control, pest management, agriculture, warehouses, factories, and public health operations. Each machine is manufactured using durable components and pulse jet engine technology to ensure powerful output, uniform fog dispersion, and long-lasting performance.
          </p>
          <p className="text-xl text-gray-600 max-w-5xl mx-auto">
            We focus on efficiency, easy operation, and strong after-sales support so that our customers receive dependable solutions for every application. Explore our product range and buy industrial fogging machines online with confidence today.
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
              <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                <Link href="/products">
                  View All Products <ArrowRight className="ml-2" size={18} />
                </Link>
              </Button>
            </div>
          </div>
        ) : products.length <= 6 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.slice(0, 6).map((product, index) => (
                <ProductCard
                  key={product._id || product.id || index}
                  product={product}
                  onViewDetails={() => { }}
                  onBrochureDownload={() => onBrochureDownload(product.name, product.brochureUrl)}
                />
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Link href="/products">
                <Button className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4">
                  View All Products
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
