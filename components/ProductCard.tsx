import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Star } from 'lucide-react';
import Link from 'next/link';

// Map badge to logo if needed (copy logic from homepage)
const badgeLogoMap: Record<string, string> = {
  'Korean Technology': '/logos clipart 2/Korean Technology.png',
  'German Technology': '/logos clipart 2/german technology.png',
  'Japnese Technology': '/logos clipart 2/Japnese technology.png',
  'GeM': '/logos clipart 2/GeM logo.png',
  'GeM logo': '/logos clipart 2/GeM logo.png',
  'Heavy Duty': '/logos clipart 2/Heavy duty.png',
  'Eco Friendly': '/logos clipart 2/Ecofreidly.png',
  'Ecofreidly': '/logos clipart 2/Ecofreidly.png',
  'BIS Approved': '/logos clipart 2/BIS approved.png',
};

export default function ProductCard({
  product,
  onViewDetails,
  onBrochureDownload,
}: {
  product: any;
  onViewDetails: () => void;
  onBrochureDownload: () => void;
}) {
  return (
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 shadow-lg">
      <div className="relative overflow-hidden">
        <div className="relative w-full aspect-square overflow-hidden">
          <img
            src={product.imageUrls?.[0] || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        <div className="absolute top-4 left-4 flex flex-wrap gap-1 max-w-[calc(100%-2rem)]">
          {(product.badges || [product.badge]).slice(0, 3).map((badge, index) => (
            <Badge
              key={index}
              className={`$${
                badge === 'Best Seller'
                  ? 'bg-red-500 hover:bg-red-600'
                  : badge === 'Eco-Friendly'
                  ? 'bg-green-500 hover:bg-green-600'
                  : badge === 'New Launch'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-orange-500 hover:bg-orange-600'
              } flex items-center gap-1 px-2 py-1 text-xs whitespace-nowrap`}
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
          ))}
          {(product.badges || [product.badge]).length > 3 && (
            <Badge className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 text-xs">
              +{(product.badges || [product.badge]).length - 3}
            </Badge>
          )}
        </div>
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
          <div className="flex items-center space-x-1">
            <Star className="text-yellow-400 fill-current" size={16} />
            <span className="text-sm font-semibold">{product.rating}</span>
            <span className="text-xs text-gray-600">({product.reviewsCount})</span>
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
            {product.name}
          </h3>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">{product.priceRange}</div>
          </div>
        </div>
        <p className="text-gray-600 mb-4 line-clamp-2">{product.detailedDescription}</p>
        <div className="space-y-2 mb-6">
          {product.features?.slice(0, 3).map((feature: string, idx: number) => (
            <div key={idx} className="flex items-center text-sm text-gray-600">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3"></div>
              {feature}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button
            asChild
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Link href={`/products/${product._id || product.id}`}>
              View Details
            </Link>
          </Button>
          <Button
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
            onClick={onBrochureDownload}
          >
            <Download size={16} className="mr-2" />
            Brochure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 