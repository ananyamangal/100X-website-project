export interface BlogPost {
  _id?: string;
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogInput {
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  isPublished: boolean;
}
