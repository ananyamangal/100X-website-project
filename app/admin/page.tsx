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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  badge: string;
  whatsappMessageText: string;
  category: string;
  inStock: boolean;
  createdAt?: string;
  updatedAt?: string;
  brochureUrl?: string;
}

interface Banner {
  _id?: string;
  id?: string;
  image: string;
  title: string;
  subtitle: string;
  order: number;
  isActive: boolean;
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
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isAddingBanner, setIsAddingBanner] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBrochure, setUploadingBrochure] = useState(false)

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

  // Add product
  const handleAddProduct = async (newProduct: Omit<Product, "id" | "createdAt" | "updatedAt" | "_id">) => {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newProduct),
    })
    const created = await res.json()
    setProducts([...products, {
      ...created,
      id: created._id,
      image: created.imageUrl || created.imageUrls?.[0] || '',
      price: created.priceRange,
      reviews: created.reviewsCount,
      description: created.shortDescription,
      whatsappText: created.whatsappMessageText,
    }])
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
    setProducts(products.map(p => p.id === updated._id ? {
      ...updated,
      id: updated._id,
      image: updated.imageUrl || updated.imageUrls?.[0] || '',
      price: updated.priceRange,
      reviews: updated.reviewsCount,
      description: updated.shortDescription,
      whatsappText: updated.whatsappMessageText,
    } : p))
    setEditingProduct(null)
  }

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      })
      setProducts(products.filter(p => p.id !== productId))
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

  const stats = {
    totalProducts: products.length,
    averageRating: products.length > 0 ? (products.reduce((acc, p) => acc + (Number(p.rating) || 0), 0) / products.length).toFixed(1) : '0.0',
    totalReviews: products.reduce((acc, p) => acc + (Number(p.reviewsCount) || 0), 0).toString(),
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                <p className="text-sm text-gray-500">Manage your agricultural equipment catalog</p>
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
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "dashboard" && <DashboardTab stats={stats} products={products} />}
            {activeTab === "products" && (
              <ProductsTab
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
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
            {activeTab === "content" && <ContentTab />}
            {activeTab === "submissions" && <SubmissionsTab />}
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
                <Badge
                  className={`${
                    product.badge === "Best Seller"
                      ? "bg-red-100 text-red-800"
                      : product.badge === "Eco-Friendly"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {product.badge}
                </Badge>
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
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  isAddingProduct,
  setIsAddingProduct,
  editingProduct,
  setEditingProduct,
  expandedProduct,
  setExpandedProduct,
}: {
  products: Product[]
  onAddProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt" | "_id">) => void
  onUpdateProduct: (product: Product) => void
  onDeleteProduct: (id: string) => void
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
          <p className="text-gray-600">Add, edit, and manage your agricultural equipment catalog</p>
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
          onSave={editingProduct ? onUpdateProduct : onAddProduct}
          onCancel={() => {
            setIsAddingProduct(false)
            setEditingProduct(null)
          }}
        />
      )}

      {/* Products List */}
      <div className="space-y-4">
        {products.map((product, index) => (
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
                      <Badge
                        className={`${
                          product.badge === "Best Seller"
                            ? "bg-red-100 text-red-800"
                            : product.badge === "Eco-Friendly"
                              ? "bg-green-100 text-green-800"
                              : product.badge === "New Launch"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {product.badge}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-2">{product.shortDescription}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-semibold text-green-600">{product.priceRange}</span>
                      <span className="flex items-center">
                        <Star className="text-yellow-400 fill-current mr-1" size={14} />
                        {product.rating} ({product.reviewsCount} reviews)
                      </span>
                      <span>Category: {product.category}</span>
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

// Product Form Component
function ProductForm({
  product,
  onSave,
  onCancel,
}: {
  product?: Product | null
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
    badge: product?.badge || "",
    whatsappMessageText: product?.whatsappMessageText || "",
    category: product?.category || "",
    brochureUrl: product?.brochureUrl || "",
  })
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const productData = {
      ...formData,
      features: formData.features.split("\n").filter((f) => f.trim()),
      specifications: formData.specifications.split("\n").filter((s) => s.trim()),
      applications: formData.applications.split("\n").filter((a) => a.trim()),
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
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select Category</option>
                <option value="Vehicle mountable Fogging Machines">Vehicle mountable Fogging Machines</option>
                <option value="Cold Foggers">Cold Foggers </option>
                <option value="Agriculture Sprayers">Agriculture Sprayers</option>
                <option value="Power Weeders and  Tillers">Power Weeders and  Tillers</option>
                <option value="Brush Cutter">Brush Cutter</option>
                <option value="Lawn mower">Lawn mower</option>
                <option value="Water pumps">Water pumps</option>
                <option value="Chain Saw">Chain Saw</option>
                <option value="Chaff Cutter">Chaff Cutter</option>
                <option value="seeders">seeders</option>
                <option value="Trolleys">Trolleys</option>
               
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
              <select
                value={String(formData.badge ?? '')}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Badge</option>
                <option value="Korean Technology">Korean Technology</option>
                <option value="German Technology">German Technology</option>
                <option value="Japnese Technology">Japnese Technology</option>
                <option value="GeM">GeM</option>
                <option value="Heavy Duty">Heavy Duty</option>
                <option value="Eco Friendly">Eco Friendly</option>
                <option value="Ecofreidly">Ecofreidly</option>
                <option value="BIS Approved">BIS Approved</option>
                <option value="Best Seller">Best Seller</option>
                <option value="Eco-Friendly">Eco-Friendly</option>
                <option value="New Launch">New Launch</option>
                <option value="Budget Friendly">Budget Friendly</option>
                <option value="Precision Tech">Precision Tech</option>
              </select>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Brochure (PDF)</label>
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
                    {
                      method: "POST",
                      body: formDataCloud,
                    }
                  );
                  const data = await res.json();
                  setFormData(prev => ({ ...prev, brochureUrl: data.secure_url }));
                  setUploadingBrochure(false);
                }
              }}
            />
            {uploadingBrochure && <span>Uploading brochure...</span>}
            {formData.brochureUrl && <a href={formData.brochureUrl} target="_blank" rel="noopener noreferrer">View Brochure</a>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
            <Textarea
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Description</label>
            <Textarea
              value={formData.detailedDescription}
              onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
              rows={4}
              required
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
            <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Message Text</label>
            <Input
              value={formData.whatsappMessageText}
              onChange={(e) => setFormData({ ...formData, whatsappMessageText: e.target.value })}
              placeholder="I'm interested in the [Product Name]"
              required
            />
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
      acc[product.badge] = (acc[product.badge] || 0) + 1
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
function ContentTab() {
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
            <Button className="w-full justify-start bg-transparent" variant="outline">
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
        />
      )}

      <div className="grid gap-6">
        {banners
          .sort((a, b) => a.order - b.order)
          .map((banner) => (
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
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{banner.title}</h3>
                          <p className="text-gray-600 mb-2">{banner.subtitle}</p>
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

      {banners.length === 0 && !isAddingBanner && (
        <Card>
          <CardContent className="p-12 text-center">
            <Image className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Banners Yet</h3>
            <p className="text-gray-600 mb-4">Add your first banner to display on the homepage</p>
            <Button
              onClick={() => setIsAddingBanner(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2" size={16} />
              Add First Banner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Banner Form Component
function BannerForm({
  banner,
  onSave,
  onCancel,
}: {
  banner?: Banner | null
  onSave: (banner: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    image: banner?.image || "",
    title: banner?.title || "",
    subtitle: banner?.subtitle || "",
    order: banner?.order || 1,
    isActive: banner?.isActive ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <Input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Banner title"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
            <Textarea
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Banner subtitle"
              rows={3}
              required
            />
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
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="mr-2" size={16} />
              {banner ? 'Update Banner' : 'Add Banner'}
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
