export interface Product {
  _id?: string;
  name: string;
  category: string;
  priceRange: string;
  badge: string;
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  imageUrl: string;
  shortDescription: string;
  detailedDescription: string;
  features: string[];
  specifications: string[];
  applications: string[];
  whatsappMessageText: string;
  createdAt?: string;
  updatedAt?: string;
} 