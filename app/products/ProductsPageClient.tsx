'use client'
import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, MessageCircle, Star } from 'lucide-react'
import ScrollReveal from '@/components/cinematic/ScrollReveal'
import BrochureLeadModal from '@/components/BrochureLeadModal'
import { BUSINESS } from '@/lib/seo/site-config'

const badgeLogoMap: Record<string, string> = {
  'Made in India': '/Logos clipart 2/MadeInIndia.png',
  'German Technology': '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  GeM: '/Logos clipart 2/GeM logo.png',
  'GeM logo': '/Logos clipart 2/GeM logo.png',
  'Heavy Duty': '/Logos clipart 2/Heavy Duty.png',
  'Heavy duty': '/Logos clipart 2/Heavy Duty.png',
  'Eco Friendly': '/Logos clipart 2/Ecofreidly.png',
  Ecofreidly: '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/Logos clipart 2/BIS approved.png',
}

function ProductListCard({ product, onBrochure }: { product: any; onBrochure: (p: any) => void }) {
  const [imgIdx, setImgIdx] = React.useState(0)
  const images: string[] = product.imageUrls?.length ? product.imageUrls : ['/placeholder.svg']
  const id = product._id
  const productPath = product.slug || id

  const wa = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    product.whatsappMessageText || `Hi, I'm interested in ${product.name}. Please share pricing and availability.`
  )}`

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-brand-200 transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Image area */}
      <Link href={`/products/${productPath}`} className="block relative overflow-hidden bg-gray-50 aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[imgIdx]}
          alt={product.name}
          width={400}
          height={300}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]"
          onContextMenu={(e) => e.preventDefault()}
          draggable="false"
        />
        {/* Badges */}
        {product.badges?.slice(0, 2).map((badge: string, i: number) => (
          <span key={i} className="absolute top-3 left-3 inline-flex items-center gap-1 bg-brand-600/90 text-white text-[10px] font-600 px-2.5 py-1 rounded-full backdrop-blur-sm">
            {badgeLogoMap[badge] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={badgeLogoMap[badge]} alt="" className="w-3 h-3 object-contain" />
            )}
            {badge}
          </span>
        ))}
        {/* Rating pill */}
        {product.rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-600 text-gray-800">{product.rating}</span>
          </div>
        )}
        {/* Thumbnail dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
            {images.slice(0, 5).map((_, i) => (
              <button key={i} onClick={(e) => { e.preventDefault(); setImgIdx(i) }} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-4 bg-brand-500' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        {product.category && (
          <p className="eyebrow text-brand-600 mb-1.5">{product.category}</p>
        )}
        <Link href={`/products/${productPath}`}>
          <h3 className="font-700 text-gray-900 text-base leading-snug mb-2 group-hover:text-brand-700 transition-colors line-clamp-2">{product.name}</h3>
        </Link>
        {product.tagline && (
          <p className="text-gray-400 text-xs mb-2 italic line-clamp-1">{product.tagline}</p>
        )}
        {product.priceRange && (
          <p className="text-brand-600 font-700 text-lg mb-3">{product.priceRange}</p>
        )}
        {product.features?.slice(0, 2).length > 0 && (
          <ul className="space-y-1 mb-4 flex-1">
            {product.features.slice(0, 2).map((f: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-400 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{f.split(':')[0]}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
          <Link
            href={`/products/${productPath}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl text-sm transition-all"
          >
            View Details <ArrowRight size={13} />
          </Link>
          <button
            onClick={() => onBrochure(product)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50 text-gray-500 hover:text-brand-600 transition-all shrink-0"
            aria-label="Download brochure"
          >
            <Download size={15} />
          </button>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:border-[#25D366] hover:bg-brand-50 text-gray-500 hover:[color:#25D366] transition-all shrink-0"
            aria-label="Enquire on WhatsApp"
          >
            <MessageCircle size={15} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPageClient({ products }: { products: any[] }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [brochureProduct, setBrochureProduct] = useState<any>(null)

  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => { if (p.category) cats.add(p.category) })
    return ['All', ...Array.from(cats)]
  }, [products])

  const filtered = useMemo(() =>
    activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory),
    [products, activeCategory]
  )

  return (
    <>
      <BrochureLeadModal
        open={!!brochureProduct}
        onClose={() => setBrochureProduct(null)}
        source="products-page"
        brochureUrl={brochureProduct?.brochureUrl}
        productName={brochureProduct?.name}
      />

      {/* Hero */}
      <section className="bg-gray-950 pt-24 pb-16 md:pt-28 md:pb-20">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Products</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-4">Complete Product Catalogue</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-800 text-white mb-5 leading-tight text-balance">
              Fogging machines for every application.
            </h1>
            <p className="text-cinema-300 text-lg leading-relaxed max-w-2xl">
              OEM-manufactured thermal fogging machines, vehicle-mounted foggers, cold ULV foggers, and agricultural equipment — engineered for India's public health and agriculture sectors.
            </p>
          </div>
          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap gap-6 md:gap-10">
            {[
              { value: `${products.length}+`, label: 'Products' },
              { value: '15+', label: 'Years Manufacturing' },
              { value: '500+', label: 'Government Orders' },
              { value: 'GeM', label: 'Registered' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-800 text-white">{s.value}</p>
                <p className="text-cinema-500 text-xs font-500 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Filter + Grid */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          {/* Filter bar */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-500 transition-all ${
                    cat === activeCategory
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">No products in this category.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((product, i) => (
                <ScrollReveal key={product._id} animation="fade-up" delay={Math.min(i * 40, 200)}>
                  <ProductListCard product={product} onBrochure={(p) => setBrochureProduct(p)} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Spare Parts CTA */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <p className="eyebrow text-brand-600 mb-3">Spare Parts Ecosystem</p>
          <h2 className="text-2xl font-700 text-gray-900 mb-3">Need spare parts?</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">Genuine OEM spare parts for all 100X Circle machines — shipped pan-India within 24–48 hours.</p>
          <Link href="/spare-parts" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-600 rounded-full hover:bg-brand-700 transition-all text-sm">
            Browse Spare Parts <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  )
}
