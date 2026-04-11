"use client"

import React, { useState, useEffect } from "react"
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
  Video,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor"
import { plainTextFromHtml } from "@/lib/rich-text"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Cookies from 'js-cookie';

interface Product {
  _id?: string;
  id?: string;
  name: string;
  imageUrl?: string;
  imageUrls?: string[];
  priceRange: string;
  rating: number;
  reviewsCount: number;
  shortDescription: string;
  detailedDescription: string;
  features: string[];
  specifications: string[];
  applications: string[];
  badges: string[]; // Changed from badge: string to badges: string[]
  youtubeLink?: string; // Added YouTube link field
  whatsappMessageText: string;
  category: string;
  inStock: boolean;
  slideshowInterval?: number; // Time in milliseconds between product image slides
  order?: number; // Display order (lower numbers appear first, 0 is top)
  createdAt?: string;
  updatedAt?: string;
  brochureUrl?: string;
}

interface Banner {
  _id?: string;
  id?: string;
  image: string;
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'dtu@ananya') {
      Cookies.set('admin-token', 'authenticated', { path: '/admin' });
      setIsAuthed(true);
    } else {
      setError('Invalid password');
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
  const [categories, setCategories] = useState<string[]>(() => {
    // Try to load categories from localStorage, fallback to default categories
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-categories')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved categories:', e)
        }
      }
    }
    return [
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
      "Trolleys"
    ]
  })

  // Fetch products from API
  useEffect(() => {
    fetch("/api/admin/products")
      .then(res => res.json())
      .then(data => {
        console.log("API data:", data); // Debug log
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
        console.log("Banner API data:", data);
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
        console.log("Blog API data:", data);
        setBlogs(
          Array.isArray(data)
            ? data.map((b: any) => ({
                ...b,
                id: b._id,
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
        console.log("Accreditation API data:", data);
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
        console.log("Customer API data:", data);
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
    
    // Check if the new product has a category that's not in our categories list
    if (newProduct.category && !categories.includes(newProduct.category)) {
      console.log('Adding new category:', newProduct.category);
      const updatedCategories = [...categories, newProduct.category]
      setCategories(updatedCategories)
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin-categories', JSON.stringify(updatedCategories))
        console.log('Updated localStorage with categories:', updatedCategories);
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('categoriesUpdated'))
        console.log('Dispatched categoriesUpdated event');
      }
    }
    
    setIsAddingProduct(false)
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
    
    // Check if the updated product has a new category that's not in our categories list
    if (updatedProduct.category && !categories.includes(updatedProduct.category)) {
      const updatedCategories = [...categories, updatedProduct.category]
      setCategories(updatedCategories)
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin-categories', JSON.stringify(updatedCategories))
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('categoriesUpdated'))
      }
    }
    
    // Clean up empty categories (this will handle the old category if it's no longer used)
    cleanupEmptyCategories(updatedProducts)
    
    setEditingProduct(null)
  }

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      })
      
      // Remove the product from state
      const updatedProducts = products.filter(p => p.id !== productId)
      setProducts(updatedProducts)
      
      // Clean up empty categories
      cleanupEmptyCategories(updatedProducts)
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
        setBlogs(blogs.map(b => b.id === updated._id ? {
          ...updated,
          id: updated._id,
        } : b));
  
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

  // Utility function to clean up empty categories
  const cleanupEmptyCategories = (currentProducts: Product[]) => {
    const remainingCategories = new Set(currentProducts.map(p => p.category))
    const categoriesToRemove = categories.filter(cat => !remainingCategories.has(cat))
    
    if (categoriesToRemove.length > 0) {
      const updatedCategories = categories.filter(cat => remainingCategories.has(cat))
      setCategories(updatedCategories)
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin-categories', JSON.stringify(updatedCategories))
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('categoriesUpdated'))
      }
      
      // Show notification about removed categories
      if (categoriesToRemove.length === 1) {
        alert(`Category "${categoriesToRemove[0]}" has been removed as it no longer has any products.`)
      } else {
        alert(`Categories "${categoriesToRemove.join(', ')}" have been removed as they no longer have any products.`)
      }
      
      return true // Categories were cleaned up
    }
    return false // No cleanup needed
  }

  // Add new category
  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      const updatedCategories = [...categories, newCategory]
      setCategories(updatedCategories)
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin-categories', JSON.stringify(updatedCategories))
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('categoriesUpdated'))
      }
    }
  }

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
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Settings className="text-green-600" size={16} />
              </div>
            </div>
          </div>
        </div>
      </header>

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
                  {(product.badges || [product.badge]).slice(0, 2).map((badge, index) => (
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
                  {(product.badges || [product.badge]).length > 2 && (
                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                      +{(product.badges || [product.badge]).length - 2}
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
                      <div className="flex flex-wrap gap-2">
                        {(product.badges || [product.badge]).slice(0, 3).map((badge, index) => (
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
                        {(product.badges || [product.badge]).length > 3 && (
                          <Badge className="bg-gray-100 text-gray-600">
                            +{(product.badges || [product.badge]).length - 3} more
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
                    onClick={() => onDeleteProduct(product.id)}
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

// Category Combobox Component
function CategoryCombobox({
  value,
  onValueChange,
  categories,
  onAddCategory,
}: {
  value: string
  onValueChange: (value: string) => void
  categories: string[]
  onAddCategory: (category: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "add-new") {
      // Add new category
      if (inputValue.trim()) {
        onAddCategory(inputValue.trim())
        onValueChange(inputValue.trim())
      }
    } else {
      onValueChange(selectedValue)
      setInputValue(selectedValue)
    }
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onValueChange(newValue) // Update the form value as user types
  }

  const filteredCategories = categories.filter(category =>
    category.toLowerCase().includes(inputValue.toLowerCase())
  )

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Type or select category..."
        className="w-full"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay closing to allow clicking on dropdown items
          setTimeout(() => setOpen(false), 200)
        }}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {inputValue.trim() && !categories.includes(inputValue.trim()) && (
            <div
              className="px-3 py-2 text-sm text-green-600 hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={() => handleSelect("add-new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Use "{inputValue.trim()}" as new category
            </div>
          )}
          {filteredCategories.map((category) => (
            <div
              key={category}
              className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={() => handleSelect(category)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === category ? "opacity-100" : "opacity-0"
                )}
              />
              {category}
            </div>
          ))}
          {filteredCategories.length === 0 && !inputValue.trim() && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No categories found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Product Form Component
function ProductForm({
  product,
  categories,
  onAddCategory,
  onSave,
  onCancel,
}: {
  product?: Product | null
  categories: string[]
  onAddCategory: (category: string) => void
  onSave: (product: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    imageUrls: product?.imageUrls || [],
    priceRange: product?.priceRange || "",
    rating: product?.rating || 4.5,
    reviewsCount: product?.reviewsCount || 0,
    shortDescription: product?.shortDescription || "",
    detailedDescription: product?.detailedDescription || "",
    features: product?.features?.join("\n") || "",
    specifications: product?.specifications?.join("\n") || "",
    applications: product?.applications?.join("\n") || "",
    badges: product?.badges || [], // Changed from badge to badges array
    youtubeLink: product?.youtubeLink || "", // Added YouTube link field
    whatsappMessageText: product?.whatsappMessageText || "",
    category: product?.category || "",
    brochureUrl: product?.brochureUrl || "",
    slideshowInterval: product?.slideshowInterval || 5000, // Default 5 seconds
    order: product?.order !== undefined ? product.order : undefined, // Order field
  })
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDescriptionError("")
    if (!plainTextFromHtml(formData.shortDescription || "").trim() || !plainTextFromHtml(formData.detailedDescription || "").trim()) {
      setDescriptionError("Please add both short and detailed descriptions (not only empty formatting).")
      return
    }
    const productData = {
      ...formData,
      features: formData.features.split("\n").filter((f) => f.trim()),
      specifications: formData.specifications.split("\n").filter((s) => s.trim()),
      applications: formData.applications.split("\n").filter((a) => a.trim()),
      badges: Array.isArray(formData.badges) ? formData.badges : [], // Ensure badges is always an array
      ...(product && { id: product.id, createdAt: product.createdAt }),
    }
    onSave(productData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {descriptionError && <p className="text-sm text-red-600">{descriptionError}</p>}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <CategoryCombobox
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                categories={categories}
                onAddCategory={onAddCategory}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <Input
                value={formData.priceRange}
                onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                placeholder="₹10,000 - ₹15,000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Badges (Select multiple)</label>
              <div className="space-y-2">
                {[
                  "Korean Technology",
                  "German Technology", 
                  "Japnese Technology",
                  "GeM",
                  "Heavy Duty",
                  "Eco Friendly",
                  "Ecofreidly",
                  "BIS Approved",
                  "Best Seller",
                  "Eco-Friendly",
                  "New Launch",
                  "Budget Friendly",
                  "Precision Tech"
                ].map((badge) => (
                  <label key={badge} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.badges.includes(badge)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, badges: [...formData.badges, badge] });
                        } else {
                          setFormData({ ...formData, badges: formData.badges.filter(b => b !== badge) });
                        }
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{badge}</span>
                  </label>
                ))}
              </div>
              {formData.badges.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Badges:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.badges.map((badge, index) => (
                      <Badge key={index} className="bg-green-100 text-green-800">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: Number.parseFloat(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reviews Count</label>
              <Input
                type="number"
                min="0"
                value={formData.reviewsCount}
                onChange={(e) => setFormData({ ...formData, reviewsCount: Number.parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Images (max 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  let files = Array.from(e.target.files);
                  // Prevent more than 5 images
                  if ((formData.imageUrls?.length || 0) + files.length > 5) {
                    files = files.slice(0, 5 - (formData.imageUrls?.length || 0));
                  }
                  setUploadingImage(true);
                  const urls: string[] = [];
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
                    const data = await res.json();
                    if (data.secure_url) {
                      urls.push(data.secure_url);
                    }
                  }
                  setFormData(prev => ({
                    ...prev,
                    imageUrls: [...(prev.imageUrls || []), ...urls].slice(0, 5)
                  }));
                  setUploadingImage(false);
                }
              }}
              disabled={(formData.imageUrls?.length || 0) >= 5}
            />
            {uploadingImage && <span>Uploading images...</span>}
            {formData.imageUrls && formData.imageUrls.length > 0 && (
              <div className="mt-2 flex gap-4 flex-wrap">
                {formData.imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Product Image ${index + 1}`}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100 group-hover:opacity-100"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        imageUrls: prev.imageUrls.filter((_, i) => i !== index)
                      }))}
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border-2 border-dashed border-green-200 bg-green-50/50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Brochure (PDF)</label>
            <p className="text-xs text-gray-500 mb-3">Optional. Upload a PDF brochure for this product. Visitors can download it from the product card or product detail page.</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer">
                <span className="inline-flex items-center px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium">
                  {uploadingBrochure ? "Uploading…" : "Choose PDF file"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadingBrochure(true);
                      const file = e.target.files[0];
                      const formDataCloud = new FormData();
                      formDataCloud.append("file", file);
                      formDataCloud.append("upload_preset", "product_uploads");
                      const res = await fetch(
                        "https://api.cloudinary.com/v1_1/dhbvzugv6/raw/upload",
                        { method: "POST", body: formDataCloud }
                      );
                      const data = await res.json();
                      setFormData(prev => ({ ...prev, brochureUrl: data.secure_url || prev.brochureUrl }));
                      setUploadingBrochure(false);
                    }
                  }}
                  className="hidden"
                  disabled={uploadingBrochure}
                />
              </label>
              {formData.brochureUrl && (
                <>
                  <a href={formData.brochureUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">View Brochure</a>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, brochureUrl: "" }))}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
            <AdminRichTextEditor
              value={formData.shortDescription}
              onChange={(v) => setFormData({ ...formData, shortDescription: v })}
              placeholder="Brief product summary…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Description</label>
            <AdminRichTextEditor
              value={formData.detailedDescription}
              onChange={(v) => setFormData({ ...formData, detailedDescription: v })}
              placeholder="Full product details…"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Features (one per line)</label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                rows={4}
                placeholder="50L tank capacity&#10;Adjustable nozzle system&#10;Fuel-efficient engine"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specifications (one per line)</label>
              <Textarea
                value={formData.specifications}
                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                rows={4}
                placeholder="Engine: 2-stroke, air-cooled&#10;Tank Capacity: 50 liters&#10;Weight: 12 kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Applications (one per line)</label>
              <Textarea
                value={formData.applications}
                onChange={(e) => setFormData({ ...formData, applications: e.target.value })}
                rows={4}
                placeholder="Pest control in crops&#10;Disease prevention&#10;Fertilizer application"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Link (Optional)</label>
            <Input
              value={formData.youtubeLink}
              onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
            />
            <p className="text-xs text-gray-500 mt-1">Enter the full YouTube URL for product demo or review videos</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Message Text</label>
            <Input
              value={formData.whatsappMessageText}
              onChange={(e) => setFormData({ ...formData, whatsappMessageText: e.target.value })}
              placeholder="I'm interested in the [Product Name]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image Slideshow Timer (seconds)</label>
            <Input
              type="number"
              value={formData.slideshowInterval != null ? Math.round(formData.slideshowInterval / 1000) : 5}
              onChange={(e) => {
                const seconds = parseInt(e.target.value, 10)
                const ms = Number.isNaN(seconds) ? 5000 : Math.max(1, Math.min(30, seconds)) * 1000
                setFormData({ ...formData, slideshowInterval: ms })
              }}
              min={1}
              max={30}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Time between product image slides in <strong>seconds</strong> (1–30). Only applies if product has multiple images.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
            <Input
              type="number"
              value={formData.order !== undefined ? formData.order : ""}
              onChange={(e) => setFormData({ ...formData, order: e.target.value === "" ? undefined : parseInt(e.target.value) })}
              min="0"
              placeholder="Leave empty for top position"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first (0 is top). Leave empty to place at top. Existing products will shift down automatically.
            </p>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel} className="bg-transparent">
              <X className="mr-2" size={16} />
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="mr-2" size={16} />
              {product ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Analytics Tab Component
function AnalyticsTab({ products }: { products: Product[] }) {
  const categoryStats = products.reduce(
    (acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const badgeStats = products.reduce(
    (acc, product) => {
      const badges = product.badges || [product.badge];
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Insights</h2>
        <p className="text-gray-600">Analyze your product performance and catalog statistics</p>
      </div>

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
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">User Submissions</h2>
        <p className="text-gray-600">All contact and brochure download submissions from users</p>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">Date</th>
                <th className="px-4 py-2 border-b">Name</th>
                <th className="px-4 py-2 border-b">Phone</th>
                <th className="px-4 py-2 border-b">Type</th>
                <th className="px-4 py-2 border-b">Product</th>
                <th className="px-4 py-2 border-b">Email</th>
                <th className="px-4 py-2 border-b">Subject</th>
                <th className="px-4 py-2 border-b">Message</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s._id ? String(s._id) : `${s.name || ''}-${s.phone || ''}-${s.createdAt || ''}`} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500">{s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.phone}</td>
                  <td className="px-4 py-2 capitalize">{s.type}</td>
                  <td className="px-4 py-2">{s.productName || '-'}</td>
                  <td className="px-4 py-2">{s.email || '-'}</td>
                  <td className="px-4 py-2">{s.subject || '-'}</td>
                  <td className="px-4 py-2 max-w-xs truncate" title={s.message}>{s.message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Blogs Tab Component
function BlogsTab({
  blogs,
  onAddBlog,
  onUpdateBlog,
  onDeleteBlog,
  isAddingBlog,
  setIsAddingBlog,
  editingBlog,
  setEditingBlog,
}: {
  blogs: BlogPost[]
  onAddBlog: (blog: Omit<BlogPost, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onUpdateBlog: (blog: BlogPost) => void
  onDeleteBlog: (id: string) => void
  isAddingBlog: boolean
  setIsAddingBlog: (value: boolean) => void
  editingBlog: BlogPost | null
  setEditingBlog: (blog: BlogPost | null) => void
}) {
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
        {blogs
          .sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Number.POSITIVE_INFINITY
            const orderB = b.order !== undefined ? b.order : Number.POSITIVE_INFINITY
            if (orderA !== orderB) return orderA - orderB
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          })
          .map((blog) => (
            <Card key={blog.id} className="overflow-hidden">
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
                        src={blog.topImage || blog.image || "/placeholder.svg"}
                        alt="Blog"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{blog.title}</h3>
                        <div className="flex gap-2">
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
                    <img
                      src={defaultBanner.image}
                      alt="Default Banner"
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
            <p className="text-sm text-gray-600">These banners appear in the carousel after the default banner</p>
          </div>
          <div className="grid gap-6">
            {otherBanners.map((banner) => (
              <Card key={banner.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {editingBanner?.id === banner.id ? (
                    <BannerForm
                      banner={banner}
                      onSave={onUpdateBanner}
                      onCancel={() => setEditingBanner(null)}
                    />
                  ) : (
                    <div className="flex">
                      <div className="w-64 h-40 flex-shrink-0">
                        <img
                          src={banner.image}
                          alt="Banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Banner Image</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Order: {banner.order}</span>
                              <span>Status: {banner.isActive ? 'Active' : 'Inactive'}</span>
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
            ))}
          </div>
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
  const [formData, setFormData] = useState({
    image: banner?.image || "",
    order: banner?.order || (isDefault ? 0 : 1),
    isActive: banner?.isActive ?? true,
    slideshowInterval: banner?.slideshowInterval || 4000, // Default 4 seconds
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.image) {
      setUploadError("Please upload a banner image")
      return
    }
    // Ensure default banner has order 0
    if (isDefault) {
      formData.order = 0
    }
    onSave(formData)
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setUploadError("");
                    setIsUploading(true);
                    
                    // Create preview immediately
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setFormData({ ...formData, image: e.target?.result as string });
                    };
                    reader.readAsDataURL(file);
                    
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
                        setFormData({ ...formData, image: data.secure_url });
                        setUploadError("");
                      } else {
                        throw new Error("No secure URL returned from Cloudinary");
                      }
                    } catch (error) {
                      console.error('Error uploading image:', error);
                      setUploadError(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      // Keep the preview but show error
                    } finally {
                      setIsUploading(false);
                    }
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={isUploading}
              />
              <p className="text-xs text-gray-500 mt-1">Upload a banner image from your computer</p>
              
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
              
              {formData.image && !uploadError && (
                <div className="mt-2">
                  <img 
                    src={formData.image} 
                    alt="Banner preview" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <p className="text-xs text-green-600 mt-1">✓ Image uploaded successfully</p>
                </div>
              )}
            </div>
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
                {isDefault 
                  ? "Default banner is always order 0 (appears first)" 
                  : "Lower numbers appear first"}
              </p>
            </div>
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
            <p className="text-xs text-gray-500 mt-1">
              Time between banner slides in <strong>seconds</strong> (1–30).
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (visible on homepage)
            </label>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700"
              disabled={isUploading || !formData.image}
            >
              <Save className="mr-2" size={16} />
              {isUploading ? 'Uploading...' : (banner ? 'Update Banner' : 'Add Banner')}
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
      const formDataCloud = new FormData()
      formDataCloud.append("file", file)
      formDataCloud.append("upload_preset", "product_uploads")
      const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/raw/upload", {
        method: "POST",
        body: formDataCloud,
      })
      const data = await res.json()
      if (data.secure_url) {
        setMainBrochureUrl(data.secure_url)
        setMessage({ type: "success", text: "PDF uploaded. Click Save to use it as the main website brochure." })
      } else {
        setMessage({ type: "error", text: "Upload failed. Check Cloudinary preset allows raw/PDF uploads." })
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed." })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

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
        setMessage({ type: "success", text: "Main website brochure saved. It will be used when visitors click the header \"Brochure\" (Complete Product Catalog)." })
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
                    <a href={mainBrochureUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">
                      View current brochure
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/video-popup")
      .then((res) => res.json())
      .then((data) => {
        setYoutubeUrl(data?.youtubeUrl || "")
        setPortrait(data?.orientation !== "landscape")
      })
      .catch(() => {
        setYoutubeUrl("")
        setPortrait(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/video-popup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          orientation: portrait ? "portrait" : "landscape",
        }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: "Video popup saved. It will appear in the bottom-right (above WhatsApp) for visitors." })
      } else {
        setMessage({ type: "error", text: "Failed to save" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" })
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Video Popup</h2>
        <p className="text-gray-600">
          Set a YouTube link for the small video that plays muted in the bottom-right corner when visitors land on the site (above the WhatsApp button). Leave empty to hide it.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">YouTube link</label>
              <Input
                type="url"
                placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full max-w-xl"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="video-popup-portrait"
                checked={portrait}
                onChange={(e) => setPortrait(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="video-popup-portrait" className="text-sm font-medium text-gray-700">
                Portrait (vertical video, e.g. Shorts). Uncheck for landscape.
              </label>
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
