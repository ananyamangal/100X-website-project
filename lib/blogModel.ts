export interface BlogPost {
  _id?: string;
  id?: string;
  order?: number; // Display order (lower numbers appear first)
  title: string;
  excerpt: string;
  content: string;
  topImage: string; // Main image at the top
  inlineImages: string[]; // Images that appear within the blog content
  category: string;
  author: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogInput {
  order?: number;
  title: string;
  excerpt: string;
  content: string;
  topImage: string;
  inlineImages: string[];
  category: string;
  author: string;
  isPublished: boolean;
}
