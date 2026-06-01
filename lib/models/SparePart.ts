import { ObjectId } from "mongodb"

export interface SparePart {
  _id?: string | ObjectId
  // Identity
  name: string
  slug: string
  sku?: string
  // Content
  description?: string
  images?: string[]
  // Specifications: array of "key: value" strings (same pattern as products)
  specifications?: string[]
  // Which products this part is compatible with (product _id strings or names)
  compatibleProducts?: string[]   // product IDs
  compatibleProductNames?: string[] // denormalized for display
  // Category of spare part
  category?: string
  // Pricing
  priceRange?: string
  // Media
  videoUrl?: string
  // Downloads
  downloads?: Array<{ label: string; url: string }>
  // SEO / Status
  isPublished?: boolean
  metaTitle?: string
  metaDescription?: string
  // Timestamps
  createdAt?: string
  updatedAt?: string
  order?: number
}

export type SparePartInput = Omit<SparePart, "_id" | "createdAt" | "updatedAt">
