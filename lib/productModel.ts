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
  createdAt?: string;
  updatedAt?: string;
} 