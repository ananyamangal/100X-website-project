import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { plainTextFromHtml } from '@/lib/rich-text';

const badgeLogoMap: Record<string, string> = {
  'Korean Technology':  '/Logos clipart 2/Korean Technology.png',
  'German Technology':  '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  'GeM':                '/Logos clipart 2/GeM logo.png',
  'GeM logo':           '/Logos clipart 2/GeM logo.png',
  'GeM Registered':     '/Logos clipart 2/GeM logo.png',
  'GeM Approved':       '/Logos clipart 2/GeM logo.png',
  'Heavy Duty':         '/Logos clipart 2/Heavy duty.png',
  'Heavy duty':         '/Logos clipart 2/Heavy duty.png',
  'Eco Friendly':       '/Logos clipart 2/Ecofreidly.png',
  'Ecofreidly':         '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved':       '/Logos clipart 2/BIS approved.png',
  'BIS':                '/Logos clipart 2/BIS approved.png',
};

function decodeBadge(b: string): string {
  return b.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").trim()
}

function featureToString(x: unknown): string {
  if (typeof x === 'string') return x
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>
    if (typeof o.title === 'string') return o.value ? `${o.title}: ${o.value}` : o.title
    if (typeof o.label === 'string') return o.value ? `${o.label}: ${o.value}` : o.label
    if (typeof o.name === 'string') return o.value ? `${o.name}: ${o.value}` : o.name
  }
  return ''
}

export default function ProductCard({
  product,
  onViewDetails,
  onBrochureDownload,
}: {
  product: any;
  onViewDetails: () => void;
  onBrochureDownload: () => void;
}) {
  // Normalize images for slideshow
  const images: string[] =
    (product.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0)
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : product.image
          ? [product.image]
          : ['/placeholder.svg'];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    // Use product's slideshow interval or default to 5000ms (5 seconds)
    const intervalTime = product.slideshowInterval || 5000;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, intervalTime);
    return () => clearInterval(interval);
  }, [images, product.slideshowInterval]);

  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  return (
    <Card className="group overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Whole image area (image + dots + badges + star) is now a single
          clickable link to the product detail page. Badges and the star
          chip render inside the link via pointer-events-none + relative
          z-0 so they remain visible without intercepting clicks; the
          carousel-dots stay non-interactive (decorative only). */}
      <Link
        href={`/${slugify(product.name || product.name)}`}
        aria-label={`View details for ${product.name}`}
        className="block relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-inset"
      >
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-white">
          <Image
            src={images[currentImageIndex]}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            decoding="async"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
        {images.length > 1 && (
          <div
            aria-hidden="true"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-white/70 rounded-full px-2 py-1 pointer-events-none"
          >
            {images.slice(0, 5).map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full ${idx === (currentImageIndex % Math.min(images.length, 5)) ? 'bg-brand-600' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        )}
        <div className="absolute top-4 left-4 flex flex-wrap gap-1 max-w-[calc(100%-2rem)] pointer-events-none">
          {(product.badges || [] as string[]).slice(0, 3).map((rawBadge: string, index: number) => {
            const badge = decodeBadge(rawBadge)
            return (
            <Badge
              key={index}
              className={`${badge === 'Best Seller'
                  ? 'bg-red-500 hover:bg-red-600'
                  : badge === 'Eco-Friendly'
                    ? 'bg-brand-500 hover:bg-brand-600'
                    : badge === 'New Launch'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                } text-white flex items-center gap-1 px-2 py-1 text-xs whitespace-nowrap shadow-sm`}
            >
              {badgeLogoMap[badge] && (
                <img
                  src={badgeLogoMap[badge]}
                  alt={badge + ' logo'}
                  className="w-4 h-4 object-contain"
                />
              )}
              <span className="truncate">{badge}</span>
            </Badge>
            )
          })}
          {(product.badges || [product.badge]).length > 3 && (
            <Badge className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 text-xs">
              +{(product.badges || [product.badge]).length - 3}
            </Badge>
          )}
        </div>
        <div
          aria-hidden="true"
          className="absolute top-3 right-3 rounded-md bg-white px-2.5 py-1 shadow-sm ring-1 ring-gray-200 pointer-events-none"
        >
          <div className="flex items-center gap-1">
            <Star className="text-amber-400 fill-current" size={14} />
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{product.rating}</span>
            <span className="text-xs text-gray-500 tabular-nums">({product.reviewsCount})</span>
          </div>
        </div>
      </Link>
      <CardContent className="p-6 md:p-7">
        <div className="flex items-start justify-between gap-3 mb-3">
          <Link href={`/${slugify(product.name || product.name)}`} className="min-w-0 flex-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
          {product.priceRange ? (
            <div className="shrink-0 text-right">
              <div className="text-base md:text-lg font-bold text-brand-700 tabular-nums">{product.priceRange}</div>
            </div>
          ) : null}
        </div>
        <p className="text-sm md:text-base text-gray-600 mb-5 line-clamp-2 leading-relaxed">{plainTextFromHtml(product.detailedDescription || '')}</p>
        <ul className="space-y-1.5 mb-6 list-none">
          {product.features?.slice(0, 3).map((feature: unknown, idx: number) => {
            const text = featureToString(feature)
            if (!text) return null
            const ci = text.indexOf(':')
            const label = ci !== -1 ? text.slice(0, ci).trim() : text
            return (
            <li key={idx} className="flex items-start text-sm text-gray-700">
              <span aria-hidden="true" className="mt-2 mr-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"></span>
              <span className="line-clamp-1">{label}</span>
            </li>
            )
          })}
        </ul>
        <div className="flex gap-2.5">
          <Button
            asChild
            className="flex-1 bg-brand-600 hover:bg-brand-700 shadow-sm transition-shadow hover:shadow-md"
          >
            <Link href={`/${slugify(product.name || product.name)}`}>
              View Details
            </Link>
          </Button>
          <Button
            variant="outline"
            className="border-brand-600 text-brand-700 hover:bg-brand-50 bg-transparent"
            onClick={onBrochureDownload}
            aria-label={`Download brochure for ${product.name}`}
          >
            <Download size={16} className="mr-2" aria-hidden="true" />
            Brochure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 