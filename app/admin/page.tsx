"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  Eye,
  Settings,
  Package,
  BarChart3,
  Users,
  FileText,
  Star,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Image,
  Check,
  CheckCircle,
  Award,
  Tag,
  Video,
  Download,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  Activity,
  ClipboardCheck,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor"
import { BrandAssetsTab } from "@/components/admin/BrandAssetsTab"
import { HomepageContentTab } from "@/components/admin/HomepageContentTab"
import { CaseStudiesTab } from "@/components/admin/CaseStudiesTab"
import { DeploymentsTab } from "@/components/admin/DeploymentsTab"
import { VideosTab } from "@/components/admin/VideosTab"
import { LeadAnalyticsTab } from "@/components/admin/LeadAnalyticsTab"
import { CelebrityAssetsTab } from "@/components/admin/CelebrityAssetsTab"
import { HomepageSectionsTab } from "@/components/admin/HomepageSectionsTab"
import { BrochureLeadsTab } from "@/components/admin/BrochureLeadsTab"
import { SparePartsTab } from "@/components/admin/SparePartsTab"
import { ReviewsTab } from "@/components/admin/ReviewsTab"
import { SiteSettingsTab } from "@/components/admin/SiteSettingsTab"
import { ProductExperienceTab } from "@/components/admin/ProductExperienceTab"
import { ProcurementTab } from "@/components/admin/ProcurementTab"
import { AdminUserMenu, AdminSignOutButton } from "@/components/admin/AdminUserMenu"
import { ProductBadgesTab } from "@/components/admin/ProductBadgesTab"
import { CertificationsManagerTab } from "@/components/admin/CertificationsManagerTab"
import { MediaLibraryTab } from "@/components/admin/MediaLibraryTab"
import { SeoHealthTab } from "@/components/admin/SeoHealthTab"
import { ProductForm } from "@/components/admin/ProductForm"
import { plainTextFromHtml } from "@/lib/rich-text"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Cookies from 'js-cookie';

interface Product {
  _id?: string;
  id?: string;
  name: string;
  family?: string;
  imageUrl?: string;
  imageUrls?: string[];
  priceRange: string;
  rating: number;
  reviewsCount: number;
  shortDescription: string;
  detailedDescription: string;
  features: any[];
  specifications: any[];
  applications: any[];
  sections?: any[];
  badges: string[];
  youtubeLink?: string;
  whatsappMessageText: string;
  category: string;
  inStock: boolean;
  slideshowInterval?: number;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
  brochureUrl?: string;
  tagline?: string;
  heroVideoUrl?: string;
  problem?: string;
  solution?: string;
  certifications?: string[];
  certificationIds?: string[];
  performanceMetrics?: string[];
  ugcImages?: string[];
  filmChapters?: any[];
  boxContents?: any[];
  productFaqs?: Array<{ q: string; a: string }>;
  warrantyEnabled?: boolean;
  warrantyPeriod?: string;
  warrantyDescription?: string;
  warrantyIcon?: string;
  slug?: string;
  seoTitle?: string;
  metaDescription?: string;
  h1Title?: string;
  ogTitle?: string;
  ogDescription?: string;
  isPublished?: boolean;
}

interface Banner {
  _id?: string;
  id?: string;
  // Legacy: mirror of desktopBannerImage kept for back-compat readers.
  image?: string;
  desktopBannerImage?: string;
  tabletBannerImage?: string;
  mobileBannerImage?: string;
  desktopBannerAlt?: string;
  tabletBannerAlt?: string;
  mobileBannerAlt?: string;
  desktopBannerEnabled?: boolean;
  tabletBannerEnabled?: boolean;
  mobileBannerEnabled?: boolean;
  desktopFocalX?: number;
  desktopFocalY?: number;
  tabletFocalX?: number;
  tabletFocalY?: number;
  mobileFocalX?: number;
  mobileFocalY?: number;
  overlayOpacity?: number;
  textAlign?: "left" | "center" | "right";
  contentWidth?: "narrow" | "medium" | "wide";
  order: number;
  isActive: boolean;
  slideshowInterval?: number; // Time in milliseconds between slides
  createdAt?: string;
  updatedAt?: string;
}

