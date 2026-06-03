export interface FilmChapter {
  title: string
  subtitle?: string
  description?: string
  videoUrl?: string
  imageUrl?: string
  sortOrder?: number
}

export interface BoxItem {
  item: string
  quantity: string
  imageUrl?: string
}

export interface ProductFaq {
  q: string
  a: string
}

export interface Product {
  _id?: string;
  slug?: string;
  name: string;
  category: string;
  priceRange: string;
  badges: string[];
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  shortDescription: string;
  detailedDescription: string;
  features: string[];
  specifications: string[];
  applications: string[];
  youtubeLink?: string;
  whatsappMessageText: string;
  brochureUrl?: string;
  slideshowInterval?: number;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
  // Cinematic experience fields
  tagline?: string;
  heroVideoUrl?: string;
  problem?: string;
  solution?: string;
  certifications?: string[];
  performanceMetrics?: string[];
  // Product Experience Builder
  filmChapters?: FilmChapter[];
  boxContents?: BoxItem[];
  productFaqs?: ProductFaq[];
  // Bidirectional relationships
  linkedCaseStudyIds?: string[];
  // Warranty
  warrantyEnabled?: boolean;
  warrantyPeriod?: string;
  warrantyDescription?: string;
  warrantyIcon?: string;
  // UGC / deployment carousel images
  ugcImages?: string[];
  // SEO overrides
  seoTitle?: string;
  metaDescription?: string;
  h1Title?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
}