export interface BlogPost {
  _id?: string;
  id?: string;
  order?: number;
  slug?: string; // Explicit SEO slug (overrides auto-generated title+id slug)
  title: string;
  excerpt: string;
  content: string;
  topImage: string;
  inlineImages: string[];
  category: string;
  author: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogInput {
  order?: number;
  slug?: string;
  title: string;
  excerpt: string;
  content: string;
  topImage: string;
  inlineImages: string[];
  category: string;
  author: string;
  isPublished: boolean;
}