interface Accreditation {
  _id?: string;
  id?: string;
  logo: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Customer {
  _id?: string;
  id?: string;
  logo: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BlogPost {
  _id?: string;
  id?: string;
  order?: number; // Display order (lower numbers appear first)
  slug?: string; // SEO-friendly URL slug (overrides auto-generated title+id slug)
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

function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Cookies.get('admin-token') === 'authenticated') {
      setIsAuthed(true);
    }
    setLoading(false);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (res.ok) {
        Cookies.set('admin-token', 'authenticated', { path: '/admin' });
        setIsAuthed(true);
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <form onSubmit={handlePasswordSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-xs">
          <h2 className="text-xl font-bold mb-4">Admin Login</h2>
          <input
            type="password"
            placeholder="Enter admin password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-4"
            required
          />
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Login</button>
          <div className="mt-4 text-center">
            <a href="/admin/login" className="text-sm text-blue-600 hover:text-blue-800 underline">
              Forgot Password? Use Growth OS login
            </a>
          </div>
        </form>
      </div>
    );
  }
  return <>{children}</>;
}

export default function AdminDashboard() {
  return <AdminAuthGate><AdminDashboardContent /></AdminAuthGate>;
}

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [products, setProducts] = useState<Product[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [accreditations, setAccreditations] = useState<Accreditation[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isAddingBanner, setIsAddingBanner] = useState(false)
  const [isAddingBlog, setIsAddingBlog] = useState(false)
  const [isAddingAccreditation, setIsAddingAccreditation] = useState(false)
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null)
  const [editingAccreditation, setEditingAccreditation] = useState<Accreditation | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBrochure, setUploadingBrochure] = useState(false)
  const [categories, setCategories] = useState<string[]>([
    "Vehicle mountable Fogging Machines",
    "Cold Foggers",
    "Agriculture Sprayers",
    "Power Weeders and Tillers",
    "Brush Cutter",
    "Lawn mower",
    "Water pumps",
    "Chain Saw",
    "Chaff Cutter",
    "seeders",
    "Trolleys",
  ])

  // Fetch products from API
  useEffect(() => {
    fetch("/api/admin/products")
      .then(res => res.json())
      .then(data => {
        setProducts(
          Array.isArray(data)
            ? data.map((p: any) => ({
                ...p,
                id: p._id,
                image: p.imageUrl || p.imageUrls?.[0] || '',
                price: p.priceRange,
                reviews: p.reviewsCount,
                description: p.shortDescription,
                whatsappText: p.whatsappMessageText,
              }))
            : []
        )
      })
  }, [])

  // Fetch banners from API
  useEffect(() => {
    fetch("/api/admin/banners")
      .then(res => res.json())
      .then(data => {
        setBanners(
          Array.isArray(data)
            ? data.map((b: any) => ({
                ...b,
                id: b._id,
              }))
            : []
        )
      })
  }, [])

  // Fetch blogs from API
  useEffect(() => {
    fetch("/api/admin/blogs")
      .then(res => res.json())
      .then(data => {
        setBlogs(
          Array.isArray(data)
            ? data.map((b: any) => ({
                ...b,
                id: typeof b?.id === 'string' ? b.id : typeof b?._id === 'string' ? b._id : String(b?._id ?? ''),
              }))
            : []
        )
      })
      .catch(error => {
        console.error("Error fetching blogs:", error);
        setBlogs([]);
      });
  }, [])

  // Fetch accreditations from API
  useEffect(() => {
    fetch("/api/admin/accreditations")
      .then(res => res.json())
      .then(data => {
        setAccreditations(
          Array.isArray(data)
            ? data.map((a: any) => ({
                ...a,
                id: a._id,
              }))
            : []
        )
      })
      .catch(error => {
        console.error("Error fetching accreditations:", error);
        setAccreditations([]);
      });
  }, [])

  // Fetch customers from API
  useEffect(() => {
    fetch("/api/admin/customers")
      .then(res => res.json())
      .then(data => {
        setCustomers(
          Array.isArray(data)
            ? data.map((c: any) => ({ ...c, id: c._id }))
            : []
        );
      })
      .catch(error => {
        console.error("Error fetching customers:", error);
        setCustomers([]);
      });
  }, [])

  // Fetch categories from DB (derived from products.distinct('category'))
  useEffect(() => {
    fetch("/api/admin/categories")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setCategories(data) })
      .catch(() => {})
  }, [])

  // Add product
  const handleAddProduct = async (newProduct: Omit<Product, "id" | "createdAt" | "updatedAt" | "_id">) => {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newProduct),
    })
    const created = await res.json()
    
    // Add the new product to state
    const updatedProducts = [...products, {
      ...created,
      id: created._id,
      image: created.imageUrl || created.imageUrls?.[0] || '',
      price: created.priceRange,
      reviews: created.reviewsCount,
      description: created.shortDescription,
      whatsappText: created.whatsappMessageText,
    }]
    setProducts(updatedProducts)
    
    // Refresh categories from DB to include any new category from the saved product
    if (newProduct.category && !categories.includes(newProduct.category)) {
      fetch("/api/admin/categories").then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d) }).catch(() => {})
    }

    setIsAddingProduct(false)
    setNotification({ type: 'success', message: `✅ Product "${newProduct.name}" created. Changes visible on site within ~1 minute.` })
    setTimeout(() => setNotification(null), 6000)
  }

  // Update product
  const handleUpdateProduct = async (updatedProduct: Product) => {
    const res = await fetch(`/api/admin/products/${updatedProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedProduct),
    })
    const updated = await res.json()

    // Get the old product to check if category changed
    const oldProduct = products.find(p => p.id === updatedProduct.id)

    // Update products state
    const updatedProducts = products.map(p => p.id === updated._id ? {
      ...updated,
      id: updated._id,
      image: updated.imageUrl || updated.imageUrls?.[0] || '',
      price: updated.priceRange,
      reviews: updated.reviewsCount,
      description: updated.shortDescription,
      whatsappText: updated.whatsappMessageText,
    } : p)
    setProducts(updatedProducts)

    // Refresh categories from DB
    fetch("/api/admin/categories").then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d) }).catch(() => {})

    setEditingProduct(null)
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    setNotification({ type: 'success', message: `✅ "${updatedProduct.name}" saved at ${now}. Changes visible on site within ~1 minute.` })
    setTimeout(() => setNotification(null), 6000)
  }

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      })
      
      // Remove the product from state and refresh categories
      const updatedProducts = products.filter(p => p.id !== productId)
      setProducts(updatedProducts)
      fetch("/api/admin/categories").then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d) }).catch(() => {})
    }
  }

  // Add banner
  const handleAddBanner = async (newBanner: Omit<Banner, "id" | "createdAt" | "updatedAt" | "_id">) => {
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newBanner),
    })
    const created = await res.json()
    setBanners([...banners, {
      ...created,
      id: created._id,
    }])
    setIsAddingBanner(false)
  }

  // Update banner
  const handleUpdateBanner = async (updatedBanner: Banner) => {
    const res = await fetch(`/api/admin/banners/${updatedBanner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedBanner),
    })
    const updated = await res.json()
    setBanners(banners.map(b => b.id === updated._id ? {
      ...updated,
      id: updated._id,
    } : b))
    setEditingBanner(null)
  }

  // Delete banner
  const handleDeleteBanner = async (bannerId: string) => {
    if (confirm("Are you sure you want to delete this banner?")) {
      await fetch(`/api/admin/banners/${bannerId}`, {
        method: "DELETE",
        credentials: "include",
      })
      setBanners(banners.filter(b => b.id !== bannerId))
    }
  }

  // Add blog
  const handleAddBlog = async (newBlog: Omit<BlogPost, "id" | "createdAt" | "updatedAt" | "_id">) => {
    try {
      const res = await fetch("/api/admin/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newBlog),
      })
      if (res.ok) {
        const created = await res.json()
        setBlogs([...blogs, {
          ...created,
          id: created._id,
        }])
        setIsAddingBlog(false)
        setNotification({type: 'success', message: 'Blog created successfully!'})
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({type: 'error', message: 'Failed to create blog'})
        setTimeout(() => setNotification(null), 3000)
      }
    } catch (error) {
      console.error("Error adding blog:", error)
      setNotification({type: 'error', message: 'Error creating blog'})
      setTimeout(() => setNotification(null), 3000)
    }
  }

  // Update blog
  const handleUpdateBlog = async (updatedBlog: BlogPost) => {
    // 1️⃣ Ensure the blog has an ID
    if (!updatedBlog.id) {
      console.error("Blog ID is missing! Cannot update.");
      setNotification({ type: 'error', message: 'Blog ID is missing' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
  
    try {
      // 2️⃣ Call the API with the correct blog ID
      const res = await fetch(`/api/admin/blogs/${updatedBlog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedBlog),
      });
  
      if (res.ok) {
        const updated = await res.json();
  
        // 3️⃣ Update blogs state with the new data
        const updId =
          typeof (updated as any)?.id === 'string'
            ? (updated as any).id
            : typeof updated._id === 'string'
              ? updated._id
              : String((updated as any)?._id ?? '')
        setBlogs(
          blogs.map((b) =>
            String(b.id) === String(updId)
              ? {
                  ...updated,
                  id: updId,
                  _id: updId,
                }
              : b,
          ),
        )
  
        setEditingBlog(null);
        setNotification({ type: 'success', message: 'Blog updated successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        const errData = await res.json();
        console.error("Failed to update blog:", errData);
        setNotification({ type: 'error', message: 'Failed to update blog' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("Error updating blog:", error);
      setNotification({ type: 'error', message: 'Error updating blog' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Delete blog
  const handleDeleteBlog = async (blogId: string) => {
    if (confirm("Are you sure you want to delete this blog post?")) {
      try {
        const res = await fetch(`/api/admin/blogs/${blogId}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (res.ok) {
          setBlogs(blogs.filter(b => b.id !== blogId))
          setNotification({type: 'success', message: 'Blog deleted successfully!'})
          setTimeout(() => setNotification(null), 3000)
        } else {
          setNotification({type: 'error', message: 'Failed to delete blog'})
          setTimeout(() => setNotification(null), 3000)
        }
      } catch (error) {
        console.error("Error deleting blog:", error)
        setNotification({type: 'error', message: 'Error deleting blog'})
        setTimeout(() => setNotification(null), 3000)
      }
    }
  }

  // Reorder blogs by drag/drop or move buttons
  const handleReorderBlogs = async (orderedBlogIds: string[]) => {
    const blogById = new Map(blogs.map((blog) => [String(blog.id), blog]))
    const reorderedBlogs = orderedBlogIds
      .map((id) => blogById.get(String(id)))
      .filter((blog): blog is BlogPost => Boolean(blog))

    if (reorderedBlogs.length !== blogs.length) {
      setNotification({ type: "error", message: "Unable to reorder all blogs. Please refresh and try again." })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    const previousBlogs = blogs
    const normalizedBlogs = reorderedBlogs.map((blog, index) => ({
      ...blog,
      order: index,
    }))
    setBlogs(normalizedBlogs)

    try {
      await Promise.all(
        normalizedBlogs.map((blog) =>
          fetch(`/api/admin/blogs/${blog.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ order: blog.order }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed updating order for blog ${blog.id}`)
          }),
        ),
      )
      setNotification({ type: "success", message: "Blog order updated successfully!" })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error reordering blogs:", error)
      setBlogs(previousBlogs)
      setNotification({ type: "error", message: "Failed to save blog order. Changes were reverted." })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  // Add accreditation
  const handleAddAccreditation = async (newAccreditation: Omit<Accreditation, "id" | "createdAt" | "updatedAt" | "_id">) => {
    try {
      const res = await fetch("/api/admin/accreditations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newAccreditation),
      })
      if (res.ok) {
        const created = await res.json()
        setAccreditations([...accreditations, {
          ...created,
          id: created._id,
        }])
        setIsAddingAccreditation(false)
        setNotification({type: 'success', message: 'Accreditation added successfully!'})
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({type: 'error', message: 'Failed to add accreditation'})
        setTimeout(() => setNotification(null), 3000)
      }
    } catch (error) {
      console.error("Error adding accreditation:", error)
      setNotification({type: 'error', message: 'Error adding accreditation'})
      setTimeout(() => setNotification(null), 3000)
    }
  }

  // Update accreditation
  const handleUpdateAccreditation = async (updatedAccreditation: Accreditation) => {
    if (!updatedAccreditation.id) {
      console.error("Accreditation ID is missing! Cannot update.");
      setNotification({ type: 'error', message: 'Accreditation ID is missing' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/accreditations/${updatedAccreditation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedAccreditation),
      })
      
      if (res.ok) {
        // Refetch to get updated order
        const fetchRes = await fetch("/api/admin/accreditations")
        const data = await fetchRes.json()
        setAccreditations(
          Array.isArray(data)
            ? data.map((a: any) => ({
                ...a,
                id: a._id,
              }))
            : []
        )
        setEditingAccreditation(null)
        setNotification({ type: 'success', message: 'Accreditation updated successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: 'error', message: 'Failed to update accreditation' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("Error updating accreditation:", error);
      setNotification({ type: 'error', message: 'Error updating accreditation' });
      setTimeout(() => setNotification(null), 3000);
    }
  }

  // Delete accreditation
  const handleDeleteAccreditation = async (accreditationId: string) => {
    if (confirm("Are you sure you want to delete this accreditation?")) {
      try {
        const res = await fetch(`/api/admin/accreditations/${accreditationId}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (res.ok) {
          // Refetch to get updated order
          const fetchRes = await fetch("/api/admin/accreditations")
          const data = await fetchRes.json()
          setAccreditations(
            Array.isArray(data)
              ? data.map((a: any) => ({
                  ...a,
                  id: a._id,
                }))
              : []
          )
          setNotification({type: 'success', message: 'Accreditation deleted successfully!'})
          setTimeout(() => setNotification(null), 3000)
        } else {
          setNotification({type: 'error', message: 'Failed to delete accreditation'})
          setTimeout(() => setNotification(null), 3000)
        }
      } catch (error) {
        console.error("Error deleting accreditation:", error)
        setNotification({type: 'error', message: 'Error deleting accreditation'})
        setTimeout(() => setNotification(null), 3000)
      }
    }
  }

  // Add customer
  const handleAddCustomer = async (newCustomer: Omit<Customer, "id" | "createdAt" | "updatedAt" | "_id">) => {
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        const created = await res.json();
        setCustomers([...customers, { ...created, id: created._id }]);
        setIsAddingCustomer(false);
        setNotification({ type: 'success', message: 'Customer added successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: 'error', message: 'Failed to add customer' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      setNotification({ type: 'error', message: 'Error adding customer' });
      setTimeout(() => setNotification(null), 3000);
    }
  }

  // Update customer
  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    if (!updatedCustomer.id) {
      setNotification({ type: 'error', message: 'Customer ID is missing' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    try {
      const res = await fetch(`/api/admin/customers/${updatedCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedCustomer),
      });
      if (res.ok) {
        const fetchRes = await fetch("/api/admin/customers");
        const data = await fetchRes.json();
        setCustomers(Array.isArray(data) ? data.map((c: any) => ({ ...c, id: c._id })) : []);
        setEditingCustomer(null);
        setNotification({ type: 'success', message: 'Customer updated successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: 'error', message: 'Failed to update customer' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      setNotification({ type: 'error', message: 'Error updating customer' });
      setTimeout(() => setNotification(null), 3000);
    }
  }

  // Delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          const fetchRes = await fetch("/api/admin/customers");
          const data = await fetchRes.json();
          setCustomers(Array.isArray(data) ? data.map((c: any) => ({ ...c, id: c._id })) : []);
          setNotification({ type: 'success', message: 'Customer deleted successfully!' });
          setTimeout(() => setNotification(null), 3000);
        } else {
          setNotification({ type: 'error', message: 'Failed to delete customer' });
          setTimeout(() => setNotification(null), 3000);
        }
      } catch (error) {
        console.error("Error deleting customer:", error);
        setNotification({ type: 'error', message: 'Error deleting customer' });
        setTimeout(() => setNotification(null), 3000);
      }
    }
  }

  // Add new category to local state (becomes permanent once a product uses it)
  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.localeCompare(b)))
    }
  }

  const [normPct, setNormPct] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/admin/migrate")
      .then(res => res.json())
      .then(data => {
        if (data?.normalizationScore?.pct !== undefined) {
          setNormPct(data.normalizationScore.pct)
        }
      })
      .catch(() => {})
  }, [])

  const stats = {
    totalProducts: products.length,
    averageRating: products.length > 0 ? (products.reduce((acc, p) => acc + (Number(p.rating) || 0), 0) / products.length).toFixed(1) : '0.0',
    totalReviews: products.reduce((acc, p) => acc + (Number(p.reviewsCount) || 0), 0).toString(),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        } animate-slide-in`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <X size={20} />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">100X</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage your equipment catalog</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => window.open("/", "_blank")} className="bg-transparent">
                <Eye className="mr-2" size={16} />
                View Website
              </Button>
              <AdminUserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Normalization Warning Banner */}
      {normPct !== null && normPct < 100 && (
        <div className={`border-b px-4 py-2.5 text-sm font-medium flex items-center justify-between ${
          normPct >= 75 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>
            ⚠ Data normalization is at <strong>{normPct}%</strong> — resolve all migration issues before adding new features.
          </span>
          <button
            onClick={() => setActiveTab("migration")}
            className={`text-xs underline underline-offset-2 hover:no-underline ${
              normPct >= 75 ? 'text-amber-700' : 'text-red-700'
            }`}
          >
            View Migration Dashboard →
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BarChart3 className="mr-3" size={20} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("products")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "products"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Package className="mr-3" size={20} />
                Products
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "analytics"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Users className="mr-3" size={20} />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("content")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "content"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileText className="mr-3" size={20} />
                Content
              </button>
              <button
                onClick={() => setActiveTab("banners")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "banners"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Image className="mr-3" size={20} />
                Banners
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "categories"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Package className="mr-3" size={20} />
                Categories
              </button>
              <button
                onClick={() => setActiveTab("blogs")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "blogs"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileText className="mr-3" size={20} />
                Blogs
              </button>
              <button
                onClick={() => setActiveTab("submissions")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "submissions"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileText className="mr-3" size={20} />
                Submissions
              </button>
              <button
                onClick={() => setActiveTab("accreditations")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "accreditations"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Award className="mr-3" size={20} />
                Accreditations
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "customers"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Users className="mr-3" size={20} />
                Our Customers
              </button>
              <button
                onClick={() => setActiveTab("aboutUs")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "aboutUs"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Award className="mr-3" size={20} />
                About Us Page
              </button>
              <button
                onClick={() => setActiveTab("videoPopup")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "videoPopup"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Video className="mr-3" size={20} />
                Video Popup
              </button>
              <button
                onClick={() => setActiveTab("brochure")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "brochure"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Download className="mr-3" size={20} />
                Brochure
              </button>
              <button
                onClick={() => setActiveTab("brochureLeads")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "brochureLeads"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Download className="mr-3" size={20} />
                Brochure Leads
              </button>
              <button
                onClick={() => setActiveTab("rfqPopup")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "rfqPopup"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileText className="mr-3" size={20} />
                RFQ Popup
              </button>
              <button
                onClick={() => setActiveTab("homepageContent")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "homepageContent"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileText className="mr-3" size={20} />
                Homepage Content
              </button>
              <button
                onClick={() => setActiveTab("trustBadges")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "trustBadges"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <CheckCircle className="mr-3" size={20} />
                Footer Trust Badges
              </button>
              <button
                onClick={() => setActiveTab("websiteSettings")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "websiteSettings"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ImageIcon className="mr-3" size={20} />
                Website Settings
              </button>
              <button
                onClick={() => setActiveTab("legalPages")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "legalPages"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileText className="mr-3" size={20} />
                Legal Pages
              </button>
              <button
                onClick={() => setActiveTab("caseStudies")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "caseStudies"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Star className="mr-3" size={20} />
                Case Studies
              </button>
              <button
                onClick={() => setActiveTab("spareParts")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "spareParts"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Package className="mr-3" size={20} />
                Spare Parts
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "reviews"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Star className="mr-3" size={20} />
                Reviews
              </button>
              <button
                onClick={() => setActiveTab("siteSettings")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "siteSettings"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Settings className="mr-3" size={20} />
                Site Settings
              </button>
              <button
                onClick={() => setActiveTab("deployments")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "deployments"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Package className="mr-3" size={20} />
                Deployments
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "videos"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Video className="mr-3" size={20} />
                Videos
              </button>
              <button
                onClick={() => setActiveTab("leadAnalytics")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "leadAnalytics"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BarChart3 className="mr-3" size={20} />
                Lead Analytics
              </button>
              <button
                onClick={() => setActiveTab("celebrityAssets")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "celebrityAssets"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Star className="mr-3" size={20} />
                Celebrity Assets
              </button>
              <button
                onClick={() => setActiveTab("homepageSections")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "homepageSections"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ImageIcon className="mr-3" size={20} />
                Homepage Sections
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "settings"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Settings className="mr-3" size={20} />
                Settings
              </button>
              <button
                onClick={() => setActiveTab("procurement")}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === "procurement"
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                GeM Intelligence
              </button>
              {/* CMS Foundation */}
              <div className="pt-2 mt-2 border-t border-gray-200">
                <p className="px-4 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">CMS</p>
                <button
                  onClick={() => setActiveTab("productBadges")}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === "productBadges"
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Tag className="mr-3" size={20} />
                  Product Badges
                </button>
                <button
                  onClick={() => setActiveTab("certifications")}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === "certifications"
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Award className="mr-3" size={20} />
                  Certifications
                </button>
                <button
                  onClick={() => setActiveTab("mediaLibrary")}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === "mediaLibrary"
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <ImageIcon className="mr-3" size={20} />
                  Media Library
                </button>
                <button
                  onClick={() => setActiveTab("migration")}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === "migration"
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <ArrowUp className="mr-3" size={20} />
                  Migration
                </button>
                <button
                  onClick={() => setActiveTab("seoHealth")}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === "seoHealth"
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Search className="mr-3" size={20} />
                  SEO Health
                </button>
                <a
                  href="/admin/system-health"
                  className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <Activity className="mr-3" size={20} />
                  System Health
                </a>
                <a
                  href="/admin/catalog-audit"
                  className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <ClipboardCheck className="mr-3" size={20} />
                  Catalog Audit
                </a>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-200">
                <a
                  href="/admin/growth"
                  className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors bg-gray-900 text-green-400 hover:bg-gray-800 font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Growth OS ↗
                </a>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-200">
                <AdminSignOutButton className="w-full px-4 py-3 text-left rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 text-sm font-medium" />
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "dashboard" && <DashboardTab stats={stats} products={products} />}
            {activeTab === "products" && (
              <ProductsTab
                products={products}
                categories={categories}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddCategory={handleAddCategory}
                isAddingProduct={isAddingProduct}
                setIsAddingProduct={setIsAddingProduct}
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                expandedProduct={expandedProduct}
                setExpandedProduct={setExpandedProduct}
              />
            )}
            {activeTab === "analytics" && <AnalyticsTab products={products} />}
            {activeTab === "banners" && (
              <BannersTab
                banners={banners}
                onAddBanner={handleAddBanner}
                onUpdateBanner={handleUpdateBanner}
                onDeleteBanner={handleDeleteBanner}
                isAddingBanner={isAddingBanner}
                setIsAddingBanner={setIsAddingBanner}
                editingBanner={editingBanner}
                setEditingBanner={setEditingBanner}
              />
            )}
            {activeTab === "content" && <ContentTab setActiveTab={setActiveTab} />}
            {activeTab === "categories" && (
              <CategoriesTab
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={(categoryToDelete) => {
                  const updatedCategories = categories.filter(cat => cat !== categoryToDelete)
                  setCategories(updatedCategories)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('admin-categories', JSON.stringify(updatedCategories))
                    // Dispatch custom event to notify other components
                    window.dispatchEvent(new Event('categoriesUpdated'))
                  }
                }}
              />
            )}
            {activeTab === "blogs" && (
              <BlogsTab
                blogs={blogs}
                onAddBlog={handleAddBlog}
                onUpdateBlog={handleUpdateBlog}
                onDeleteBlog={handleDeleteBlog}
                onReorderBlogs={handleReorderBlogs}
                isAddingBlog={isAddingBlog}
                setIsAddingBlog={setIsAddingBlog}
                editingBlog={editingBlog}
                setEditingBlog={setEditingBlog}
              />
            )}
            {activeTab === "submissions" && <SubmissionsTab />}
            {activeTab === "accreditations" && (
              <AccreditationsTab
                accreditations={accreditations}
                onAddAccreditation={handleAddAccreditation}
                onUpdateAccreditation={handleUpdateAccreditation}
                onDeleteAccreditation={handleDeleteAccreditation}
                isAddingAccreditation={isAddingAccreditation}
                setIsAddingAccreditation={setIsAddingAccreditation}
                editingAccreditation={editingAccreditation}
                setEditingAccreditation={setEditingAccreditation}
              />
            )}
            {activeTab === "customers" && (
              <CustomersTab
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                isAddingCustomer={isAddingCustomer}
                setIsAddingCustomer={setIsAddingCustomer}
                editingCustomer={editingCustomer}
                setEditingCustomer={setEditingCustomer}
              />
            )}
            {activeTab === "aboutUs" && <AboutUsTab />}
            {activeTab === "videoPopup" && <VideoPopupTab />}
            {activeTab === "brochure" && <BrochureTab />}
            {activeTab === "brochureLeads" && <BrochureLeadsTab />}
            {activeTab === "rfqPopup" && <RFQPopupAdminTab />}
            {activeTab === "homepageContent" && <HomepageContentTab />}
            {activeTab === "websiteSettings" && <BrandAssetsTab />}
            {activeTab === "trustBadges" && <TrustBadgesTab />}
            {activeTab === "legalPages" && <LegalPagesTab />}
            {activeTab === "caseStudies" && <CaseStudiesTab />}
            {activeTab === "deployments" && <DeploymentsTab />}
            {activeTab === "videos" && <VideosTab />}
            {activeTab === "leadAnalytics" && <LeadAnalyticsTab />}
            {activeTab === "celebrityAssets" && <CelebrityAssetsTab />}
            {activeTab === "homepageSections" && <HomepageSectionsTab />}
            {activeTab === "spareParts" && <SparePartsTab />}
            {activeTab === "reviews" && <ReviewsTab />}
            {activeTab === "siteSettings" && <SiteSettingsTab />}
            {activeTab === "settings" && <SettingsTab />}
            {activeTab === "procurement" && <ProcurementTab />}
            {activeTab === "productBadges" && <ProductBadgesTab />}
            {activeTab === "certifications" && <CertificationsManagerTab />}
            {activeTab === "mediaLibrary" && <MediaLibraryTab />}
            {activeTab === "seoHealth" && <SeoHealthTab />}
            {activeTab === "migration" && <MigrationTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Dashboard Tab Component
function DashboardTab({ stats, products }: { stats: any; products: Product[] }) {
  const recentProducts = products.slice(-3).reverse()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Monitor your product catalog and performance metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="text-blue-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.averageRating}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="text-yellow-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalReviews}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="text-purple-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProducts.map((product, index) => (
              <div key={product.id || product._id || index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <img
                  src={typeof product.imageUrls?.[0] === 'string' ? product.imageUrls?.[0] || '/placeholder.svg' : '/placeholder.svg'}
                  alt={typeof product.name === 'string' ? product.name || 'Product Image' : 'Product Image'}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.priceRange}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(product.badges || []).slice(0, 2).map((badge, index) => (
                    <Badge
                      key={index}
                      className={`${
                        badge === "Best Seller"
                          ? "bg-red-100 text-red-800"
                          : badge === "Eco-Friendly"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {badge}
                    </Badge>
                  ))}
                  {(product.badges || []).length > 2 && (
                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                      +{(product.badges || []).length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Products Tab Component
function ProductsTab({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  isAddingProduct,
  setIsAddingProduct,
  editingProduct,
  setEditingProduct,
  expandedProduct,
  setExpandedProduct,
}: {
  products: Product[]
  categories: string[]
  onAddProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onUpdateProduct: (product: Product) => void
  onDeleteProduct: (id: string) => void
  onAddCategory: (category: string) => void
  isAddingProduct: boolean
  setIsAddingProduct: (value: boolean) => void
  editingProduct: Product | null
  setEditingProduct: (product: Product | null) => void
  expandedProduct: string | null
  setExpandedProduct: (id: string | null) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h2>
          <p className="text-gray-600">Add, edit, and manage your equipment catalog</p>
        </div>
        <Button onClick={() => setIsAddingProduct(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="mr-2" size={16} />
          Add Product
        </Button>
      </div>

      {/* Add/Edit Product Form */}
      {(isAddingProduct || editingProduct) && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onAddCategory={onAddCategory}
          onSave={editingProduct ? onUpdateProduct : onAddProduct}
          onCancel={() => {
            setIsAddingProduct(false)
            setEditingProduct(null)
          }}
        />
      )}

      {/* Products List */}
      <div className="space-y-4">
        {products
          .sort((a, b) => {
            // Sort by order first (lower numbers first), then by creation date if order is same
            const orderA = a.order !== undefined ? a.order : Infinity;
            const orderB = b.order !== undefined ? b.order : Infinity;
            if (orderA !== orderB) return orderA - orderB;
            // If orders are equal, newest first
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          })
          .map((product, index) => (
          <Card key={product.id || product._id || index} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <img
                    src={typeof product.imageUrls?.[0] === 'string' ? product.imageUrls?.[0] || '/placeholder.svg' : '/placeholder.svg'}
                    alt={typeof product.name === 'string' ? product.name || 'Product Image' : 'Product Image'}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                      {product.isPublished === false && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Draft</span>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {(product.badges || []).slice(0, 3).map((badge, index) => (
                          <Badge
                            key={index}
                            className={`${
                              badge === "Best Seller"
                                ? "bg-red-100 text-red-800"
                                : badge === "Eco-Friendly"
                                  ? "bg-green-100 text-green-800"
                                  : badge === "New Launch"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {badge}
                          </Badge>
                        ))}
                        {(product.badges || []).length > 3 && (
                          <Badge className="bg-gray-100 text-gray-600">
                            +{(product.badges || []).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-2 line-clamp-2">{plainTextFromHtml(product.shortDescription || "")}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-semibold text-green-600">{product.priceRange}</span>
                      <span className="flex items-center">
                        <Star className="text-yellow-400 fill-current mr-1" size={14} />
                        {product.rating} ({product.reviewsCount} reviews)
                      </span>
                      <span>Category: {product.category}</span>
                      <span className="font-semibold text-blue-600">Order: {product.order !== undefined ? product.order : 'Top'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedProduct(expandedProduct === (product.id ?? "") ? null : (product.id ?? null))}
                    className="bg-transparent"
                  >
                    {expandedProduct === (product.id ?? "") ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingProduct(product)}
                    className="bg-transparent"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteProduct(product.id ?? product._id ?? "")}
                    className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedProduct === (product.id ?? "") && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Features</h4>
                      <ul className="space-y-1">
                        {product.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Specifications</h4>
                      <ul className="space-y-1">
                        {product.specifications.slice(0, 3).map((spec, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            {spec}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Applications</h4>
                      <ul className="space-y-1">
                        {product.applications.slice(0, 3).map((app, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                            {app}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

const ISSUE_LABELS: Record<string, { label: string; color: string }> = {
  'legacy-features':    { label: 'Legacy Features',    color: 'bg-orange-100 text-orange-700' },
  'legacy-specs':       { label: 'Legacy Specs',        color: 'bg-orange-100 text-orange-700' },
  'legacy-apps':        { label: 'Legacy Apps',         color: 'bg-orange-100 text-orange-700' },
  'duplicate-specs':    { label: 'Duplicate Specs',     color: 'bg-red-100 text-red-700' },
  'duplicate-features': { label: 'Duplicate Features',  color: 'bg-red-100 text-red-700' },
  'duplicate-apps':     { label: 'Duplicate Apps',      color: 'bg-red-100 text-red-700' },
  'unmatched-badges':   { label: 'Badge not in CMS',    color: 'bg-yellow-100 text-yellow-700' },
  'legacy-certs':       { label: 'Legacy Certs',        color: 'bg-blue-100 text-blue-700' },
  'missing-cert-ids':   { label: 'No CMS Cert IDs',     color: 'bg-blue-100 text-blue-700' },
  'empty-features':     { label: 'No Features',         color: 'bg-gray-100 text-gray-500' },
  'empty-specs':        { label: 'No Specs',            color: 'bg-gray-100 text-gray-500' },
  'empty-apps':         { label: 'No Apps',             color: 'bg-gray-100 text-gray-500' },
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className={`p-4 rounded-xl border text-center ${color || 'bg-gray-50 border-gray-200'}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
      {sub && <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}

function FieldBar({ label, migrated, legacy, empty, total, withDupes }: { label: string; migrated: number; legacy: number; empty: number; total: number; withDupes?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs font-medium text-gray-600 text-right flex-shrink-0">{label}</div>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
        {migrated > 0 && <div style={{ width: `${(migrated / total) * 100}%` }} className="bg-green-400 h-full" title={`${migrated} migrated`} />}
        {legacy > 0 && <div style={{ width: `${(legacy / total) * 100}%` }} className="bg-orange-400 h-full" title={`${legacy} legacy`} />}
        {empty > 0 && <div style={{ width: `${(empty / total) * 100}%` }} className="bg-gray-300 h-full" title={`${empty} empty`} />}
      </div>
      <div className="text-xs text-gray-500 flex-shrink-0 w-40 text-left">
        <span className="text-green-600 font-medium">{migrated}✓</span>
        {legacy > 0 && <span className="text-orange-600 ml-1">{legacy} legacy</span>}
        {empty > 0 && <span className="text-gray-400 ml-1">{empty} empty</span>}
        {(withDupes ?? 0) > 0 && <span className="text-red-500 ml-1">{withDupes} dupes</span>}
      </div>
    </div>
  )
}

// Migration Tab Component
function MigrationTab() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [deduping, setDeduping] = useState(false)
  const [dedupingFeatures, setDedupingFeatures] = useState(false)
  const [dedupingApps, setDedupingApps] = useState(false)
  const [seedingBadges, setSeedingBadges] = useState(false)
  const [seedingCerts, setSeedingCerts] = useState(false)
  const [cleaningEntities, setCleaningEntities] = useState(false)
  const [buildingRelationships, setBuildingRelationships] = useState(false)
  const [spAudit, setSpAudit] = useState<any>(null)
  const [runningSpAudit, setRunningSpAudit] = useState(false)
  const [migratingCerts, setMigratingCerts] = useState(false)
  const [certMigResult, setCertMigResult] = useState<any>(null)
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [showSsot, setShowSsot] = useState(false)

  const notify = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg }); setTimeout(() => setNotification(null), 7000)
  }

  const loadHealth = async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/migrate")
      if (!r.ok) return
      const data = await r.json()

      // Auto-seed if CMS is empty and there are products to seed from
      let needsReload = false
      if (data.cms.badgesInCms === 0 && data.summary.total > 0) {
        await fetch("/api/admin/product-badges/seed", { method: "POST" }).catch(() => {})
        notify("success", "Badge CMS was empty — auto-seeded from existing products.")
        needsReload = true
      }
      if (data.cms.certificationsInCms === 0 && data.summary.total > 0) {
        await fetch("/api/admin/certifications/seed", { method: "POST" }).catch(() => {})
        notify("success", "Certification CMS was empty — auto-seeded from existing products.")
        needsReload = true
      }

      if (needsReload) {
        const r2 = await fetch("/api/admin/migrate")
        if (r2.ok) setHealth(await r2.json())
      } else {
        setHealth(data)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { loadHealth() }, [])

  const runMigration = async () => {
    if (!confirm("Run migration? Converts legacy string arrays → structured CMS objects. Already-structured products are skipped (idempotent).")) return
    setMigrating(true)
    try {
      const r = await fetch("/api/admin/migrate", { method: "POST" })
      const d = await r.json()
      notify("success", `Migration done: ${d.migratedCount} updated, ${d.skippedCount} skipped. Features: ${d.byField?.features}, Specs: ${d.byField?.specs}, Apps: ${d.byField?.apps}.`)
      loadHealth()
    } catch { notify("error", "Migration failed.") }
    finally { setMigrating(false) }
  }

  const runDedup = async () => {
    if (!confirm("Remove duplicate specs from all products?")) return
    setDeduping(true)
    try {
      const r = await fetch("/api/admin/migrate?action=dedup-specs", { method: "POST" })
      const d = await r.json()
      notify("success", `Dedup specs: ${d.repairedCount} products repaired.`)
      loadHealth()
    } catch { notify("error", "Spec dedup failed.") }
    finally { setDeduping(false) }
  }

  const runDedupFeatures = async () => {
    setDedupingFeatures(true)
    try {
      const r = await fetch("/api/admin/migrate?action=dedup-features", { method: "POST" })
      const d = await r.json()
      notify("success", `Dedup features: ${d.repairedCount} products repaired.`)
      loadHealth()
    } catch { notify("error", "Feature dedup failed.") }
    finally { setDedupingFeatures(false) }
  }

  const runDedupApps = async () => {
    setDedupingApps(true)
    try {
      const r = await fetch("/api/admin/migrate?action=dedup-apps", { method: "POST" })
      const d = await r.json()
      notify("success", `Dedup apps: ${d.repairedCount} products repaired.`)
      loadHealth()
    } catch { notify("error", "App dedup failed.") }
    finally { setDedupingApps(false) }
  }

  const runSeedBadges = async () => {
    setSeedingBadges(true)
    try {
      const r = await fetch("/api/admin/product-badges/seed", { method: "POST" })
      const d = await r.json()
      notify("success", `Badges: ${d.created} created, ${d.skipped} already existed.`)
      loadHealth()
    } catch { notify("error", "Badge seed failed.") }
    finally { setSeedingBadges(false) }
  }

  const runSeedCerts = async () => {
    setSeedingCerts(true)
    try {
      const r = await fetch("/api/admin/certifications/seed", { method: "POST" })
      const d = await r.json()
      notify("success", `Certifications: ${d.created} created, ${d.skipped} already existed.`)
      loadHealth()
    } catch { notify("error", "Cert seed failed.") }
    finally { setSeedingCerts(false) }
  }

  const runMigrateCerts = async () => {
    if (!confirm("Migrate legacy cert strings → CMS cert IDs?\n\nThis will:\n• Populate certificationIds[] from CMS matches\n• Clear the deprecated certifications[] field\n• Recalculate normalization\n\nThis is reversible via the product editor.")) return
    setMigratingCerts(true)
    try {
      const r = await fetch("/api/admin/migrate?action=migrate-certs", { method: "POST" })
      const d = await r.json()
      setCertMigResult(d)
      const unmatchedMsg = d.unmatched?.length > 0 ? ` Unmatched: ${d.unmatched.join(", ")}.` : ""
      notify("success", `Cert migration: ${d.migrated} products migrated, ${d.skipped} skipped.${unmatchedMsg}`)
      loadHealth()
    } catch { notify("error", "Cert migration failed.") }
    finally { setMigratingCerts(false) }
  }

  const runCleanEntities = async () => {
    if (!confirm("Decode HTML entities (&nbsp; &amp; etc.) stored literally in badge names? This repairs CMS records and product badge arrays.")) return
    setCleaningEntities(true)
    try {
      const r = await fetch("/api/admin/migrate?action=clean-entities", { method: "POST" })
      const d = await r.json()
      notify("success", d.message || "Entity cleanup complete.")
      loadHealth()
    } catch { notify("error", "Entity cleanup failed.") }
    finally { setCleaningEntities(false) }
  }

  const runBuildRelationships = async () => {
    if (!confirm("Auto-assign assembly groups and build relatedParts / frequentlyBoughtTogether for all spare parts? Safe to re-run.")) return
    setBuildingRelationships(true)
    try {
      const r = await fetch("/api/admin/migrate?action=build-part-relationships", { method: "POST" })
      const d = await r.json()
      const groupSummary = Object.entries(d.groups || {}).map(([k, v]) => `${k}:${v}`).join(", ")
      notify("success", `${d.message} | Groups: ${groupSummary}`)
    } catch { notify("error", "Relationship build failed.") }
    finally { setBuildingRelationships(false) }
  }

  const runSparePartsAudit = async () => {
    setRunningSpAudit(true)
    try {
      const r = await fetch("/api/admin/migrate?action=spare-parts-audit", { method: "POST" })
      const d = await r.json()
      setSpAudit(d)
    } catch { notify("error", "Spare parts audit failed.") }
    finally { setRunningSpAudit(false) }
  }

  const total = health?.summary?.total || 0
  const productRows: any[] = health?.products || []
  const problemProducts = productRows.filter((p: any) => p.issues.length > 0)
  const displayProducts = showAllProducts ? productRows : problemProducts.slice(0, 20)
  const normPct: number = health?.normalizationScore?.pct ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Migration Health Dashboard</h2>
          <p className="text-gray-600 mt-1">Normalize to a single source of truth before building new features.</p>
        </div>
        <Button variant="outline" onClick={loadHealth} disabled={loading} className="text-sm">
          {loading ? "Loading…" : "Refresh Report"}
        </Button>
      </div>

      {/* Overall normalization score */}
      {health && (
        <div className={`p-4 rounded-xl border-2 ${normPct === 100 ? 'bg-green-50 border-green-300' : normPct >= 75 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900 text-sm">Normalization Progress</span>
            <span className={`text-2xl font-bold ${normPct === 100 ? 'text-green-700' : normPct >= 75 ? 'text-amber-700' : 'text-red-700'}`}>{normPct}%</span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden border border-gray-200">
            <div
              className={`h-full rounded-full transition-all ${normPct === 100 ? 'bg-green-500' : normPct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${normPct}%` }}
            />
          </div>
          {normPct < 100 && (
            <p className="text-xs text-gray-600 mt-2">
              {health.normalizationScore?.fullyNormalized ?? 0} of {total} products fully normalized. Fix all issues below before building new features.
            </p>
          )}
          {normPct === 100 && (
            <p className="text-xs text-green-700 font-medium mt-2">All products fully normalized. Ready to build new features.</p>
          )}
        </div>
      )}

      {notification && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${notification.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {notification.msg}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={runMigration} disabled={migrating} className="bg-orange-600 hover:bg-orange-700 text-sm">
          {migrating ? "Migrating…" : "Run Migration (Features/Specs/Apps)"}
        </Button>
        <Button onClick={runDedup} disabled={deduping} variant="outline" className="text-sm border-red-300 text-red-700 hover:bg-red-50">
          {deduping ? "Deduping…" : "Dedup Specs"}
        </Button>
        <Button onClick={runDedupFeatures} disabled={dedupingFeatures} variant="outline" className="text-sm border-red-300 text-red-700 hover:bg-red-50">
          {dedupingFeatures ? "Deduping…" : "Dedup Features"}
        </Button>
        <Button onClick={runDedupApps} disabled={dedupingApps} variant="outline" className="text-sm border-red-300 text-red-700 hover:bg-red-50">
          {dedupingApps ? "Deduping…" : "Dedup Apps"}
        </Button>
        <Button onClick={runSeedBadges} disabled={seedingBadges} variant="outline" className="text-sm">
          {seedingBadges ? "Seeding…" : "Seed Badge CMS"}
        </Button>
        <Button onClick={runSeedCerts} disabled={seedingCerts} variant="outline" className="text-sm">
          {seedingCerts ? "Seeding…" : "Seed Certification CMS"}
        </Button>
        <Button onClick={runMigrateCerts} disabled={migratingCerts} variant="outline" className="text-sm border-orange-400 text-orange-700 hover:bg-orange-50">
          {migratingCerts ? "Migrating Certs…" : "Migrate Legacy Certs → CMS IDs"}
        </Button>
        <Button onClick={runCleanEntities} disabled={cleaningEntities} variant="outline" className="text-sm border-purple-300 text-purple-700 hover:bg-purple-50">
          {cleaningEntities ? "Cleaning…" : "Clean HTML Entities"}
        </Button>
        <Button onClick={runBuildRelationships} disabled={buildingRelationships} variant="outline" className="text-sm border-green-400 text-green-700 hover:bg-green-50">
          {buildingRelationships ? "Building…" : "Build Spare Part Relationships"}
        </Button>
        <Button onClick={runSparePartsAudit} disabled={runningSpAudit} variant="outline" className="text-sm border-teal-400 text-teal-700 hover:bg-teal-50">
          {runningSpAudit ? "Auditing…" : "Spare Parts Audit"}
        </Button>
      </div>

      {/* Spare Parts Audit Results */}
      {spAudit && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-700 text-teal-900">Spare Parts Audit</h3>
            <button onClick={() => setSpAudit(null)} className="text-teal-400 hover:text-teal-700 text-xs">Dismiss</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg p-2 text-center border border-teal-100">
              <p className="text-xl font-bold text-teal-700">{spAudit.summary?.total}</p>
              <p className="text-xs text-gray-500">Total Parts</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-teal-100">
              <p className="text-xl font-bold text-green-600">{spAudit.summary?.published}</p>
              <p className="text-xs text-gray-500">Published</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-teal-100">
              <p className="text-xl font-bold text-amber-600">{spAudit.summary?.unpublished}</p>
              <p className="text-xs text-gray-500">Unpublished</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(spAudit.issues || {}).map(([k, v]) => (
              <div key={k} className={`flex justify-between px-2 py-1 rounded ${Number(v) > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                <span>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                <span className="font-700">{String(v)}</span>
              </div>
            ))}
          </div>
          {spAudit.details?.slugAnomalies?.length > 0 && (
            <div>
              <p className="font-600 text-red-700 mb-1">Slug anomalies:</p>
              {spAudit.details.slugAnomalies.map((a: any, i: number) => (
                <p key={i} className="text-xs text-red-600 font-mono">{a.name}: slug="{a.slug}" expected="{a.expected}"</p>
              ))}
            </div>
          )}
          {spAudit.details?.orphanedParts?.length > 0 && (
            <div>
              <p className="font-600 text-red-700 mb-1">Orphaned parts (no compatible products):</p>
              {spAudit.details.orphanedParts.map((p: any, i: number) => (
                <p key={i} className="text-xs text-red-600">{p.name} ({p.slug})</p>
              ))}
            </div>
          )}
        </div>
      )}

      {certMigResult && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-orange-900">Cert Migration Results</h3>
            <button onClick={() => setCertMigResult(null)} className="text-orange-400 hover:text-orange-700 text-xs">Dismiss</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg p-2 text-center border border-orange-100">
              <p className="text-xl font-bold text-orange-700">{certMigResult.migrated}</p>
              <p className="text-xs text-gray-500">Migrated</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-orange-100">
              <p className="text-xl font-bold text-gray-500">{certMigResult.skipped}</p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-orange-100">
              <p className={`text-xl font-bold ${certMigResult.unmatched?.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{certMigResult.unmatched?.length ?? 0}</p>
              <p className="text-xs text-gray-500">Unmatched Cert Strings</p>
            </div>
          </div>
          {certMigResult.unmatched?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-2 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-1">Unmatched (no CMS cert found — add manually):</p>
              {certMigResult.unmatched.map((u: string, i: number) => (
                <span key={i} className="inline-block text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-1 mb-1">{u}</span>
              ))}
            </div>
          )}
          <div className="max-h-40 overflow-y-auto divide-y divide-orange-100 rounded border border-orange-100">
            {certMigResult.perProduct?.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-2 py-1 text-xs">
                <span className="text-gray-700 truncate mr-2">{r.name}</span>
                <span className={`flex-shrink-0 font-medium ${r.action === 'migrated' ? 'text-green-700' : 'text-gray-400'}`}>
                  {r.action === 'migrated' ? `${r.matched} IDs linked` : r.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {health && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Products" value={total} color="bg-gray-50 border-gray-200 text-gray-800" />
            <StatCard label="Fully Migrated" value={health.summary.fullyMigrated}
              sub={`${Math.round((health.summary.fullyMigrated / Math.max(total, 1)) * 100)}%`}
              color="bg-green-50 border-green-200 text-green-800" />
            <StatCard label="Partially Migrated" value={health.summary.partiallyMigrated} color="bg-amber-50 border-amber-200 text-amber-800" />
            <StatCard label="Legacy (no migration)" value={health.summary.legacy} color="bg-red-50 border-red-200 text-red-800" />
          </div>

          {/* CMS health */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Badges in CMS" value={health.cms.badgesInCms} color="bg-blue-50 border-blue-200 text-blue-800" />
            <StatCard label="Certs in CMS" value={health.cms.certificationsInCms} color="bg-blue-50 border-blue-200 text-blue-800" />
            <StatCard label="Unmatched Badges" value={health.fields.badges.productsWithUnmatched} color="bg-yellow-50 border-yellow-200 text-yellow-800" />
            <StatCard label="Legacy Cert Strings" value={health.fields.certs.productsWithLegacy} color="bg-yellow-50 border-yellow-200 text-yellow-800" />
          </div>

          {/* Field migration bars */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Field Migration Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4 text-[11px] mb-2">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" />Migrated</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" />Legacy strings</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" />Empty</span>
              </div>
              <FieldBar label="Features"     {...health.fields.features} total={total} withDupes={health.fields.features.withDuplicates} />
              <FieldBar label="Specs"        {...health.fields.specs}    total={total} withDupes={health.fields.specs.withDuplicates} />
              <FieldBar label="Applications" {...health.fields.apps}     total={total} withDupes={health.fields.apps.withDuplicates} />
              <div className="text-xs text-gray-500 pt-1">
                FAQs: {health.fields.faqs.withFaqs} products have FAQs, {health.fields.faqs.withoutFaqs} don't.
                Certs: {health.fields.certs.productsWithCertIds} products use CMS cert IDs.
              </div>
            </CardContent>
          </Card>

          {/* Audit: Unmatched badges */}
          {(health.audit?.unmatchedBadges?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-yellow-800">Missing Badges — in products but not in CMS</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Run "Seed Badge CMS" to create them, or edit products to use registered badges.</p>
                <div className="flex flex-wrap gap-2">
                  {health.audit.unmatchedBadges.map((b: any) => (
                    <span key={b.name} className="text-xs bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full">
                      {b.name} <span className="opacity-60">×{b.count}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit: Unmatched certs */}
          {(health.audit?.unmatchedCerts?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-blue-800">Missing Certifications — cert strings without CMS records</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Run "Seed Certification CMS" to create them.</p>
                <div className="flex flex-wrap gap-2">
                  {health.audit.unmatchedCerts.map((c: any) => (
                    <span key={c.name} className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                      {c.name} <span className="opacity-60">×{c.count}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SSOT Report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Single Source of Truth Report
                <button type="button" onClick={() => setShowSsot(!showSsot)} className="text-xs text-blue-600 hover:underline font-normal">
                  {showSsot ? "Hide" : "Show"}
                </button>
              </CardTitle>
            </CardHeader>
            {showSsot && (
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Field</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Source</th>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {([
                      { field: 'Product Name',      source: 'products.name',                                          status: 'ok' },
                      { field: 'Product Family',     source: 'products.family (BF/DB Series grouping)',                status: 'ok' },
                      { field: 'Category',           source: 'products.category (DB-derived)',                         status: 'ok' },
                      { field: 'Price Range',        source: 'products.priceRange',                                    status: 'ok' },
                      { field: 'Features',           source: 'products.features[] (FeatureItem objects)',              status: health.fields.features.legacy > 0 ? 'warn' : 'ok' },
                      { field: 'Specifications',     source: 'products.specifications[] (SpecItem objects)',           status: (health.fields.specs.legacy > 0 || (health.fields.specs.withDuplicates ?? 0) > 0) ? 'warn' : 'ok' },
                      { field: 'Applications',       source: 'products.applications[] (ApplicationItem objects)',      status: health.fields.apps.legacy > 0 ? 'warn' : 'ok' },
                      { field: 'Badges',             source: 'product_badges collection → products.badges[]',          status: health.fields.badges.productsWithUnmatched > 0 ? 'warn' : 'ok' },
                      { field: 'Certifications',     source: 'certifications collection → products.certificationIds[]', status: health.fields.certs.productsWithLegacy > 0 ? 'warn' : 'ok' },
                      { field: 'Legacy Cert Strings', source: 'products.certifications[] — DEPRECATED',               status: health.fields.certs.productsWithLegacy > 0 ? 'error' : 'ok' },
                      { field: 'SEO Fields',         source: 'products.seoTitle/metaDescription/h1Title/ogTitle',      status: 'ok' },
                      { field: 'Images',             source: 'products.imageUrls[] (Cloudinary CDN)',                  status: 'ok' },
                      { field: 'Sections',           source: 'products.sections[] (SectionBuilder)',                   status: 'ok' },
                      { field: 'FAQs',               source: 'products.productFaqs[]',                                 status: 'ok' },
                    ] as { field: string; source: string; status: string }[]).map(row => (
                      <tr key={row.field} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{row.field}</td>
                        <td className="px-4 py-2 text-gray-500 font-mono text-[11px]">{row.source}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            row.status === 'ok' ? 'bg-green-100 text-green-700' :
                            row.status === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {row.status === 'ok' ? '✓ OK' : row.status === 'warn' ? '⚠ Issues' : '✗ Deprecated'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>

          {/* Per-product audit table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>Product Normalization Audit — {productRows.length} products</span>
                <button type="button" onClick={() => setShowAllProducts(!showAllProducts)} className="text-xs text-blue-600 hover:underline font-normal">
                  {showAllProducts ? "Show issues only" : "Show all products"}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 min-w-[160px]">Product</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">Features</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">Specs</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">Apps</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">FAQs</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">Badges</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">Cert IDs</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">Norm%</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayProducts.map((p: any) => {
                      const iss: string[] = p.issues || []
                      const featOk = !iss.some(i => ['legacy-features','empty-features','duplicate-features'].includes(i))
                      const specOk = !iss.some(i => ['legacy-specs','empty-specs','duplicate-specs'].includes(i))
                      const appOk  = !iss.some(i => ['legacy-apps','empty-apps','duplicate-apps'].includes(i))
                      const faqOk  = !!p.hasFaqs
                      const badgeOk = !iss.includes('unmatched-badges')
                      const certOk  = p.hasCertIds && !iss.includes('legacy-certs')
                      const score = [featOk, specOk, appOk, faqOk, badgeOk, certOk].filter(Boolean).length
                      const pct = Math.round((score / 6) * 100)
                      const Chip = ({ ok, warn, tip }: { ok: boolean; warn?: boolean; tip?: string }) => (
                        <span title={tip} className={`inline-block w-5 h-5 rounded text-center leading-5 font-bold ${ok ? 'bg-green-100 text-green-700' : warn ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                          {ok ? '✓' : warn ? '!' : '✗'}
                        </span>
                      )
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                          <td className="px-2 py-2 text-center">
                            <Chip ok={featOk} warn={iss.includes('duplicate-features')} tip={iss.find(i=>i.startsWith('legacy-feat')||i.startsWith('empty-feat')||i.startsWith('dup-feat'))||''} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Chip ok={specOk} warn={iss.includes('duplicate-specs')} tip={iss.find(i=>i.startsWith('legacy-spec')||i.startsWith('empty-spec')||i.startsWith('dup-spec'))||''} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Chip ok={appOk} warn={iss.includes('duplicate-apps')} tip={iss.find(i=>i.startsWith('legacy-app')||i.startsWith('empty-app')||i.startsWith('dup-app'))||''} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Chip ok={faqOk} tip={faqOk ? '' : 'no FAQs'} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Chip ok={badgeOk} tip={badgeOk ? '' : 'unmatched badges'} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Chip ok={certOk} tip={!certOk ? (p.hasCertIds ? 'legacy strings remain' : 'no cert IDs') : ''} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`font-bold ${pct === 100 ? 'text-green-700' : pct >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                          </td>
                          <td className="px-2 py-2">
                            <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">view ↗</a>
                          </td>
                        </tr>
                      )
                    })}
                    {displayProducts.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-6 text-green-700 font-medium">All products are fully normalized. ✓</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {!showAllProducts && problemProducts.length > 20 && (
                <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                  Showing 20 of {problemProducts.length} products with issues. <button type="button" onClick={() => setShowAllProducts(true)} className="text-blue-500 underline">Show all</button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!health && !loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Click Refresh to load the health report.</div>
      )}
    </div>
  )
}

// Analytics Tab Component
function AnalyticsTab({ products }: { products: Product[] }) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : [])
        setSubmissionsLoading(false)
      })
      .catch(() => setSubmissionsLoading(false))
  }, [])

  // Lead aggregations
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const within = (s: any, ms: number) => {
    if (!s.createdAt) return false
    const t = new Date(s.createdAt).getTime()
    return Number.isFinite(t) && now - t < ms
  }
  const last24h = submissions.filter((s) => within(s, dayMs)).length
  const last7d = submissions.filter((s) => within(s, 7 * dayMs)).length
  const last30d = submissions.filter((s) => within(s, 30 * dayMs)).length

  const byType = submissions.reduce<Record<string, number>>((acc, s) => {
    const t = s.type || "unknown"
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})
  const byLocation = submissions.reduce<Record<string, number>>((acc, s) => {
    const loc = s.location_label || s.form_page_path || "unknown"
    acc[loc] = (acc[loc] || 0) + 1
    return acc
  }, {})
  const rfqLeads = submissions.filter((s) => s.type === "rfq")
  const rfqTender = rfqLeads.filter((s) => s.gemAuthRequired).length
  const rfqDealer = rfqLeads.filter((s) => s.dealerInquiry).length
  const topLocations = Object.entries(byLocation).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const totalSubmissions = submissions.length

  const categoryStats = products.reduce(
    (acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const badgeStats = products.reduce(
    (acc, product) => {
      const badges = product.badges || [];
      badges.forEach(badge => {
        if (badge) {
          acc[badge] = (acc[badge] || 0) + 1;
        }
      });
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics &amp; Insights</h2>
        <p className="text-gray-600">Lead activity, conversion funnel, and catalog statistics</p>
      </div>

      {/* Lead Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {submissionsLoading ? (
            <div className="text-sm text-gray-500">Loading submissions…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total leads</div>
                  <div className="text-3xl font-bold text-gray-900">{totalSubmissions}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Last 24h</div>
                  <div className="text-3xl font-bold text-green-700">{last24h}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Last 7 days</div>
                  <div className="text-3xl font-bold text-green-700">{last7d}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Last 30 days</div>
                  <div className="text-3xl font-bold text-green-700">{last30d}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">By submission type</h3>
                  {Object.entries(byType).length === 0 ? (
                    <p className="text-sm text-gray-500">No submissions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, count]) => {
                        const pct = totalSubmissions ? (count / totalSubmissions) * 100 : 0
                        return (
                          <div key={t} className="flex items-center gap-3">
                            <div className="text-sm capitalize w-44 text-gray-700">{t}</div>
                            <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-sm font-semibold text-gray-900 w-10 text-right">{count}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">By form location (top 6)</h3>
                  {topLocations.length === 0 ? (
                    <p className="text-sm text-gray-500">No location data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {topLocations.map(([loc, count]) => {
                        const pct = totalSubmissions ? (count / totalSubmissions) * 100 : 0
                        return (
                          <div key={loc} className="flex items-center gap-3">
                            <div className="text-xs text-gray-700 w-44 truncate" title={loc}>{loc}</div>
                            <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-sm font-semibold text-gray-900 w-10 text-right">{count}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {rfqLeads.length > 0 ? (
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">RFQ leads</div>
                    <div className="text-2xl font-bold text-gray-900">{rfqLeads.length}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Tender / GeM</div>
                    <div className="text-2xl font-bold text-yellow-700">{rfqTender}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Dealer inquiries</div>
                    <div className="text-2xl font-bold text-purple-700">{rfqDealer}</div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Products by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryStats).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-gray-700">{category}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(count / products.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products by Badge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(badgeStats).map(([badge, count]) => (
                <div key={badge} className="flex justify-between items-center">
                  <span className="text-gray-700">{badge}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / products.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Rated Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 5)
              .map((product) => (
                <div key={product.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={typeof product.imageUrls?.[0] === 'string' ? product.imageUrls?.[0] || '/placeholder.svg' : '/placeholder.svg'}
                    alt={typeof product.name === 'string' ? product.name || 'Product Image' : 'Product Image'}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="text-yellow-400 fill-current" size={16} />
                      <span className="font-semibold">{product.rating}</span>
                    </div>
                    <p className="text-sm text-gray-600">{product.reviewsCount} reviews</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Content Tab Component
function ContentTab({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h2>
        <p className="text-gray-600">Manage website content, blog posts, and company information</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" className="w-full justify-start bg-transparent" variant="outline" onClick={() => setActiveTab("aboutUs")}>
              <Edit className="mr-2" size={16} />
              Edit About Us Page
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Edit className="mr-2" size={16} />
              Update Contact Information
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Edit className="mr-2" size={16} />
              Manage Team Members
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blog Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
              <Plus className="mr-2" size={16} />
              Add New Blog Post
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Edit className="mr-2" size={16} />
              Manage Existing Posts
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Edit className="mr-2" size={16} />
              Blog Categories
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Website Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button className="justify-start bg-transparent" variant="outline">
              <Settings className="mr-2" size={16} />
              SEO Settings
            </Button>
            <Button className="justify-start bg-transparent" variant="outline">
              <ImageIcon className="mr-2" size={16} />
              Hero Images
            </Button>
            <Button className="justify-start bg-transparent" variant="outline">
              <FileText className="mr-2" size={16} />
              Legal Pages
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Categories Tab Component
function CategoriesTab({
  categories,
  onAddCategory,
  onDeleteCategory,
}: {
  categories: string[]
  onAddCategory: (category: string) => void
  onDeleteCategory: (category: string) => void
}) {
  const [newCategory, setNewCategory] = useState("")

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      onAddCategory(newCategory.trim())
      setNewCategory("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Category Management</h2>
        <p className="text-gray-600">Manage product categories for your catalog</p>
      </div>

      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCategory} className="flex gap-4">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name"
              className="flex-1"
            />
            <Button type="submit" disabled={!newCategory.trim() || categories.includes(newCategory.trim())}>
              <Plus className="mr-2" size={16} />
              Add Category
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{category}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteCategory(category)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-1" size={14} />
                  Delete
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No categories found. Add your first category above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const types = Array.from(new Set(submissions.map((s) => s.type).filter(Boolean))).sort()

  const filtered = submissions.filter((s) => {
    if (typeFilter !== "all" && s.type !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const haystack = [
        s.name, s.phone, s.email, s.product, s.productName,
        s.organization, s.cityState, s.description, s.message, s.location_label,
      ].filter(Boolean).join(" ").toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  function downloadCsv() {
    const headers = [
      "createdAt", "type", "name", "phone", "email",
      "product", "productName", "quantity", "organization", "cityState",
      "description", "message", "subject",
      "gemAuthRequired", "dealerInquiry",
      "uploadUrl", "uploadName",
      "form_page_path", "form_page_url", "location_label",
    ]
    const csvEscape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [headers.join(",")]
    for (const s of filtered) {
      lines.push(headers.map((h) => csvEscape(s[h])).join(","))
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const typeBadgeClass = (t: string) => {
    switch (t) {
      case "rfq": return "bg-green-100 text-green-800"
      case "brochure": return "bg-blue-100 text-blue-800"
      case "sticky_quote_request": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">User Submissions</h2>
          <p className="text-gray-600">
            All RFQ, brochure, sticky-quote, and contact submissions — {submissions.length} total
            {filtered.length !== submissions.length ? ` (showing ${filtered.length})` : ""}
          </p>
        </div>
        <Button onClick={downloadCsv} variant="outline" disabled={!filtered.length}>
          <Download className="mr-2" size={16} />
          Export CSV
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="all">All types ({submissions.length})</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t} ({submissions.filter((s) => s.type === t).length})
            </option>
          ))}
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email, product, organization…"
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-gray-500">Loading submissions…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          No submissions match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold text-gray-700">Date</th>
                <th className="px-3 py-2 font-semibold text-gray-700">Type</th>
                <th className="px-3 py-2 font-semibold text-gray-700">Name / Phone</th>
                <th className="px-3 py-2 font-semibold text-gray-700">Product / Qty</th>
                <th className="px-3 py-2 font-semibold text-gray-700">Org / City</th>
                <th className="px-3 py-2 font-semibold text-gray-700">Tags</th>
                <th className="px-3 py-2 font-semibold text-gray-700">Upload</th>
                <th className="px-3 py-2 font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const id = s._id ? String(s._id) : `${s.name || ''}-${s.phone || ''}-${s.createdAt || ''}`
                const isOpen = expanded[id]
                const product = s.product || s.productName || "—"
                const notes = s.description || s.message || ""
                return (
                  <React.Fragment key={id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleString() : ""}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize", typeBadgeClass(s.type))}>
                          {s.type || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{s.name || "—"}</div>
                        <div className="text-xs text-gray-500">
                          {s.phone || ""}
                          {s.email ? ` · ${s.email}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900">{product}</div>
                        {s.quantity ? <div className="text-xs text-gray-500">qty {s.quantity}</div> : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900">{s.organization || "—"}</div>
                        <div className="text-xs text-gray-500">{s.cityState || ""}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {s.gemAuthRequired ? <span className="inline-flex rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-semibold">GeM</span> : null}
                          {s.dealerInquiry ? <span className="inline-flex rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-xs font-semibold">Dealer</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {s.uploadUrl ? (
                          <a
                            href={s.uploadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-700 hover:underline"
                            title={s.uploadName || s.uploadUrl}
                          >
                            <Download size={14} className="inline mr-1" />
                            {s.uploadName || "file"}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setExpanded((m) => ({ ...m, [id]: !m[id] }))}
                          className="text-xs text-gray-500 hover:text-green-700"
                        >
                          {isOpen ? "Hide" : "Details"}
                        </button>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="bg-gray-50/60">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-700">
                            {notes ? (
                              <div className="md:col-span-2">
                                <div className="font-semibold text-gray-600 mb-1">Notes</div>
                                <div className="whitespace-pre-wrap text-gray-800">{notes}</div>
                              </div>
                            ) : null}
                            {s.subject ? <div><span className="font-semibold text-gray-600">Subject:</span> {s.subject}</div> : null}
                            {s.location_label ? <div><span className="font-semibold text-gray-600">Form location:</span> {s.location_label}</div> : null}
                            {s.form_page_path ? <div><span className="font-semibold text-gray-600">Page:</span> {s.form_page_path}</div> : null}
                            {s.attribution ? (
                              <div className="md:col-span-2">
                                <div className="font-semibold text-gray-600 mb-1">Attribution</div>
                                <pre className="overflow-x-auto rounded bg-white border border-gray-200 p-2 text-[11px] leading-snug">
{JSON.stringify(s.attribution, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Blogs Tab Component
function BlogsTab({
  blogs,
  onAddBlog,
  onUpdateBlog,
  onDeleteBlog,
  onReorderBlogs,
  isAddingBlog,
  setIsAddingBlog,
  editingBlog,
  setEditingBlog,
}: {
  blogs: BlogPost[]
  onAddBlog: (blog: Omit<BlogPost, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onUpdateBlog: (blog: BlogPost) => void
  onDeleteBlog: (id: string) => void
  onReorderBlogs: (orderedBlogIds: string[]) => Promise<void>
  isAddingBlog: boolean
  setIsAddingBlog: (value: boolean) => void
  editingBlog: BlogPost | null
  setEditingBlog: (blog: BlogPost | null) => void
}) {
  const [draggedBlogId, setDraggedBlogId] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  const sortedBlogs = [...blogs].sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : Number.POSITIVE_INFINITY
    const orderB = b.order !== undefined ? b.order : Number.POSITIVE_INFINITY
    if (orderA !== orderB) return orderA - orderB
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  const commitNewOrder = async (orderedBlogs: BlogPost[]) => {
    setIsReordering(true)
    try {
      await onReorderBlogs(orderedBlogs.map((blog) => String(blog.id)))
    } finally {
      setIsReordering(false)
    }
  }

  const moveBlog = async (blogId: string, direction: "up" | "down") => {
    if (isReordering) return
    const currentIndex = sortedBlogs.findIndex((blog) => String(blog.id) === String(blogId))
    if (currentIndex === -1) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedBlogs.length) return

    const reordered = [...sortedBlogs]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    await commitNewOrder(reordered)
  }

  const handleDrop = async (targetBlogId: string) => {
    if (!draggedBlogId || draggedBlogId === targetBlogId || isReordering) {
      setDraggedBlogId(null)
      return
    }

    const fromIndex = sortedBlogs.findIndex((blog) => String(blog.id) === String(draggedBlogId))
    const toIndex = sortedBlogs.findIndex((blog) => String(blog.id) === String(targetBlogId))
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedBlogId(null)
      return
    }

    const reordered = [...sortedBlogs]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setDraggedBlogId(null)
    await commitNewOrder(reordered)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Blog Management</h2>
          <p className="text-gray-600">Manage blog posts and articles</p>
        </div>
        <Button
          onClick={() => setIsAddingBlog(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2" size={16} />
          Add Blog Post
        </Button>
      </div>

      {isAddingBlog && (
        <BlogForm
          blog={null}
          onSave={onAddBlog}
          onCancel={() => setIsAddingBlog(false)}
        />
      )}

      <div className="grid gap-6">
        {sortedBlogs.map((blog, index) => (
            <Card
              key={blog.id}
              className={cn(
                "overflow-hidden transition-all",
                draggedBlogId === String(blog.id) ? "opacity-50 ring-2 ring-green-400" : "",
                isReordering ? "pointer-events-none opacity-80" : "",
              )}
              draggable={editingBlog?.id !== blog.id && !isReordering}
              onDragStart={() => setDraggedBlogId(String(blog.id))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(String(blog.id))}
              onDragEnd={() => setDraggedBlogId(null)}
            >
              <CardContent className="p-0">
                {editingBlog?.id === blog.id ? (
                  <BlogForm
                    blog={blog}
                    onSave={(formData) => {
                      onUpdateBlog({ ...formData, id: blog.id }); // pass the existing blog ID
                    }}
                    onCancel={() => setEditingBlog(null)}
                  />
                ) : (
                  <div className="flex">
                    <div className="w-64 h-40 flex-shrink-0">
                      <img
                        src={blog.topImage || "/placeholder.svg"}
                        alt="Blog"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                            title="Drag to reorder"
                            aria-label="Drag to reorder blog"
                            disabled={isReordering}
                          >
                            <GripVertical size={18} />
                          </button>
                          <h3 className="text-xl font-bold text-gray-900">{blog.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void moveBlog(String(blog.id), "up")}
                            disabled={isReordering || index === 0}
                            title="Move up"
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void moveBlog(String(blog.id), "down")}
                            disabled={isReordering || index === sortedBlogs.length - 1}
                            title="Move down"
                          >
                            <ArrowDown size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBlog(blog)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteBlog(blog.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">{plainTextFromHtml(blog.excerpt || "")}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          Order: {blog.order !== undefined ? blog.order : "—"}
                        </span>
                        <span>Category: {blog.category}</span>
                        <span>Author: {blog.author}</span>
                        <span>Published: {new Date(blog.publishedAt).toLocaleDateString()}</span>
                        {blog.inlineImages && blog.inlineImages.length > 0 && (
                          <span className="text-blue-600">📷 {blog.inlineImages.length} inline images</span>
                        )}
                        <Badge variant={blog.isPublished ? "default" : "secondary"}>
                          {blog.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

// Banners Tab Component
function BannersTab({
  banners,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  isAddingBanner,
  setIsAddingBanner,
  editingBanner,
  setEditingBanner,
}: {
  banners: Banner[]
  onAddBanner: (banner: Omit<Banner, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onUpdateBanner: (banner: Banner) => void
  onDeleteBanner: (id: string) => void
  isAddingBanner: boolean
  setIsAddingBanner: (value: boolean) => void
  editingBanner: Banner | null
  setEditingBanner: (banner: Banner | null) => void
}) {
  // Get the default banner (first banner with order 0 or lowest order)
  const sortedBanners = banners.sort((a, b) => a.order - b.order)
  const defaultBanner = sortedBanners.find(b => b.isActive && b.order === 0) || sortedBanners.find(b => b.isActive) || sortedBanners[0]
  const otherBanners = sortedBanners.filter(b => b.id !== defaultBanner?.id)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Banner Management</h2>
          <p className="text-gray-600">Manage homepage banner images and their content</p>
        </div>
        <Button
          onClick={() => setIsAddingBanner(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2" size={16} />
          Add Banner
        </Button>
      </div>

      {isAddingBanner && (
        <BannerForm
          banner={null}
          onSave={onAddBanner}
          onCancel={() => setIsAddingBanner(false)}
          isDefault={banners.length === 0}
        />
      )}

      {/* Default Banner Section - The first banner that loads on the website */}
      {defaultBanner && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-600 text-white px-3 py-1">Default Banner</Badge>
            <p className="text-sm text-gray-600">This is the first banner that appears when the website loads</p>
          </div>
          <Card className="overflow-hidden border-2 border-green-500">
            <CardContent className="p-0">
              {editingBanner?.id === defaultBanner.id ? (
                <BannerForm
                  banner={defaultBanner}
                  onSave={onUpdateBanner}
                  onCancel={() => setEditingBanner(null)}
                  isDefault={true}
                />
              ) : (
                <div className="flex">
                  <div className="w-64 h-40 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={defaultBanner.desktopBannerImage || defaultBanner.image}
                      alt={defaultBanner.desktopBannerAlt || "Default Banner"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Default Banner (Loading Page)</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Order: {defaultBanner.order}</span>
                          <span>Status: {defaultBanner.isActive ? 'Active' : 'Inactive'}</span>
                          <span className="text-green-600 font-semibold">✓ This banner shows first</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBanner(defaultBanner)}
                          className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <Edit className="mr-1" size={14} />
                          Edit Default Banner
                        </Button>
                        {otherBanners.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteBanner(defaultBanner.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="mr-1" size={14} />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Other Banners Section */}
      {otherBanners.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Additional Banners</h3>
            <p className="text-sm text-gray-600">
              These banners appear in the carousel after the default banner.{" "}
              <span className="text-gray-500">Drag the handle on the left to reorder.</span>
            </p>
          </div>
          <DraggableBannerList
            banners={otherBanners}
            editingBanner={editingBanner}
            setEditingBanner={setEditingBanner}
            onUpdateBanner={onUpdateBanner}
            onDeleteBanner={onDeleteBanner}
            onAddBanner={onAddBanner}
            onReorder={(reordered) => {
              // Persist new ordering one PUT at a time via the existing
              // per-banner endpoint. Cheap because banner counts are tiny.
              reordered.forEach((b) => onUpdateBanner({ ...b }))
            }}
          />
        </div>
      )}

      {banners.length === 0 && !isAddingBanner && (
        <Card>
          <CardContent className="p-12 text-center">
            <Image className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Banners Yet</h3>
            <p className="text-gray-600 mb-4">Add your first banner to display on the homepage. This will be the default banner that loads first.</p>
            <Button
              onClick={() => setIsAddingBanner(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2" size={16} />
              Add Default Banner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Blog Form Component
function BlogForm({
  blog,
  onSave,
  onCancel,
}: {
  blog?: BlogPost | null
  onSave: (blog: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    order: blog?.order ?? undefined,
    slug: blog?.slug || "",
    title: blog?.title || "",
    excerpt: blog?.excerpt || "",
    content: blog?.content || "",
    topImage: blog?.topImage || "",
    inlineImages: blog?.inlineImages || [],
    category: blog?.category || "",
    author: blog?.author || "",
    isPublished: blog?.isPublished ?? true,
  })
  const [isUploadingTop, setIsUploadingTop] = useState(false)
  const [isUploadingInline, setIsUploadingInline] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !plainTextFromHtml(formData.content || "").trim()) {
      setUploadError("Please fill in title and content")
      return
    }
    if (!plainTextFromHtml(formData.excerpt || "").trim()) {
      setUploadError("Please fill in excerpt")
      return
    }
    if (!formData.topImage && !blog) {
      setUploadError("Please upload a top image")
      return
    }
    onSave(formData)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blog Order (Number)</label>
              <Input
                type="number"
                value={formData.order ?? ""}
                onChange={(e) => {
                  const raw = e.target.value
                  const num = raw === "" ? undefined : Number(raw)
                  setFormData({ ...formData, order: Number.isFinite(num) ? num : undefined })
                }}
                placeholder="e.g., 1"
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers show first (1, then 3, then 4)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blog Title</label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value
                  const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                  setFormData({ ...formData, title, slug: formData.slug || autoSlug })
                }}
                placeholder="Enter blog title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Enter author name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SEO Slug (URL)</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") })}
              placeholder="e.g., thermal-fogging-machine-guide"
            />
            <p className="text-xs text-gray-500 mt-1">URL: /blog/{formData.slug || "auto-generated"}. Leave blank to auto-generate from title+ID.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
            <AdminRichTextEditor
              value={formData.excerpt}
              onChange={(v) => setFormData({ ...formData, excerpt: v })}
              placeholder="Brief description of the blog post"
            />
            <p className="text-xs text-gray-500 mt-1">Shown on blog cards as plain text preview.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <AdminRichTextEditor
              value={formData.content}
              onChange={(v) => setFormData({ ...formData, content: v })}
              placeholder="Write your blog content here…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Maintenance, Equipment Guide, Technology"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Top Image (Main Banner)</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  setUploadError("");
                  setIsUploadingTop(true);
                  
                  const formDataCloud = new FormData();
                  formDataCloud.append("file", file);
                  formDataCloud.append("upload_preset", "product_uploads");
                  
                  try {
                    const res = await fetch(
                      "https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload",
                      {
                        method: "POST",
                        body: formDataCloud,
                      }
                    );
                    
                    if (!res.ok) {
                      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
                    }
                    
                    const data = await res.json();
                    if (data.secure_url) {
                      setFormData({ ...formData, topImage: data.secure_url });
                      setUploadError("");
                    } else {
                      throw new Error("No secure URL returned from Cloudinary");
                    }
                  } catch (error) {
                    console.error('Error uploading image:', error);
                    setUploadError(`Failed to upload top image: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setIsUploadingTop(false);
                  }
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required={!blog} 
              disabled={isUploadingTop}
            />
            <p className="text-xs text-gray-500 mt-1">Upload the main banner image for the top of the blog post</p>
            
            {isUploadingTop && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-600">Uploading top image...</p>
              </div>
            )}
            
            {formData.topImage && (
              <div className="mt-2">
                <img src={formData.topImage} alt="Top preview" className="w-32 h-32 object-cover rounded-lg" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inline Images (Optional)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files);
                  setUploadError("");
                  setIsUploadingInline(true);
                  
                  try {
                    const uploadedUrls: string[] = [];
                    for (const file of files) {
                      const formDataCloud = new FormData();
                      formDataCloud.append("file", file);
                      formDataCloud.append("upload_preset", "product_uploads");
                      
                      const res = await fetch(
                        "https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload",
                        {
                          method: "POST",
                          body: formDataCloud,
                        }
                      );
                      
                      if (!res.ok) {
                        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
                      }
                      
                      const data = await res.json();
                      if (data.secure_url) {
                        uploadedUrls.push(data.secure_url);
                      }
                    }
                    
                    setFormData({ ...formData, inlineImages: [...formData.inlineImages, ...uploadedUrls] });
                    setUploadError("");
                  } catch (error) {
                    console.error('Error uploading images:', error);
                    setUploadError(`Failed to upload inline images: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setIsUploadingInline(false);
                  }
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isUploadingInline}
            />
            <p className="text-xs text-gray-500 mt-1">Upload images to be displayed within the blog content (multiple images allowed)</p>
            
            {isUploadingInline && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-600">Uploading inline images...</p>
              </div>
            )}
            
            {formData.inlineImages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.inlineImages.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`Inline ${idx + 1}`} className="w-24 h-24 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = formData.inlineImages.filter((_, i) => i !== idx);
                        setFormData({ ...formData, inlineImages: newImages });
                      }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
              Published (visible on website)
            </label>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700"
              disabled={
                isUploadingTop ||
                isUploadingInline ||
                !formData.title ||
                !plainTextFromHtml(formData.content || "").trim() ||
                !plainTextFromHtml(formData.excerpt || "").trim() ||
                !formData.topImage
              }
            >
              <Save className="mr-2" size={16} />
              {(isUploadingTop || isUploadingInline) ? 'Uploading...' : (blog ? 'Update Blog' : 'Add Blog')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isUploadingTop || isUploadingInline}>
              <X className="mr-2" size={16} />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Banner Form Component
// --- Banner image upload helpers -------------------------------------------

type DeviceKind = "desktop" | "tablet" | "mobile"

const DEVICE_SPECS: Record<DeviceKind, {
  label: string
  recommendedW: number
  recommendedH: number
  aspectRatio: number
  aspectTolerance: number // ± fraction allowed before warning
  aspectLabel: string
  maxKb: number
  guidance: string
  breakpoint: string
}> = {
  desktop: {
    label: "Desktop banner",
    recommendedW: 1920,
    recommendedH: 850,
    aspectRatio: 1920 / 850,
    aspectTolerance: 0.05,
    aspectLabel: "~2.25:1 (landscape)",
    maxKb: 250,
    breakpoint: "> 1024 px",
    guidance:
      "Heading + RFQ form overlay the LEFT column on desktop. Place the focal point (face, machine) toward the RIGHT half so it isn't covered.",
  },
  tablet: {
    label: "Tablet banner",
    recommendedW: 1200,
    recommendedH: 900,
    aspectRatio: 1200 / 900,
    aspectTolerance: 0.07,
    aspectLabel: "4:3 (landscape-square)",
    maxKb: 180,
    breakpoint: "768 – 1024 px",
    guidance:
      "Optional. Shown on tablets and small laptops. Keep the subject roughly centered — content sits below the image on this breakpoint.",
  },
  mobile: {
    label: "Mobile banner",
    recommendedW: 800,
    recommendedH: 1200,
    aspectRatio: 800 / 1200,
    aspectTolerance: 0.05,
    aspectLabel: "2:3 (portrait splash)",
    maxKb: 120,
    breakpoint: "< 768 px",
    guidance:
      "Full-bleed portrait splash above the headline + CTAs. For celebrity creative, frame the FACE in the upper third of the image and use the focal-point picker to pin it.",
  },
}

interface BannerImageMeta {
  width: number
  height: number
  sizeKb: number
}

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("upload_preset", "product_uploads")
  const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload", {
    method: "POST",
    body: fd,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (!data?.secure_url) throw new Error("No secure_url returned from Cloudinary")
  return data.secure_url as string
}

function readImageMeta(file: File): Promise<BannerImageMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const meta = { width: img.naturalWidth, height: img.naturalHeight, sizeKb: file.size / 1024 }
      URL.revokeObjectURL(url)
      resolve(meta)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image dimensions")) }
    img.src = url
  })
}

function evaluateBannerImage(meta: BannerImageMeta, device: DeviceKind) {
  const spec = DEVICE_SPECS[device]
  const ratio = meta.width / meta.height
  const ratioDelta = Math.abs(ratio - spec.aspectRatio) / spec.aspectRatio
  const ratioOk = ratioDelta <= spec.aspectTolerance
  const sizeOk = meta.sizeKb <= spec.maxKb
  return { ratio, ratioOk, sizeOk, spec }
}

// --- Per-device upload card ------------------------------------------------

function BannerImageCard({
  device,
  url,
  alt,
  enabled,
  focalX,
  focalY,
  onUrlChange,
  onAltChange,
  onEnabledChange,
  onFocalChange,
  onPreviewChange,
}: {
  device: DeviceKind
  url: string
  alt: string
  enabled: boolean
  focalX: number
  focalY: number
  onUrlChange: (u: string) => void
  onAltChange: (a: string) => void
  onEnabledChange: (e: boolean) => void
  onFocalChange: (x: number, y: number) => void
  onPreviewChange?: (preview: string) => void
}) {
  const spec = DEVICE_SPECS[device]
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingName, setUploadingName] = useState<string | null>(null)
  const [justUploaded, setJustUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<BannerImageMeta | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [focalMode, setFocalMode] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, or WebP).")
      return
    }
    setError(null)
    setJustUploaded(false)
    setUploadingName(file.name)
    setIsUploading(true)

    // Local preview + dimension read happen immediately so the admin can see
    // the image and any aspect/size warnings BEFORE the Cloudinary round-trip.
    let localMeta: BannerImageMeta | null = null
    try {
      localMeta = await readImageMeta(file)
      setMeta(localMeta)
    } catch {
      // proceed without meta; we'll still upload
    }
    if (localMeta) {
      const reader = new FileReader()
      reader.onload = (e) => onPreviewChange?.(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    try {
      const secureUrl = await uploadToCloudinary(file)
      onUrlChange(secureUrl)
      // Brief success pulse — auto-dismisses after 1.8s.
      setJustUploaded(true)
      window.setTimeout(() => setJustUploaded(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.")
    } finally {
      setIsUploading(false)
      setUploadingName(null)
    }
  }

  const evaluation = meta ? evaluateBannerImage(meta, device) : null

  return (
    <div className={`rounded-2xl border ${enabled ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50/60 opacity-90"} shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{spec.label}</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-medium text-gray-700">{spec.breakpoint}</span> · {spec.recommendedW} × {spec.recommendedH} · {spec.aspectLabel} · ≤ {spec.maxKb} KB
          </p>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-xs font-medium text-gray-700">Show on {device}</span>
        </label>
      </div>

      {/* Drop-zone + preview (or focal-point picker overlay when image present) */}
      <div
        onDragOver={(e) => { if (!focalMode) { e.preventDefault(); setIsDragging(true) } }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          if (focalMode) return
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        onClick={(e) => {
          if (focalMode) {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * 100
            const y = ((e.clientY - rect.top) / rect.height) * 100
            onFocalChange(
              Math.max(0, Math.min(100, Math.round(x))),
              Math.max(0, Math.min(100, Math.round(y))),
            )
            return
          }
          inputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if (focalMode) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={focalMode ? `Set focal point for ${spec.label.toLowerCase()}` : `Upload ${spec.label.toLowerCase()}`}
        aria-busy={isUploading}
        className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
          focalMode
            ? "border-solid border-amber-400 cursor-crosshair"
            : "border-dashed cursor-pointer " + (
                isDragging
                  ? "border-green-500 bg-green-50 scale-[1.005]"
                  : justUploaded
                    ? "border-green-500 bg-green-50/60"
                    : "border-gray-300 hover:border-green-400 hover:bg-green-50/30 bg-white"
              )
        }`}
        style={{
          aspectRatio:
            device === "desktop" ? "1920 / 850" :
            device === "tablet"  ? "1200 / 900" :
                                   "800 / 1200",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = "" // allow re-selecting the same filename
          }}
        />
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt || `${spec.label} preview`}
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        ) : (
          <div className="text-center px-4">
            <Upload className="mx-auto text-gray-400 mb-2" size={28} aria-hidden />
            <p className="text-sm font-medium text-gray-700">Drop image here or click to upload</p>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WebP</p>
          </div>
        )}
        {/* Focal-point reticle (only when an image is loaded). Click anywhere on
            the image while in focal mode to reposition. */}
        {url && (
          <>
            <div
              aria-hidden="true"
              className={`absolute pointer-events-none transition-opacity ${focalMode ? "opacity-100" : "opacity-0"}`}
              style={{
                left: `calc(${focalX}% - 14px)`,
                top: `calc(${focalY}% - 14px)`,
              }}
            >
              <div className="w-7 h-7 rounded-full border-2 border-amber-400 bg-amber-400/20 shadow-[0_0_0_2px_rgba(0,0,0,0.4)]" />
            </div>
            {focalMode && (
              <div className="absolute inset-x-0 top-0 bg-amber-500/95 text-white text-[11px] font-medium px-3 py-1.5 text-center pointer-events-none">
                Click the image to set focal point — currently {focalX}% / {focalY}%
              </div>
            )}
          </>
        )}
        {isUploading && (
          <div
            className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="animate-spin text-green-600" size={28} aria-hidden />
            <p className="text-xs font-medium text-gray-700">Uploading…</p>
            {uploadingName && (
              <p className="text-[11px] text-gray-500 max-w-[80%] truncate">{uploadingName}</p>
            )}
          </div>
        )}
        {justUploaded && !isUploading && (
          <div
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-green-600 text-white text-[10px] font-semibold px-2 py-1 shadow-md transition-opacity"
            role="status"
            aria-live="polite"
          >
            <Check size={12} aria-hidden />
            Uploaded
          </div>
        )}
      </div>

      {/* Validation summary — single-line items with consistent icon column. */}
      <div className="mt-3 space-y-1.5 text-xs" aria-live="polite">
        {error && (
          <p className="flex items-start gap-1.5 text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
            <X size={14} className="shrink-0 mt-0.5" aria-hidden />
            <span>{error}</span>
          </p>
        )}
        {evaluation && (
          <>
            <p className={`flex items-start gap-1.5 ${evaluation.ratioOk ? "text-green-700" : "text-amber-700"}`}>
              {evaluation.ratioOk
                ? <Check size={14} className="shrink-0 mt-0.5" aria-hidden />
                : <span aria-hidden className="shrink-0 mt-0.5 font-semibold">⚠</span>}
              <span>
                {meta!.width} × {meta!.height} · ratio {evaluation.ratio.toFixed(2)}:1
                {!evaluation.ratioOk && ` — recommended ${spec.aspectLabel}; image may be cropped.`}
              </span>
            </p>
            <p className={`flex items-start gap-1.5 ${evaluation.sizeOk ? "text-green-700" : "text-amber-700"}`}>
              {evaluation.sizeOk
                ? <Check size={14} className="shrink-0 mt-0.5" aria-hidden />
                : <span aria-hidden className="shrink-0 mt-0.5 font-semibold">⚠</span>}
              <span>
                {meta!.sizeKb.toFixed(0)} KB
                {!evaluation.sizeOk && ` — over ${spec.maxKb} KB target; consider compressing before upload.`}
              </span>
            </p>
          </>
        )}
        {url && !error && !evaluation && (
          <p className="text-gray-500">Image stored. Re-upload to re-validate dimensions.</p>
        )}
      </div>

      {/* Action row */}
      {url && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload size={14} className="mr-1.5" aria-hidden />
            Replace
          </Button>
          <Button
            type="button"
            size="sm"
            variant={focalMode ? "default" : "outline"}
            className={focalMode ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            onClick={() => setFocalMode((v) => !v)}
            disabled={isUploading}
            aria-pressed={focalMode}
          >
            {focalMode ? "Done" : "Set focal point"}
          </Button>
          {(focalX !== 50 || focalY !== 50) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onFocalChange(50, 50)}
              disabled={isUploading}
              className="text-xs text-gray-500"
            >
              Reset focal
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 ml-auto"
            onClick={() => { onUrlChange(""); setMeta(null); setError(null); onFocalChange(50, 50) }}
            disabled={isUploading}
          >
            <X size={14} className="mr-1.5" aria-hidden />
            Remove
          </Button>
        </div>
      )}

      {/* Alt text */}
      <div className="mt-4">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Alt text {device === "desktop" ? "(desktop)" : "(mobile)"}
        </label>
        <Input
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder={device === "desktop"
            ? "e.g. Operator using 100X thermal fogging machine for mosquito control"
            : "e.g. 100X thermal fogger in action — close-up portrait crop"}
          className="text-sm"
        />
        <p className="text-[11px] text-gray-500 mt-1">Used for SEO and screen-reader accessibility.</p>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2">
        <span className="font-semibold text-gray-700">Crop guidance:</span> {spec.guidance}
      </p>
    </div>
  )
}

// HTML5 drag-reorder for the non-default banners. Avoids an extra dep.
// Each card carries a grip handle that initiates drag; dropping over another
// card swaps their `order` values and pushes the new ordering back via PUT.
function DraggableBannerList({
  banners,
  editingBanner,
  setEditingBanner,
  onUpdateBanner,
  onDeleteBanner,
  onAddBanner,
  onReorder,
}: {
  banners: Banner[]
  editingBanner: Banner | null
  setEditingBanner: (b: Banner | null) => void
  onUpdateBanner: (banner: Banner) => void
  onDeleteBanner: (id: string) => void
  onAddBanner: (banner: Omit<Banner, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onReorder: (reordered: Banner[]) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const duplicateBanner = (b: Banner) => {
    const { _id, id, createdAt, updatedAt, ...rest } = b
    onAddBanner({ ...rest, order: (b.order ?? 0) + 0.5 } as any)
  }

  const moveItem = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const sorted = [...banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const fromIdx = sorted.findIndex((b) => (b.id ?? b._id) === fromId)
    const toIdx = sorted.findIndex((b) => (b.id ?? b._id) === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const [picked] = sorted.splice(fromIdx, 1)
    sorted.splice(toIdx, 0, picked)
    const renumbered = sorted.map((b, i) => ({ ...b, order: i + 1 }))
    onReorder(renumbered)
  }

  return (
    <div className="grid gap-4">
      {banners.map((banner) => {
        const id = (banner.id ?? banner._id ?? "") as string
        const isOver = overId === id && dragId !== id
        return (
          <Card
            key={id}
            className={`overflow-hidden transition ${isOver ? "ring-2 ring-green-500" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOverId(id) }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragId) moveItem(dragId, id)
              setDragId(null); setOverId(null)
            }}
          >
            <CardContent className="p-0">
              {editingBanner?.id === banner.id ? (
                <BannerForm
                  banner={banner}
                  onSave={onUpdateBanner}
                  onCancel={() => setEditingBanner(null)}
                />
              ) : (
                <div className="flex">
                  {/* Drag handle */}
                  <div
                    draggable
                    onDragStart={() => setDragId(id)}
                    onDragEnd={() => { setDragId(null); setOverId(null) }}
                    className="flex items-center justify-center w-10 cursor-grab active:cursor-grabbing bg-gray-50 border-r border-gray-200 hover:bg-gray-100"
                    title="Drag to reorder"
                    aria-label="Drag handle"
                  >
                    <GripVertical className="text-gray-400" size={18} aria-hidden />
                  </div>
                  <div className="w-64 h-40 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.desktopBannerImage || banner.image}
                      alt={banner.desktopBannerAlt || "Banner"}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${banner.desktopFocalX ?? 50}% ${banner.desktopFocalY ?? 50}%` }}
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {banner.desktopBannerAlt || "Banner image"}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 flex-wrap">
                          <span>Order: {banner.order}</span>
                          <span>Status: {banner.isActive ? "Active" : "Inactive"}</span>
                          <span className="text-xs">
                            Devices:{" "}
                            <span className={banner.desktopBannerEnabled !== false ? "text-gray-700 font-medium" : "text-gray-400"}>D</span>
                            {" · "}
                            <span className={banner.tabletBannerEnabled !== false && banner.tabletBannerImage ? "text-gray-700 font-medium" : "text-gray-400"}>T</span>
                            {" · "}
                            <span className={banner.mobileBannerEnabled !== false ? "text-gray-700 font-medium" : "text-gray-400"}>M</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBanner(banner)}
                        >
                          <Edit className="mr-1" size={14} />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateBanner(banner)}
                          title="Duplicate this banner"
                        >
                          <Plus className="mr-1" size={14} />
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteBanner(banner.id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="mr-1" size={14} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function BannerForm({
  banner,
  onSave,
  onCancel,
  isDefault = false,
}: {
  banner?: Banner | null
  onSave: (banner: any) => void
  onCancel: () => void
  isDefault?: boolean
}) {
  // Initial state migrates the legacy single `image` into desktopBannerImage.
  const [formData, setFormData] = useState({
    desktopBannerImage: banner?.desktopBannerImage ?? banner?.image ?? "",
    tabletBannerImage: banner?.tabletBannerImage ?? "",
    mobileBannerImage: banner?.mobileBannerImage ?? "",
    desktopBannerAlt: banner?.desktopBannerAlt ?? "",
    tabletBannerAlt: banner?.tabletBannerAlt ?? "",
    mobileBannerAlt: banner?.mobileBannerAlt ?? "",
    desktopBannerEnabled: banner?.desktopBannerEnabled ?? true,
    tabletBannerEnabled: banner?.tabletBannerEnabled ?? true,
    mobileBannerEnabled: banner?.mobileBannerEnabled ?? true,
    desktopFocalX: banner?.desktopFocalX ?? 50,
    desktopFocalY: banner?.desktopFocalY ?? 50,
    tabletFocalX: banner?.tabletFocalX ?? 50,
    tabletFocalY: banner?.tabletFocalY ?? 50,
    mobileFocalX: banner?.mobileFocalX ?? 50,
    mobileFocalY: banner?.mobileFocalY ?? 50,
    overlayOpacity: banner?.overlayOpacity ?? 0.4,
    textAlign: (banner?.textAlign ?? "left") as "left" | "center" | "right",
    contentWidth: (banner?.contentWidth ?? "medium") as "narrow" | "medium" | "wide",
    order: banner?.order || (isDefault ? 0 : 1),
    isActive: banner?.isActive ?? true,
    slideshowInterval: banner?.slideshowInterval || 4000,
  })
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  // Auto-dismiss success toasts after 3s; keep error toasts sticky so admin
  // doesn't miss them.
  useEffect(() => {
    if (toast?.kind !== "ok") return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.desktopBannerImage) {
      setToast({ kind: "err", text: "Desktop banner image is required." })
      return
    }
    const payload = { ...formData }
    if (isDefault) payload.order = 0
    onSave(payload)
    setToast({ kind: "ok", text: banner ? "Banner updated." : "Banner created." })
  }

  return (
    <Card className={isDefault ? "border-2 border-green-500" : ""}>
      <CardContent className="p-6">
        {isDefault && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-600 text-white">Default Banner</Badge>
              <p className="text-sm text-gray-700">This banner will be the first one to appear when the website loads</p>
            </div>
          </div>
        )}

        {toast && (
          <div
            role={toast.kind === "err" ? "alert" : "status"}
            aria-live={toast.kind === "err" ? "assertive" : "polite"}
            className={`mb-4 px-3 py-2 rounded-lg text-sm border flex items-start justify-between gap-3 ${
              toast.kind === "ok"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <span className="flex items-center gap-2">
              {toast.kind === "ok"
                ? <Check size={14} className="shrink-0" aria-hidden />
                : <X size={14} className="shrink-0" aria-hidden />}
              {toast.text}
            </span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
              className="shrink-0 rounded p-0.5 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section header — makes the three device upload zones obviously
              discoverable. Cards stack at narrow admin widths and only go
              3-up at 2xl (≥1536px). */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Banner images — one upload per device
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Desktop, tablet, and mobile each get their own creative. Recommended sizes shown on each card. Click an uploaded image and then “Set focal point” to pin where the crop centers.
            </p>
          </div>
          {/* Three device cards. Stack 1-up on most admin widths so each card is
              clearly visible as its own upload surface; only go 3-up on very
              wide monitors (2xl ≥ 1536px). */}
          <div className="grid 2xl:grid-cols-3 gap-5">
            <BannerImageCard
              device="desktop"
              url={formData.desktopBannerImage}
              alt={formData.desktopBannerAlt}
              enabled={formData.desktopBannerEnabled}
              focalX={formData.desktopFocalX}
              focalY={formData.desktopFocalY}
              onUrlChange={(u) => setFormData((p) => ({ ...p, desktopBannerImage: u }))}
              onAltChange={(a) => setFormData((p) => ({ ...p, desktopBannerAlt: a }))}
              onEnabledChange={(e) => setFormData((p) => ({ ...p, desktopBannerEnabled: e }))}
              onFocalChange={(x, y) => setFormData((p) => ({ ...p, desktopFocalX: x, desktopFocalY: y }))}
              onPreviewChange={(preview) => setFormData((p) => ({ ...p, desktopBannerImage: p.desktopBannerImage || preview }))}
            />
            <BannerImageCard
              device="tablet"
              url={formData.tabletBannerImage}
              alt={formData.tabletBannerAlt}
              enabled={formData.tabletBannerEnabled}
              focalX={formData.tabletFocalX}
              focalY={formData.tabletFocalY}
              onUrlChange={(u) => setFormData((p) => ({ ...p, tabletBannerImage: u }))}
              onAltChange={(a) => setFormData((p) => ({ ...p, tabletBannerAlt: a }))}
              onEnabledChange={(e) => setFormData((p) => ({ ...p, tabletBannerEnabled: e }))}
              onFocalChange={(x, y) => setFormData((p) => ({ ...p, tabletFocalX: x, tabletFocalY: y }))}
              onPreviewChange={(preview) => setFormData((p) => ({ ...p, tabletBannerImage: p.tabletBannerImage || preview }))}
            />
            <BannerImageCard
              device="mobile"
              url={formData.mobileBannerImage}
              alt={formData.mobileBannerAlt}
              enabled={formData.mobileBannerEnabled}
              focalX={formData.mobileFocalX}
              focalY={formData.mobileFocalY}
              onUrlChange={(u) => setFormData((p) => ({ ...p, mobileBannerImage: u }))}
              onAltChange={(a) => setFormData((p) => ({ ...p, mobileBannerAlt: a }))}
              onEnabledChange={(e) => setFormData((p) => ({ ...p, mobileBannerEnabled: e }))}
              onFocalChange={(x, y) => setFormData((p) => ({ ...p, mobileFocalX: x, mobileFocalY: y }))}
              onPreviewChange={(preview) => setFormData((p) => ({ ...p, mobileBannerImage: p.mobileBannerImage || preview }))}
            />
          </div>

          {/* Content layer controls: overlay, alignment, content width */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Hero content layer</h4>
              <p className="text-xs text-gray-500">How the heading + RFQ form sit over this banner.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {/* Overlay opacity */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Overlay darkening: <span className="font-mono">{Math.round(formData.overlayOpacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={formData.overlayOpacity}
                  onChange={(e) => setFormData((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))}
                  className="w-full accent-green-600"
                />
                <p className="text-[11px] text-gray-500 mt-1">Darkens the LEFT edge of the banner for text legibility. Use 30–50% for typical photos.</p>
              </div>
              {/* Text alignment */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Heading alignment (desktop)</label>
                <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
                  {(["left", "center", "right"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, textAlign: opt }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        formData.textAlign === opt ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100"
                      }`}
                      aria-pressed={formData.textAlign === opt}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Mobile content is always center-aligned.</p>
              </div>
              {/* Content width */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Content column width</label>
                <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
                  {(["narrow", "medium", "wide"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, contentWidth: opt }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        formData.contentWidth === opt ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100"
                      }`}
                      aria-pressed={formData.contentWidth === opt}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Constrains the heading + form column on desktop.</p>
              </div>
            </div>
          </div>

          {/* Bottom row: order + timer + slide-level isActive */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                min={isDefault ? "0" : "1"}
                required
                disabled={isDefault}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isDefault ? "Default banner is always order 0" : "Lower numbers appear first"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slideshow Timer (seconds)</label>
              <Input
                type="number"
                value={formData.slideshowInterval != null ? Math.round(formData.slideshowInterval / 1000) : 4}
                onChange={(e) => {
                  const seconds = parseInt(e.target.value, 10)
                  const ms = Number.isNaN(seconds) ? 4000 : Math.max(1, Math.min(30, seconds)) * 1000
                  setFormData({ ...formData, slideshowInterval: ms })
                }}
                min={1}
                max={30}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Seconds between slides (1–30).</p>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Slide active (kill switch for both devices)</span>
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-2 border-t border-gray-100">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={!formData.desktopBannerImage}
            >
              <Save className="mr-2" size={16} />
              {banner ? "Update Banner" : "Add Banner"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2" size={16} />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Accreditations Tab Component
function AccreditationsTab({
  accreditations,
  onAddAccreditation,
  onUpdateAccreditation,
  onDeleteAccreditation,
  isAddingAccreditation,
  setIsAddingAccreditation,
  editingAccreditation,
  setEditingAccreditation,
}: {
  accreditations: Accreditation[]
  onAddAccreditation: (accreditation: Omit<Accreditation, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onUpdateAccreditation: (accreditation: Accreditation) => void
  onDeleteAccreditation: (id: string) => void
  isAddingAccreditation: boolean
  setIsAddingAccreditation: (value: boolean) => void
  editingAccreditation: Accreditation | null
  setEditingAccreditation: (accreditation: Accreditation | null) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Accreditations Management</h2>
          <p className="text-gray-600">Manage accreditation logos that appear in the autoscroll bar</p>
        </div>
        <Button
          onClick={() => setIsAddingAccreditation(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2" size={16} />
          Add Accreditation
        </Button>
      </div>

      {isAddingAccreditation && (
        <AccreditationForm
          accreditation={null}
          onSave={onAddAccreditation}
          onCancel={() => setIsAddingAccreditation(false)}
        />
      )}

      <div className="grid gap-6">
        {accreditations
          .sort((a, b) => a.order - b.order)
          .map((accreditation) => (
            <Card key={accreditation.id} className="overflow-hidden">
              <CardContent className="p-0">
                {editingAccreditation?.id === accreditation.id ? (
                  <AccreditationForm
                    accreditation={accreditation}
                    onSave={onUpdateAccreditation}
                    onCancel={() => setEditingAccreditation(null)}
                  />
                ) : (
                  <div className="flex">
                    <div className="w-48 h-32 flex-shrink-0 bg-gray-100 flex items-center justify-center p-4">
                      <img
                        src={accreditation.logo}
                        alt="Accreditation logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Accreditation Logo</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Order: {accreditation.order}</span>
                            <span>Status: {accreditation.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingAccreditation(accreditation)}
                          >
                            <Edit className="mr-1" size={14} />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteAccreditation(accreditation.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="mr-1" size={14} />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {accreditations.length === 0 && !isAddingAccreditation && (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accreditations Yet</h3>
            <p className="text-gray-600 mb-4">Add accreditation logos to display in the autoscroll bar</p>
            <Button
              onClick={() => setIsAddingAccreditation(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2" size={16} />
              Add First Accreditation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Accreditation Form Component
function AccreditationForm({
  accreditation,
  onSave,
  onCancel,
}: {
  accreditation?: Accreditation | null
  onSave: (accreditation: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    logo: accreditation?.logo || "",
    order: accreditation?.order !== undefined ? accreditation.order : undefined,
    isActive: accreditation?.isActive ?? true,
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.logo) {
      setUploadError("Please upload a logo")
      return
    }
    onSave(formData)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Accreditation Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  setUploadError("");
                  setIsUploading(true);
                  
                  const formDataCloud = new FormData();
                  formDataCloud.append("file", file);
                  formDataCloud.append("upload_preset", "product_uploads");
                  
                  try {
                    const res = await fetch(
                      "https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload",
                      {
                        method: "POST",
                        body: formDataCloud,
                      }
                    );
                    
                    if (!res.ok) {
                      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
                    }
                    
                    const data = await res.json();
                    if (data.secure_url) {
                      setFormData({ ...formData, logo: data.secure_url });
                      setUploadError("");
                    } else {
                      throw new Error("No secure URL returned from Cloudinary");
                    }
                  } catch (error) {
                    console.error('Error uploading image:', error);
                    setUploadError(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setIsUploading(false);
                  }
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">Upload an accreditation logo image</p>
            
            {isUploading && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-600">Uploading image...</p>
              </div>
            )}
            
            {uploadError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            )}
            
            {formData.logo && !uploadError && (
              <div className="mt-2">
                <img 
                  src={formData.logo} 
                  alt="Logo preview" 
                  className="w-32 h-32 object-contain rounded-lg border bg-gray-50 p-2"
                />
                <p className="text-xs text-green-600 mt-1">✓ Logo uploaded successfully</p>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
            <Input
              type="number"
              value={formData.order !== undefined ? formData.order : ""}
              onChange={(e) => setFormData({ ...formData, order: e.target.value === "" ? undefined : parseInt(e.target.value) })}
              min="0"
              placeholder="Leave empty for end of list"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first. Leave empty to add at the end.</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActiveAccreditation"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActiveAccreditation" className="text-sm font-medium text-gray-700">
              Active (visible in autoscroll bar)
            </label>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700"
              disabled={isUploading || !formData.logo}
            >
              <Save className="mr-2" size={16} />
              {isUploading ? 'Uploading...' : (accreditation ? 'Update Accreditation' : 'Add Accreditation')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
              <X className="mr-2" size={16} />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Customers Tab Component
function CustomersTab({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  isAddingCustomer,
  setIsAddingCustomer,
  editingCustomer,
  setEditingCustomer,
}: {
  customers: Customer[]
  onAddCustomer: (c: Omit<Customer, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onUpdateCustomer: (c: Customer) => void
  onDeleteCustomer: (id: string) => void
  isAddingCustomer: boolean
  setIsAddingCustomer: (v: boolean) => void
  editingCustomer: Customer | null
  setEditingCustomer: (c: Customer | null) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Customers Management</h2>
          <p className="text-gray-600">Manage customer logos that appear in the Our Customers bar above the footer</p>
        </div>
        <Button onClick={() => setIsAddingCustomer(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="mr-2" size={16} />
          Add Customer
        </Button>
      </div>

      {isAddingCustomer && (
        <CustomerForm customer={null} onSave={onAddCustomer} onCancel={() => setIsAddingCustomer(false)} />
      )}

      <div className="grid gap-6">
        {customers.sort((a, b) => a.order - b.order).map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <CardContent className="p-0">
              {editingCustomer?.id === c.id ? (
                <CustomerForm customer={c} onSave={onUpdateCustomer} onCancel={() => setEditingCustomer(null)} />
              ) : (
                <div className="flex">
                  <div className="w-48 h-32 flex-shrink-0 bg-gray-100 flex items-center justify-center p-4">
                    <img src={c.logo} alt="Customer logo" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Logo</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Order: {c.order}</span>
                          <span>Status: {c.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingCustomer(c)}>
                          <Edit className="mr-1" size={14} /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDeleteCustomer(c.id!)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="mr-1" size={14} /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {customers.length === 0 && !isAddingCustomer && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customers Yet</h3>
            <p className="text-gray-600 mb-4">Add customer logos to display in the Our Customers bar above the footer</p>
            <Button onClick={() => setIsAddingCustomer(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2" size={16} /> Add First Customer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// About Us Page Tab Component
const ABOUT_DEFAULTS = {
  heroBadge: 'About Us',
  heroTitle: 'About 100X Circle Pvt Ltd',
  journeyHeading: 'Our Journey',
  journeyParagraph1: '',
  journeyList: '',
  journeyParagraph2: '',
  journeyStat1Value: '2015',
  journeyStat1Label: 'Founded',
  journeyStat2Value: '10K+',
  journeyStat2Label: 'Happy customers',
  journeyImage: '/new.png',
  foundationHeading: 'Our Foundation',
  foundationSubtext: 'The principles that guide our work and define our commitment to excellence.',
  missionTitle: 'Mission',
  missionDescription: '',
  visionTitle: 'Vision',
  visionDescription: '',
  valuesTitle: 'Values',
  valuesDescription: '',
  manufacturingHeading: 'Manufacturing Excellence',
  manufacturingParagraph: '',
  manufacturingStat1Value: 'ISO',
  manufacturingStat1Label: 'Certified',
  manufacturingStat2Value: '99.5%',
  manufacturingStat2Label: 'Quality Rate',
  manufacturingStat3Value: '24/7',
  manufacturingStat3Label: 'Production',
  manufacturingStat4Value: '50+',
  manufacturingStat4Label: 'Products',
  manufacturingImage: '/production.png',
}

function AboutUsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [uploadingJourney, setUploadingJourney] = useState(false)
  const [uploadingManufacturing, setUploadingManufacturing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({ ...ABOUT_DEFAULTS })

  useEffect(() => {
    fetch("/api/about-page")
      .then((res) => res.json())
      .then((data) => setForm((prev) => ({ ...ABOUT_DEFAULTS, ...prev, ...data })))
      .catch(() => setForm({ ...ABOUT_DEFAULTS }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/about-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMessage({ type: "success", text: "About Us page saved successfully." })
      } else {
        setMessage({ type: "error", text: "Failed to save" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" })
    } finally {
      setSaving(false)
    }
  }

  const uploadImage = async (file: File, field: 'journeyImage' | 'manufacturingImage') => {
    const setUploading = field === 'journeyImage' ? setUploadingJourney : setUploadingManufacturing
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("upload_preset", "product_uploads")
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      if (data.secure_url) setForm((prev) => ({ ...prev, [field]: data.secure_url }))
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">About Us Page</h2>
        <p className="text-gray-600">Edit the content and images shown on the About Us section of the website.</p>
      </div>
      <form onSubmit={handleSave} className="space-y-8">
        {/* Hero */}
        <Card>
          <CardHeader><CardTitle>Hero section</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge text</label>
              <Input value={form.heroBadge || ''} onChange={(e) => setForm((p) => ({ ...p, heroBadge: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input value={form.heroTitle || ''} onChange={(e) => setForm((p) => ({ ...p, heroTitle: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        {/* Journey */}
        <Card>
          <CardHeader><CardTitle>Our Journey</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section heading</label>
              <Input value={form.journeyHeading || ''} onChange={(e) => setForm((p) => ({ ...p, journeyHeading: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First paragraph</label>
              <AdminRichTextEditor
                value={form.journeyParagraph1 || ""}
                onChange={(v) => setForm((p) => ({ ...p, journeyParagraph1: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bullet list (one item per line)</label>
              <Textarea value={form.journeyList || ''} onChange={(e) => setForm((p) => ({ ...p, journeyList: e.target.value }))} rows={5} placeholder="Item 1&#10;Item 2" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Second paragraph</label>
              <AdminRichTextEditor
                value={form.journeyParagraph2 || ""}
                onChange={(v) => setForm((p) => ({ ...p, journeyParagraph2: v }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stat 1 value</label>
                <Input value={form.journeyStat1Value || ''} onChange={(e) => setForm((p) => ({ ...p, journeyStat1Value: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stat 1 label</label>
                <Input value={form.journeyStat1Label || ''} onChange={(e) => setForm((p) => ({ ...p, journeyStat1Label: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stat 2 value</label>
                <Input value={form.journeyStat2Value || ''} onChange={(e) => setForm((p) => ({ ...p, journeyStat2Value: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stat 2 label</label>
                <Input value={form.journeyStat2Label || ''} onChange={(e) => setForm((p) => ({ ...p, journeyStat2Label: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Journey image</label>
              <input type="file" accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-600 file:text-white" disabled={uploadingJourney} onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'journeyImage')} />
              {form.journeyImage && <p className="text-xs text-gray-500 mt-1">Current: {form.journeyImage}</p>}
              {uploadingJourney && <p className="text-sm text-blue-600">Uploading…</p>}
            </div>
          </CardContent>
        </Card>

        {/* Foundation: Mission, Vision, Values */}
        <Card>
          <CardHeader><CardTitle>Our Foundation (Mission, Vision, Values)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section heading</label>
              <Input value={form.foundationHeading || ''} onChange={(e) => setForm((p) => ({ ...p, foundationHeading: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtext</label>
              <Input value={form.foundationSubtext || ''} onChange={(e) => setForm((p) => ({ ...p, foundationSubtext: e.target.value }))} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mission title</label>
              <Input value={form.missionTitle || ''} onChange={(e) => setForm((p) => ({ ...p, missionTitle: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mission description</label>
              <AdminRichTextEditor
                value={form.missionDescription || ""}
                onChange={(v) => setForm((p) => ({ ...p, missionDescription: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vision title</label>
              <Input value={form.visionTitle || ''} onChange={(e) => setForm((p) => ({ ...p, visionTitle: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vision description</label>
              <AdminRichTextEditor
                value={form.visionDescription || ""}
                onChange={(v) => setForm((p) => ({ ...p, visionDescription: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Values title</label>
              <Input value={form.valuesTitle || ''} onChange={(e) => setForm((p) => ({ ...p, valuesTitle: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Values description</label>
              <AdminRichTextEditor
                value={form.valuesDescription || ""}
                onChange={(v) => setForm((p) => ({ ...p, valuesDescription: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Manufacturing */}
        <Card>
          <CardHeader><CardTitle>Manufacturing Excellence</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
              <Input value={form.manufacturingHeading || ''} onChange={(e) => setForm((p) => ({ ...p, manufacturingHeading: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph</label>
              <AdminRichTextEditor
                value={form.manufacturingParagraph || ""}
                onChange={(v) => setForm((p) => ({ ...p, manufacturingParagraph: v }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Value" value={form[`manufacturingStat${i}Value`] || ''} onChange={(e) => setForm((p) => ({ ...p, [`manufacturingStat${i}Value`]: e.target.value }))} />
                  <Input placeholder="Label" value={form[`manufacturingStat${i}Label`] || ''} onChange={(e) => setForm((p) => ({ ...p, [`manufacturingStat${i}Label`]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing image</label>
              <input type="file" accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-600 file:text-white" disabled={uploadingManufacturing} onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'manufacturingImage')} />
              {form.manufacturingImage && <p className="text-xs text-gray-500 mt-1">Current: {form.manufacturingImage}</p>}
              {uploadingManufacturing && <p className="text-sm text-blue-600">Uploading…</p>}
            </div>
          </CardContent>
        </Card>

        {message && <p className={message.type === "success" ? "text-green-600" : "text-red-600"}>{message.text}</p>}
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saving}>{saving ? "Saving…" : "Save About Us Page"}</Button>
      </form>
    </div>
  )
}

// Brochure Tab Component – main website brochure (e.g. "Complete Product Catalog") + note about product brochures
function BrochureTab() {
  const [mainBrochureUrl, setMainBrochureUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/brochure")
      .then((res) => res.json())
      .then((data) => setMainBrochureUrl(data?.mainBrochureUrl || ""))
      .catch(() => setMainBrochureUrl(""))
      .finally(() => setLoading(false))
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Please select a PDF file." })
      return
    }
    setUploading(true)
    setMessage(null)
    try {
      // Upload via our own server route (stores in MongoDB GridFS — avoids Cloudinary ACL issues)
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/brochure/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMainBrochureUrl("/api/brochure/download")
        setMessage({ type: "success", text: `PDF uploaded (${(file.size / 1024).toFixed(0)} KB). Brochure is now live — test it at /api/brochure/download` })
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed." })
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed." })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  // Save is now automatic after upload — the upload route sets the brochure URL in MongoDB.
  // The handleSave form is kept for manual URL override if needed.
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/brochure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainBrochureUrl: mainBrochureUrl.trim() }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: "Brochure URL saved." })
      } else {
        setMessage({ type: "error", text: "Failed to save." })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Brochure</h2>
        <p className="text-gray-600">
          Upload the <strong>main website brochure</strong> (e.g. Complete Product Catalog PDF). This is used when visitors click the &quot;Brochure&quot; button in the header. For <strong>per-product brochures</strong>, go to <strong>Products</strong> → Edit a product and use the &quot;Product Brochure (PDF)&quot; section there.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main website brochure (PDF)</label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium">
                    {uploading ? "Uploading…" : "Choose PDF file"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                {mainBrochureUrl && (
                  <>
                    <a href="/api/brochure/download" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">
                      Test brochure download ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => setMainBrochureUrl("")}
                      className="text-sm text-gray-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
            {message && (
              <p className={message.type === "success" ? "text-green-600" : "text-red-600"}>{message.text}</p>
            )}
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Video Popup Tab Component
function VideoPopupTab() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [portrait, setPortrait] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [delayMs, setDelayMs] = useState(5000)
  const [sessionOnce, setSessionOnce] = useState(true)
  const [showOnMobile, setShowOnMobile] = useState(true)
  const [showOnDesktop, setShowOnDesktop] = useState(true)
  const [autoCloseMs, setAutoCloseMs] = useState(0)
  const [hideOnPaths, setHideOnPaths] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/video-popup")
      .then((res) => res.json())
      .then((data) => {
        setYoutubeUrl(data?.youtubeUrl || "")
        setPortrait(data?.orientation !== "landscape")
        setEnabled(data?.enabled !== false)
        setDelayMs(typeof data?.delayMs === "number" ? data.delayMs : 5000)
        setSessionOnce(data?.sessionOnce !== false)
        setShowOnMobile(data?.showOnMobile !== false)
        setShowOnDesktop(data?.showOnDesktop !== false)
        setAutoCloseMs(typeof data?.autoCloseMs === "number" ? data.autoCloseMs : 0)
        setHideOnPaths(Array.isArray(data?.hideOnPaths) ? data.hideOnPaths.join(", ") : "")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const normalizePath = (raw: string) => {
      const t = raw.trim()
      try { return new URL(t).pathname } catch { return t }
    }
    const paths = hideOnPaths.split(",").map(normalizePath).filter(Boolean)
    try {
      const res = await fetch("/api/admin/video-popup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          orientation: portrait ? "portrait" : "landscape",
          enabled,
          delayMs,
          sessionOnce,
          showOnMobile,
          showOnDesktop,
          autoCloseMs,
          hideOnPaths: paths,
        }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: "Video popup settings saved." })
      } else {
        setMessage({ type: "error", text: "Failed to save" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Video Popup</h2>
        <p className="text-gray-600">Control the muted video that appears in the bottom-right corner for site visitors.</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Enable/disable */}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="vp-enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4" />
              <label htmlFor="vp-enabled" className="text-sm font-semibold text-gray-800">Enable video popup</label>
            </div>

            {/* YouTube URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">YouTube link</label>
              <Input type="url" placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full max-w-xl" />
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vp-portrait" checked={portrait} onChange={(e) => setPortrait(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4" />
              <label htmlFor="vp-portrait" className="text-sm font-medium text-gray-700">Portrait / vertical (e.g. Shorts). Uncheck for landscape.</label>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delay before showing (ms)</label>
                <Input type="number" min={0} max={60000} step={500} value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} />
                <p className="text-xs text-gray-500 mt-1">5000 = 5 seconds after page load</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto-close after (ms, 0 = never)</label>
                <Input type="number" min={0} step={1000} value={autoCloseMs} onChange={(e) => setAutoCloseMs(Number(e.target.value))} />
                <p className="text-xs text-gray-500 mt-1">30000 = auto-close after 30 seconds</p>
              </div>
            </div>

            {/* Frequency & targeting */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Frequency</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sessionOnce} onChange={(e) => setSessionOnce(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4" />
                  <span className="text-sm text-gray-700">Show once per browser session</span>
                </label>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Device targeting</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showOnMobile} onChange={(e) => setShowOnMobile(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4" />
                  <span className="text-sm text-gray-700">Show on mobile</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showOnDesktop} onChange={(e) => setShowOnDesktop(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4" />
                  <span className="text-sm text-gray-700">Show on desktop</span>
                </label>
              </div>
            </div>

            {/* Hidden paths */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hide on these paths (comma-separated)</label>
              <Input value={hideOnPaths} onChange={(e) => setHideOnPaths(e.target.value)} placeholder="/admin, /thank-you, /checkout" />
              <p className="text-xs text-gray-500 mt-1">/admin and /thank-you are always hidden regardless. Use paths only — e.g. <code>/product-page</code>, not full URLs.</p>
              {hideOnPaths && hideOnPaths.split(",").some((p) => p.trim().startsWith("http")) && (
                <p className="text-xs text-amber-600 mt-1 font-medium">⚠ Full URLs detected — they will be automatically converted to paths on save.</p>
              )}
            </div>

            {message && <p className={message.type === "success" ? "text-green-600" : "text-red-600"}>{message.text}</p>}
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Customer Form Component
function CustomerForm({
  customer,
  onSave,
  onCancel,
}: {
  customer?: Customer | null
  onSave: (c: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    logo: customer?.logo || "",
    order: customer?.order !== undefined ? customer.order : undefined,
    isActive: customer?.isActive ?? true,
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.logo) {
      setUploadError("Please upload a logo")
      return
    }
    onSave(formData)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0]
                  setUploadError("")
                  setIsUploading(true)
                  const fd = new FormData()
                  fd.append("file", file)
                  fd.append("upload_preset", "product_uploads")
                  try {
                    const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload", { method: "POST", body: fd })
                    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
                    const data = await res.json()
                    if (data.secure_url) {
                      setFormData((prev) => ({ ...prev, logo: data.secure_url }))
                      setUploadError("")
                    } else throw new Error("No secure URL")
                  } catch (err) {
                    setUploadError(`Failed: ${err instanceof Error ? err.message : "Unknown"}`)
                  } finally {
                    setIsUploading(false)
                  }
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">Upload a customer logo image</p>
            {isUploading && <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600">Uploading...</div>}
            {uploadError && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{uploadError}</div>}
            {formData.logo && !uploadError && (
              <div className="mt-2">
                <img src={formData.logo} alt="Preview" className="w-32 h-32 object-contain rounded-lg border bg-gray-50 p-2" />
                <p className="text-xs text-green-600 mt-1">✓ Logo uploaded</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
            <Input
              type="number"
              value={formData.order !== undefined ? formData.order : ""}
              onChange={(e) => setFormData({ ...formData, order: e.target.value === "" ? undefined : parseInt(e.target.value) })}
              min="0"
              placeholder="Leave empty for end of list"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first.</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActiveCustomer"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActiveCustomer" className="text-sm font-medium text-gray-700">Active (visible in Our Customers bar)</label>
          </div>
          <div className="flex space-x-3">
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isUploading || !formData.logo}>
              <Save className="mr-2" size={16} />
              {isUploading ? "Uploading..." : (customer ? "Update Customer" : "Add Customer")}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
              <X className="mr-2" size={16} /> Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── RFQ Popup Admin Tab ───────────────────────────────────────────────────

interface RFQQuestion {
  id: string
  type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox"
  label: string
  required: boolean
  placeholder: string
  options: string[]
}

function RFQPopupAdminTab() {
  const [cfg, setCfg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<"config" | "questions" | "leads">("config")

  useEffect(() => {
    fetch("/api/admin/rfq-popup")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => {})
      .finally(() => setLoading(false))
    fetch("/api/admin/rfq-popup/leads")
      .then((r) => r.json())
      .then((d) => setLeads(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLeadsLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/rfq-popup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cfg),
      })
      if (res.ok) setMsg({ type: "success", text: "Settings saved." })
      else setMsg({ type: "error", text: "Failed to save." })
    } catch {
      setMsg({ type: "error", text: "Failed to save." })
    } finally {
      setSaving(false)
    }
  }

  const updateCfg = (patch: Partial<any>) => setCfg((prev: any) => ({ ...prev, ...patch }))

  const addQuestion = () => {
    const q: RFQQuestion = { id: `q${Date.now()}`, type: "text", label: "New Question", required: false, placeholder: "", options: [] }
    updateCfg({ questions: [...(cfg?.questions || []), q] })
  }

  const updateQuestion = (idx: number, patch: Partial<RFQQuestion>) => {
    const qs = [...(cfg?.questions || [])]
    qs[idx] = { ...qs[idx], ...patch }
    updateCfg({ questions: qs })
  }

  const removeQuestion = (idx: number) => {
    const qs = [...(cfg?.questions || [])]
    qs.splice(idx, 1)
    updateCfg({ questions: qs })
  }

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const qs = [...(cfg?.questions || [])]
    const to = idx + dir
    if (to < 0 || to >= qs.length) return
    const tmp = qs[idx]; qs[idx] = qs[to]; qs[to] = tmp
    updateCfg({ questions: qs })
  }

  const exportLeads = () => {
    if (!leads.length) return
    const allKeys = Array.from(new Set(leads.flatMap((l) => Object.keys(l.answers || {}))))
    const headers = ["Date", "Page", "UTM Source", "UTM Campaign", ...allKeys]
    const rows = leads.map((l) => [
      l.createdAt,
      l.pagePath,
      l.utm?.utm_source || "",
      l.utm?.utm_campaign || "",
      ...allKeys.map((k) => { const v = l.answers?.[k]; return Array.isArray(v) ? v.join("; ") : (v ?? "") }),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rfq-popup-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-gray-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">RFQ Popup</h2>
        <p className="text-gray-600">Manage the lead-capture popup shown to visitors.</p>
      </div>

      <div className="flex gap-2 border-b">
        {(["config", "questions", "leads"] as const).map((s) => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeSection === s ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {s === "leads" ? `Leads (${leads.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {activeSection === "config" && cfg && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="rfqp-enabled" checked={cfg.enabled || false} onChange={(e) => updateCfg({ enabled: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
              <label htmlFor="rfqp-enabled" className="text-sm font-semibold text-gray-800">Enable RFQ popup</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay before showing (ms)</label>
                <Input type="number" min={0} step={500} value={cfg.delayMs || 8000} onChange={(e) => updateCfg({ delayMs: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auto-close (ms, 0 = never)</label>
                <Input type="number" min={0} step={1000} value={cfg.autoCloseMs || 0} onChange={(e) => updateCfg({ autoCloseMs: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Frequency</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfg.sessionOnce !== false} onChange={(e) => updateCfg({ sessionOnce: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Show once per session</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfg.exitIntent || false} onChange={(e) => updateCfg({ exitIntent: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Exit intent trigger (desktop)</span>
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Device targeting</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfg.showOnMobile !== false} onChange={(e) => updateCfg({ showOnMobile: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Show on mobile</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfg.showOnDesktop !== false} onChange={(e) => updateCfg({ showOnDesktop: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Show on desktop</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger on these pages only (one per line, empty = all pages)</label>
              <textarea rows={3} value={(cfg.triggerPages || []).join("\n")}
                onChange={(e) => updateCfg({ triggerPages: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })}
                placeholder="/products&#10;/blog"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hide on these pages (one per line)</label>
              <textarea rows={3} value={(cfg.hiddenPages || []).join("\n")}
                onChange={(e) => updateCfg({ hiddenPages: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })}
                placeholder="/admin&#10;/thank-you&#10;/brochure-thank-you"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead notification email</label>
              <Input type="email" value={cfg.recipientEmail || ""} onChange={(e) => updateCfg({ recipientEmail: e.target.value })} placeholder="admin@yoursite.com" className="max-w-sm" />
              <p className="text-xs text-gray-500 mt-1">Leave blank to use the system EMAIL_TO env var.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp notification number</label>
              <Input type="tel" value={cfg.notificationWhatsapp || ""} onChange={(e) => updateCfg({ notificationWhatsapp: e.target.value })} placeholder="+917827229116" className="max-w-sm" />
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g. +91...). A quick-reply WhatsApp link will be included in email alerts.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL (n8n / Zapier / Make)</label>
              <Input type="url" value={cfg.notificationWebhook || ""} onChange={(e) => updateCfg({ notificationWebhook: e.target.value })} placeholder="https://your-n8n.com/webhook/rfq" className="max-w-xl" />
              <p className="text-xs text-gray-500 mt-1">When set, every new lead POSTs the full lead JSON here. Use n8n to send WhatsApp via WhatsApp Business API. Leave blank to disable.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Frequency control</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.neverAfterSubmission !== false} onChange={(e) => updateCfg({ neverAfterSubmission: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <span className="text-sm text-gray-700">Never show again after visitor submits (stored in browser)</span>
              </label>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Document upload</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.allowFileUpload || false} onChange={(e) => updateCfg({ allowFileUpload: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <span className="text-sm text-gray-700">Allow visitors to attach a document</span>
              </label>
              {cfg.allowFileUpload && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max file size (MB)</label>
                    <Input type="number" min={1} max={50} value={cfg.maxFileSizeMb || 5} onChange={(e) => updateCfg({ maxFileSizeMb: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Allowed types (comma-separated)</label>
                    <Input value={(cfg.allowedFileTypes || []).join(",")} onChange={(e) => updateCfg({ allowedFileTypes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} placeholder=".pdf,.doc,.jpg" />
                  </div>
                </div>
              )}
            </div>
            {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
            <Button onClick={save} className="bg-green-600 hover:bg-green-700" disabled={saving}>
              {saving ? "Saving…" : "Save Config"}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeSection === "questions" && cfg && (
        <div className="space-y-4">
          {(cfg.questions || []).map((q: RFQQuestion, idx: number) => (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-700">Question {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button onClick={() => moveQuestion(idx, 1)} disabled={idx === (cfg.questions || []).length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button onClick={() => removeQuestion(idx)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                    <Input value={q.label} onChange={(e) => updateQuestion(idx, { label: e.target.value })} placeholder="Question label" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select value={q.type} onChange={(e) => updateQuestion(idx, { type: e.target.value as RFQQuestion["type"] })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Dropdown</option>
                      <option value="radio">Radio</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                    <Input value={q.placeholder || ""} onChange={(e) => updateQuestion(idx, { placeholder: e.target.value })} placeholder="Hint text" />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id={`req-${q.id}`} checked={q.required} onChange={(e) => updateQuestion(idx, { required: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                    <label htmlFor={`req-${q.id}`} className="text-sm text-gray-700">Required</label>
                  </div>
                </div>
                {["select", "radio", "checkbox"].includes(q.type) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Options (one per line)</label>
                    <textarea rows={3} value={(q.options || []).join("\n")}
                      onChange={(e) => updateQuestion(idx, { options: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="Option 1&#10;Option 2&#10;Option 3" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <Button onClick={addQuestion} variant="outline" className="w-full border-dashed border-green-400 text-green-700 hover:bg-green-50">
            <Plus className="mr-2" size={16} /> Add Question
          </Button>
          {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
          <Button onClick={save} className="bg-green-600 hover:bg-green-700" disabled={saving}>
            {saving ? "Saving…" : "Save Questions"}
          </Button>
        </div>
      )}

      {activeSection === "leads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{leads.length} lead{leads.length !== 1 ? "s" : ""} captured</p>
            <Button variant="outline" onClick={exportLeads} disabled={!leads.length} className="bg-transparent">
              <Download className="mr-2" size={16} /> Export CSV
            </Button>
          </div>
          {leadsLoading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : leads.length === 0 ? (
            <p className="text-gray-500 text-sm">No leads yet. Enable the popup and wait for submissions.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Page</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Answers</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Attachment</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">UTM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{lead.pagePath}</td>
                      <td className="px-3 py-2">
                        <div className="space-y-0.5">
                          {Object.entries(lead.answers || {}).map(([k, v]) => (
                            <div key={k} className="text-xs"><span className="text-gray-500">{k}:</span> <span className="text-gray-900">{Array.isArray(v) ? v.join(", ") : String(v)}</span></div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {lead.attachmentUrl ? (
                          <a href={lead.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                            View file
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{lead.utm?.utm_source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Legal Pages Tab ─────────────────────────────────────────────────────────

const LEGAL_PAGE_LABELS: Record<string, string> = {
  "privacy-policy": "Privacy Policy",
  "terms-and-conditions": "Terms & Conditions",
  "return-policy": "Return Policy",
  "refund-policy": "Refund Policy",
  "shipping-policy": "Shipping Policy",
  "warranty-policy": "Warranty Policy",
  "disclaimer": "Disclaimer",
  "cookie-policy": "Cookie Policy",
}

function LegalPagesTab() {
  const [selected, setSelected] = useState("privacy-policy")
  const [content, setContent] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/legal-pages")
      .then((r) => r.json())
      .then((data) => {
        const c: Record<string, string> = {}
        for (const k of Object.keys(LEGAL_PAGE_LABELS)) {
          c[k] = data[k]?.content || ""
        }
        setContent(c)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/legal-pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: selected, content: content[selected] || "" }),
      })
      if (res.ok) setMsg({ type: "success", text: "Page saved." })
      else setMsg({ type: "error", text: "Failed to save." })
    } catch {
      setMsg({ type: "error", text: "Failed to save." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Legal Pages</h2>
        <p className="text-gray-600">Edit the content of your legal / policy pages. Leave blank to use the default built-in content.</p>
      </div>
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {Object.entries(LEGAL_PAGE_LABELS).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setSelected(k); setMsg(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected === k ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{LEGAL_PAGE_LABELS[selected]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-500">
            Custom content saved here will appear on <code className="bg-gray-100 px-1 rounded">/{selected}</code>. Leave blank to show the default hardcoded content.
          </p>
          <AdminRichTextEditor
            value={content[selected] || ""}
            onChange={(v) => setContent((prev) => ({ ...prev, [selected]: v }))}
            placeholder="Enter legal page content here…"
          />
          {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
          <div className="flex gap-3">
            <Button onClick={save} className="bg-green-600 hover:bg-green-700" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => window.open(`/${selected}`, "_blank")} className="bg-transparent">
              Preview page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Settings Tab (Password Change) ──────────────────────────────────────────

function SettingsTab() {
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [emailTesting, setEmailTesting] = useState(false)
  const [emailTestResult, setEmailTestResult] = useState<any>(null)

  const strength = (pw: string) => {
    if (!pw) return 0
    let s = 0
    if (pw.length >= 8) s++
    if (pw.length >= 12) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }
  const s = strength(newPw)
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][s] || ""
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500", "bg-green-600"][s] || ""

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (newPw !== confirmPw) { setMsg({ type: "error", text: "New passwords do not match." }); return }
    if (newPw.length < 8) { setMsg({ type: "error", text: "Password must be at least 8 characters." }); return }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: "success", text: "Password changed successfully." })
        setCurrentPw(""); setNewPw(""); setConfirmPw("")
      } else {
        setMsg({ type: "error", text: data.error || "Failed to change password." })
      }
    } catch {
      setMsg({ type: "error", text: "Failed to change password." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Manage admin account settings.</p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required autoComplete="current-password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required autoComplete="new-password" />
              {newPw && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= s ? strengthColor : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{strengthLabel}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password" />
              {confirmPw && newPw !== confirmPw && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            </div>
            {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
            <Button type="submit" className="bg-green-600 hover:bg-green-700 w-full" disabled={saving || newPw !== confirmPw || !currentPw || !newPw}>
              {saving ? "Saving…" : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email Diagnostics */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Email Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Send a test email to verify your email configuration is working.
          </p>
          <p className="text-xs text-gray-500">
            Set in Vercel: <code className="bg-gray-100 px-1 rounded">EMAIL_USER</code> and <code className="bg-gray-100 px-1 rounded">EMAIL_APP_PASSWORD</code>
          </p>
          <Button
            onClick={async () => {
              setEmailTesting(true)
              setEmailTestResult(null)
              try {
                const res = await fetch("/api/admin/test-email", { method: "POST" })
                const data = await res.json()
                setEmailTestResult(data)
              } catch (e) {
                setEmailTestResult({ ok: false, error: String(e) })
              } finally {
                setEmailTesting(false)
              }
            }}
            disabled={emailTesting}
            variant="outline"
            className="bg-transparent"
          >
            {emailTesting ? "Sending…" : "Send Test Email"}
          </Button>
          {emailTestResult && (
            <div className={`rounded-lg p-3 text-sm ${emailTestResult.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {emailTestResult.ok ? (
                <p>✓ Email sent! Check inbox for <strong>{emailTestResult.EMAIL_USER}</strong></p>
              ) : (
                <div className="space-y-1">
                  <p>✗ Failed: <strong>{emailTestResult.reason || "unknown"}</strong></p>
                  {emailTestResult.error && <p className="text-xs opacity-80">{emailTestResult.error}</p>}
                  <p className="text-xs">EMAIL_USER in Vercel: {emailTestResult.EMAIL_USER || "MISSING"}</p>
                  <p className="text-xs">EMAIL_APP_PASSWORD: {emailTestResult.EMAIL_APP_PASSWORD || "MISSING"}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">System Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Check MongoDB lead counts, email config, and brochure status.</p>
          <a
            href="/api/admin/health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-green-700 underline font-medium"
          >
            Open health report →
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Trust Badges Tab ──────────────────────────────────────────────────────
function TrustBadgesTab() {
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newBadge, setNewBadge] = useState({ label: "", icon: "✓", description: "" })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    fetch("/api/admin/trust-badges")
      .then(r => r.json())
      .then(data => { setBadges(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const addBadge = async () => {
    if (!newBadge.label.trim()) return
    setSaving(true)
    const res = await fetch("/api/admin/trust-badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newBadge) })
    const created = await res.json()
    setBadges(prev => [...prev, created])
    setNewBadge({ label: "", icon: "✓", description: "" })
    setSaving(false)
    showMsg("success", `Badge "${created.label}" added. Changes visible in ~1 minute.`)
  }

  const deleteBadge = async (id: string) => {
    if (!confirm("Delete this trust badge?")) return
    await fetch(`/api/admin/trust-badges?id=${id}`, { method: "DELETE" })
    setBadges(prev => prev.filter((b: any) => b._id !== id))
    showMsg("success", "Badge deleted.")
  }

  const toggleActive = async (badge: any) => {
    const updated = { ...badge, isActive: !badge.isActive }
    await fetch("/api/admin/trust-badges", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
    setBadges(prev => prev.map((b: any) => b._id === badge._id ? { ...b, isActive: !b.isActive } : b))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Footer Trust Badges</h2>
        <p className="text-sm text-gray-500">These badges appear in the footer trust strip. Leave empty to use built-in defaults.</p>
      </div>
      {msg && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg.text}</div>}
      {loading ? <p className="text-gray-500 text-sm">Loading…</p> : (
        <div className="space-y-2">
          {badges.length === 0 && <p className="text-sm text-gray-400">No custom badges yet. Add one below, or leave empty to use site defaults.</p>}
          {badges.map((badge: any) => (
            <div key={badge._id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
              <span className="text-lg w-8 text-center shrink-0">{badge.icon || "✓"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{badge.label}</p>
                {badge.description && <p className="text-xs text-gray-500 truncate">{badge.description}</p>}
              </div>
              <button onClick={() => toggleActive(badge)} className={`text-xs px-2.5 py-1 rounded-full border ${badge.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                {badge.isActive ? "Active" : "Hidden"}
              </button>
              <button onClick={() => deleteBadge(badge._id)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-sm font-600 text-gray-800">Add New Badge</h3>
        <div className="grid grid-cols-[60px_1fr] gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Icon</label>
            <Input value={newBadge.icon} onChange={e => setNewBadge({ ...newBadge, icon: e.target.value })} placeholder="🇮🇳" className="text-center" maxLength={4} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label *</label>
            <Input value={newBadge.label} onChange={e => setNewBadge({ ...newBadge, label: e.target.value })} placeholder="Made in India" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
          <Input value={newBadge.description} onChange={e => setNewBadge({ ...newBadge, description: e.target.value })} placeholder="Proudly manufactured in Gurugram, India" />
        </div>
        <Button onClick={addBadge} disabled={saving || !newBadge.label.trim()} className="bg-green-600 hover:bg-green-700">
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
          Add Badge
        </Button>
      </div>
    </div>
  )
}
