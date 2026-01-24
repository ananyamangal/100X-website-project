export interface Product {
  _id?: string;
  name: string;
  category: string;
  priceRange: string;
  badges: string[]; // Changed from badge: string to badges: string[]
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
  youtubeLink?: string; // Added YouTube link field
  whatsappMessageText: string;
  brochureUrl?: string;
  slideshowInterval?: number; // Time in milliseconds between product image slides
  order?: number; // Display order (lower numbers appear first, 0 is top)
  createdAt?: string;
  updatedAt?: string;
} 