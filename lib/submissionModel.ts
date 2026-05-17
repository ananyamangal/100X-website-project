export interface Submission {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
  type: 'contact' | 'brochure' | 'gem_popup';
  productName?: string;
  createdAt?: string;
  /** UTM/gclid/etc. captured when the lead was submitted */
  attribution?: Record<string, string>;
  form_page_url?: string;
  form_page_path?: string;
}