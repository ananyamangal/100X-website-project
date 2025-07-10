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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface Product {
  id: string
  name: string
  image: string
  price: string
  rating: number
  reviews: number
  description: string
  detailedDescription: string
  features: string[]
  specifications: string[]
  applications: string[]
  badge: string
  whatsappText: string
  category: string
  inStock: boolean
  createdAt: string
  updatedAt: string
  imageUrls?: string[]; // Added for multiple images
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [products, setProducts] = useState<Product[]>([])
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  // Initialize with sample data
  useEffect(() => {
    const sampleProducts: Product[] = [
      {
        id: "fogging-machine",
        name: "Professional Fogging Machine",
        image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
        price: "₹45,000 - ₹65,000",
        rating: 4.8,
        reviews: 124,
        description:
          "High-efficiency fogging solution for pest control and crop protection with advanced atomization technology.",
        detailedDescription:
          "Our Professional Fogging Machine represents the pinnacle of pest control technology. Engineered with precision atomization capabilities, this machine delivers consistent droplet size for maximum coverage and effectiveness.",
        features: ["50L tank capacity", "Adjustable nozzle system", "Fuel-efficient engine", "Easy maintenance"],
        specifications: [
          "Engine: 2-stroke, air-cooled, 3.5 HP",
          "Tank Capacity: 50 liters",
          "Coverage: Up to 2 acres per hour",
          "Droplet Size: 10-50 microns (adjustable)",
          "Weight: 12 kg",
        ],
        applications: [
          "Pest control in crops",
          "Disease prevention",
          "Fertilizer application",
          "Greenhouse fumigation",
        ],
        badge: "Best Seller",
        whatsappText: "I'm interested in the Professional Fogging Machine",
        category: "Spraying Equipment",
        inStock: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-15",
      },
      {
        id: "battery-sprayer",
        name: "Battery Powered Sprayer",
        image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop",
        price: "₹12,000 - ₹18,000",
        rating: 4.9,
        reviews: 89,
        description: "Eco-friendly battery sprayer with long-lasting performance and precision application control.",
        detailedDescription:
          "Experience the future of sustainable agriculture with our Battery Powered Sprayer. This eco-friendly solution eliminates the need for fuel while providing consistent, reliable performance.",
        features: ["16L capacity", "8-hour battery life", "Variable pressure control", "Lightweight design"],
        specifications: [
          "Battery: 12V 8Ah Lithium-ion",
          "Tank Capacity: 16 liters",
          "Operating Time: 8+ hours continuous",
          "Pressure Range: 1-4 bar (variable)",
          "Weight: 6 kg (including battery)",
        ],
        applications: ["Small to medium farms", "Organic farming", "Greenhouse applications", "Garden maintenance"],
        badge: "Eco-Friendly",
        whatsappText: "I'm interested in the Battery Powered Sprayer",
        category: "Spraying Equipment",
        inStock: true,
        createdAt: "2024-01-02",
        updatedAt: "2024-01-16",
      },
    ]
    setProducts(sampleProducts)
  }, [])

  const handleAddProduct = (newProduct: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    const product: Product = {
      ...newProduct,
      id: `product-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }
    setProducts([...products, product])
    setIsAddingProduct(false)
  }

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(
      products.map((p) =>
        p.id === updatedProduct.id ? { ...updatedProduct, updatedAt: new Date().toISOString().split("T")[0] } : p,
      ),
    )
    setEditingProduct(null)
  }

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      setProducts(products.filter((p) => p.id !== productId))
    }
  }

  const stats = {
    totalProducts: products.length,
    inStockProducts: products.filter((p) => p.inStock).length,
    outOfStockProducts: products.filter((p) => !p.inStock).length,
    averageRating: products.reduce((acc, p) => acc + p.rating, 0) / products.length || 0,
    totalReviews: products.reduce((acc, p) => acc + p.reviews, 0),
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
            {activeTab === "content" && <ContentTab />}
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
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-3xl font-bold text-green-600">{stats.inStockProducts}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.averageRating.toFixed(1)}</p>
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
            {recentProducts.map((product) => (
              <div key={product.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.price}</p>
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
  onAddProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => void
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
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
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
                      <Badge variant={product.inStock ? "default" : "destructive"}>
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-2">{product.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-semibold text-green-600">{product.price}</span>
                      <span className="flex items-center">
                        <Star className="text-yellow-400 fill-current mr-1" size={14} />
                        {product.rating} ({product.reviews} reviews)
                      </span>
                      <span>Category: {product.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                    className="bg-transparent"
                  >
                    {expandedProduct === product.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
              {expandedProduct === product.id && (
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
    imageUrls: (product?.imageUrls && Array.isArray(product.imageUrls))
      ? product.imageUrls.join("\n")
      : "",
    price: product?.price || "",
    rating: product?.rating || 4.5,
    reviews: product?.reviews || 0,
    description: product?.description || "",
    detailedDescription: product?.detailedDescription || "",
    features: product?.features?.join("\n") || "",
    specifications: product?.specifications?.join("\n") || "",
    applications: product?.applications?.join("\n") || "",
    badge: product?.badge || "New Launch",
    whatsappText: product?.whatsappText || "",
    category: product?.category || "",
    inStock: product?.inStock ?? true,
  })

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("type", "image");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (data.url) uploadedUrls.push(data.url);
    }
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls
        ? prev.imageUrls + "\n" + uploadedUrls.join("\n")
        : uploadedUrls.join("\n"),
    }));
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const productData = {
      ...formData,
      features: formData.features.split("\n").filter((f) => f.trim()),
      specifications: formData.specifications.split("\n").filter((s) => s.trim()),
      applications: formData.applications.split("\n").filter((a) => a.trim()),
      imageUrls: formData.imageUrls
        ? formData.imageUrls.split(/\r?\n/).map((url: string) => url.trim()).filter((url: string) => url)
        : [],
      ...(product && { id: product.id, createdAt: product.createdAt }),
    }
    onSave(productData)
  }

  // Helper: get array of image URLs from textarea
  const imageUrlArray = formData.imageUrls
    ? formData.imageUrls.split(/\r?\n/).map((url: string) => url.trim()).filter((url: string) => url)
    : [];

  // Show a preview of images just uploaded (from the returned URLs)
  // This is already handled by updating the textarea and re-parsing imageUrlArray, so nothing more is needed.

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
                <option value="Hand carried Portable Fogging Machines">Hand carried Portable Fogging Machines</option>
                <option value="Vehicle mountable Fogging Machines">Vehicle mountable Fogging Machines</option>
                <option value="Cold Foggers">Cold Foggers</option>
                <option value="Agriculture Sprayers">Agriculture Sprayers</option>
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
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="₹10,000 - ₹15,000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
              <select
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Best Seller">Best Seller</option>
                <option value="Eco-Friendly">Eco-Friendly</option>
                <option value="New Launch">New Launch</option>
                <option value="Heavy Duty">Heavy Duty</option>
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
                value={formData.reviews}
                onChange={(e) => setFormData({ ...formData, reviews: Number.parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="inStock"
                checked={formData.inStock}
                onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
                In Stock
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="block"
              />
              <Button type="button" variant="outline" className="bg-transparent" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload size={16} />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
            <Textarea
              value={formData.imageUrls}
              onChange={e => setFormData({ ...formData, imageUrls: e.target.value })}
              placeholder="https://example.com/image1.jpg\nhttps://example.com/image2.jpg"
              rows={3}
              required
            />
            {/* Image Previews */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {imageUrlArray.map((url, idx) => (
                <img key={url + idx} src={url} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded border" />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              value={formData.whatsappText}
              onChange={(e) => setFormData({ ...formData, whatsappText: e.target.value })}
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
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
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
                    <p className="text-sm text-gray-600">{product.reviews} reviews</p>
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
