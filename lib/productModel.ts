export interface FeatureItem {
  id: string
  title: string
  value: string
  icon?: string
  image?: string
  tooltip?: string
  order: number
}

export interface SpecItem {
  id: string
  label: string
  value: string
  group: string
  icon?: string
  order: number
}

export interface ApplicationItem {
  id: string
  title: string
  description?: string
  icon?: string
  image?: string
  industry?: string
  priority: number
}

export type SectionType =
  | 'hero' | 'features' | 'applications' | 'specifications' | 'gallery' | 'video'
  | 'faq' | 'metrics' | 'certifications' | 'case-study' | 'downloads' | 'reviews'
  | 'comparison' | 'dealer-network' | 'warranty' | 'custom'

export interface ProductSection {
  id: string
  type: SectionType
  title?: string
  hidden?: boolean
  order: number
  contentDefaults?: Record<string, unknown>
}

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
  features: string[] | FeatureItem[];
  specifications: string[] | SpecItem[];
  applications: string[] | ApplicationItem[];
  sections?: ProductSection[];
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
  certificationIds?: string[];         // IDs from the certifications collection
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