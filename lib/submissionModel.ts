export interface Submission {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
  type: 'contact' | 'brochure';
  productName?: string;
  createdAt?: string;
} 