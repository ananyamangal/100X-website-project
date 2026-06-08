"use client"

import React, { useState, useEffect } from "react"
import { Plus, Save, X, Upload, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor"
import { FeaturesManager, type FeatureItem } from "@/components/admin/FeaturesManager"
import { SpecificationsManager, type SpecItem } from "@/components/admin/SpecificationsManager"
import { ApplicationsManager, type ApplicationItem } from "@/components/admin/ApplicationsManager"
import { SectionBuilder, type ProductSection } from "@/components/admin/SectionBuilder"
import { SectionTemplateLibrary } from "@/components/admin/SectionTemplateLibrary"
import { ProductExperienceTab } from "@/components/admin/ProductExperienceTab"
import { toStringArray } from "@/lib/normalizeProduct"
import { plainTextFromHtml } from "@/lib/rich-text"
import { cn } from "@/lib/utils"

const PRODUCT_FAMILIES = [
  "BF Series",
  "DB Series",
  "Agriculture",
  "Tools & Equipment",
  "Other",
]

type FormTab = "basics" | "technical" | "marketing" | "seo" | "advanced"

const FORM_TABS: { id: FormTab; label: string; description: string }[] = [
  { id: "basics",    label: "Basics",    description: "Name, family, category, pricing" },
  { id: "technical", label: "Technical", description: "Features, specs, applications" },
  { id: "marketing", label: "Marketing", description: "Images, descriptions, badges" },
  { id: "seo",       label: "SEO",       description: "Slug, titles, meta" },
  { id: "advanced",  label: "Advanced",  description: "Sections, cinematic content" },
]

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

  useEffect(() => { setInputValue(value) }, [value])

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "add-new") {
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

  const filteredCategories = categories.filter(c => c.toLowerCase().includes(inputValue.toLowerCase()))

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); onValueChange(e.target.value) }}
        placeholder="Type or select category..."
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {inputValue.trim() && !categories.includes(inputValue.trim()) && (
            <div className="px-3 py-2 text-sm text-green-600 hover:bg-gray-100 cursor-pointer flex items-center" onClick={() => handleSelect("add-new")}>
              <Plus className="mr-2 h-4 w-4" />
              Use "{inputValue.trim()}" as new category
            </div>
          )}
          {filteredCategories.map(category => (
            <div key={category} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center" onClick={() => handleSelect(category)}>
              <Check className={cn("mr-2 h-4 w-4", value === category ? "opacity-100" : "opacity-0")} />
              {category}
            </div>
          ))}
          {filteredCategories.length === 0 && !inputValue.trim() && (
            <div className="px-3 py-2 text-sm text-gray-500">No categories found</div>
          )}
        </div>
      )}
    </div>
  )
}

interface ProductData {
  _id?: string
  id?: string
  name?: string
  family?: string
  imageUrls?: string[]
  priceRange?: string
  rating?: number
  reviewsCount?: number
  inStock?: boolean
  shortDescription?: string
  detailedDescription?: string
  features?: any[]
  specifications?: any[]
  applications?: any[]
  sections?: any[]
  badges?: string[] | any
  youtubeLink?: string
  whatsappMessageText?: string
  category?: string
  brochureUrl?: string
  slideshowInterval?: number
  order?: number
  createdAt?: string
  tagline?: string
  heroVideoUrl?: string
  problem?: string
  solution?: string
  certifications?: string[] | any
  certificationIds?: string[]
  performanceMetrics?: string[] | any
  filmChapters?: any[]
  boxContents?: any[]
  productFaqs?: Array<{ q: string; a: string }>
  warrantyEnabled?: boolean
  warrantyPeriod?: string
  warrantyDescription?: string
  warrantyIcon?: string
  ugcImages?: string[] | any
  slug?: string
  seoTitle?: string
  metaDescription?: string
  h1Title?: string
  ogTitle?: string
  ogDescription?: string
}

interface ProductFormProps {
  product?: ProductData | null
  categories: string[]
  onAddCategory: (category: string) => void
  onSave: (product: any) => void
  onCancel: () => void
}

export function ProductForm({ product, categories, onAddCategory, onSave, onCancel }: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<FormTab>("basics")
  const [descriptionError, setDescriptionError] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBrochure, setUploadingBrochure] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)
  const [seedingBadges, setSeedingBadges] = useState(false)
  const [seedingCerts, setSeedingCerts] = useState(false)
  const [cmsBadges, setCmsBadges] = useState<{ _id?: string; name: string; colorClass: string }[]>([])
  const [cmsCerts, setCmsCerts] = useState<{ _id?: string; name: string; logoUrl: string }[]>([])

  const [formData, setFormData] = useState({
    name: product?.name || "",
    family: product?.family || "",
    imageUrls: product?.imageUrls || [] as string[],
    priceRange: product?.priceRange || "",
    rating: product?.rating || 4.5,
    reviewsCount: product?.reviewsCount || 0,
    inStock: product?.inStock ?? true,
    shortDescription: product?.shortDescription || "",
    detailedDescription: product?.detailedDescription || "",
    features: Array.isArray(product?.features) ? product.features : [],
    specifications: Array.isArray(product?.specifications) ? product.specifications : [],
    applications: Array.isArray(product?.applications) ? product.applications : [],
    sections: Array.isArray(product?.sections) ? product.sections : [],
    badges: toStringArray(product?.badges),
    youtubeLink: product?.youtubeLink || "",
    whatsappMessageText: product?.whatsappMessageText || "",
    category: product?.category || "",
    brochureUrl: product?.brochureUrl || "",
    slideshowInterval: product?.slideshowInterval || 5000,
    order: product?.order !== undefined ? product.order : undefined as number | undefined,
    tagline: product?.tagline || "",
    heroVideoUrl: product?.heroVideoUrl || "",
    problem: product?.problem || "",
    solution: product?.solution || "",
    certifications: toStringArray(product?.certifications).join("\n"),
    certificationIds: Array.isArray(product?.certificationIds) ? (product.certificationIds as string[]) : [],
    performanceMetrics: toStringArray(product?.performanceMetrics).join("\n"),
    filmChapters: Array.isArray(product?.filmChapters) ? product.filmChapters : [],
    boxContents: Array.isArray(product?.boxContents) ? product.boxContents : [],
    productFaqs: Array.isArray(product?.productFaqs) ? product.productFaqs : [],
    warrantyEnabled: product?.warrantyEnabled ?? false,
    warrantyPeriod: product?.warrantyPeriod || "",
    warrantyDescription: product?.warrantyDescription || "",
    warrantyIcon: product?.warrantyIcon || "",
    ugcImages: toStringArray(product?.ugcImages).join("\n"),
    slug: product?.slug || "",
    seoTitle: product?.seoTitle || "",
    metaDescription: product?.metaDescription || "",
    h1Title: product?.h1Title || "",
    ogTitle: product?.ogTitle || "",
    ogDescription: product?.ogDescription || "",
  })

  const reloadBadges = () =>
    fetch("/api/admin/product-badges").then(r => r.json()).then(d => { if (Array.isArray(d)) setCmsBadges(d) }).catch(() => {})
  const reloadCerts = () =>
    fetch("/api/admin/certifications").then(r => r.json()).then(d => { if (Array.isArray(d)) setCmsCerts(d) }).catch(() => {})

  const seedBadges = async () => {
    setSeedingBadges(true)
    await fetch("/api/admin/product-badges/seed", { method: "POST" }).catch(() => {})
    await reloadBadges()
    setSeedingBadges(false)
  }

  const seedCerts = async () => {
    setSeedingCerts(true)
    await fetch("/api/admin/certifications/seed", { method: "POST" }).catch(() => {})
    await reloadCerts()
    setSeedingCerts(false)
  }

  useEffect(() => { reloadBadges(); reloadCerts() }, [])

  const set = (key: string, value: any) => setFormData(p => ({ ...p, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDescriptionError("")
    if (
      !plainTextFromHtml(formData.shortDescription || "").trim() ||
      !plainTextFromHtml(formData.detailedDescription || "").trim()
    ) {
      setDescriptionError("Please add both short and detailed descriptions.")
      setActiveTab("marketing")
      return
    }
    const productData = {
      ...formData,
      features: Array.isArray(formData.features) ? formData.features : toStringArray(formData.features as any),
      specifications: Array.isArray(formData.specifications) ? formData.specifications : toStringArray(formData.specifications as any),
      applications: Array.isArray(formData.applications) ? formData.applications : toStringArray(formData.applications as any),
      sections: Array.isArray(formData.sections) ? formData.sections : [],
      certifications: toStringArray(formData.certifications),
      certificationIds: formData.certificationIds || [],
      performanceMetrics: toStringArray(formData.performanceMetrics),
      productFaqs: Array.isArray(formData.productFaqs) ? formData.productFaqs : [],
      ugcImages: toStringArray(formData.ugcImages),
      badges: toStringArray(formData.badges),
      family: formData.family || undefined,
      inStock: formData.inStock,
      ...(product && { id: product.id, createdAt: product.createdAt }),
    }
    onSave(productData)
  }

  const tabBadge = (tab: FormTab): string | null => {
    if (tab === "marketing" && descriptionError) return "!"
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 mt-4 overflow-x-auto">
          {FORM_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tabBadge(tab.id) && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {tabBadge(tab.id)}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {descriptionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{descriptionError}</p>
          )}

          {/* ── BASICS TAB ─────────────────────────────────────────── */}
          {activeTab === "basics" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <Input
                    value={formData.name}
                    onChange={e => set("name", e.target.value)}
                    required
                    placeholder="e.g. BF-105 ULV Cold Fogger"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Family</label>
                  <select
                    value={formData.family}
                    onChange={e => set("family", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">— None / Standalone —</option>
                    {PRODUCT_FAMILIES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Groups BF105, BF115, BF150, BF200, BF400 under "BF Series" etc.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <CategoryCombobox
                    value={formData.category}
                    onValueChange={v => set("category", v)}
                    categories={categories}
                    onAddCategory={onAddCategory}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range *</label>
                  <Input
                    value={formData.priceRange}
                    onChange={e => set("priceRange", e.target.value)}
                    placeholder="₹10,000 - ₹15,000"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <Input
                    type="number"
                    min="1" max="5" step="0.1"
                    value={formData.rating}
                    onChange={e => set("rating", parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reviews Count</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.reviewsCount}
                    onChange={e => set("reviewsCount", parseInt(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">In Stock</label>
                  <div className="flex items-center gap-3 h-10">
                    <input
                      type="checkbox"
                      id="inStock"
                      checked={formData.inStock}
                      onChange={e => set("inStock", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label htmlFor="inStock" className="text-sm text-gray-700 cursor-pointer">
                      {formData.inStock ? "Available" : "Out of stock"}
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <Input
                    type="number"
                    value={formData.order !== undefined ? formData.order : ""}
                    onChange={e => set("order", e.target.value === "" ? undefined : parseInt(e.target.value))}
                    min="0"
                    placeholder="Leave empty for top position"
                  />
                  <p className="text-xs text-gray-400 mt-1">Lower = first. Leave empty for top.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slideshow Timer (seconds)</label>
                  <Input
                    type="number"
                    value={formData.slideshowInterval != null ? Math.round(formData.slideshowInterval / 1000) : 5}
                    onChange={e => {
                      const s = parseInt(e.target.value, 10)
                      set("slideshowInterval", Number.isNaN(s) ? 5000 : Math.max(1, Math.min(30, s)) * 1000)
                    }}
                    min={1} max={30}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Seconds between image slides (1–30).</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TECHNICAL TAB ──────────────────────────────────────── */}
          {activeTab === "technical" && (
            <div className="space-y-6">
              <FeaturesManager
                value={formData.features}
                onChange={(items: FeatureItem[]) => set("features", items)}
              />
              <SpecificationsManager
                value={formData.specifications}
                onChange={(items: SpecItem[]) => set("specifications", items)}
              />
              <ApplicationsManager
                value={formData.applications}
                onChange={(items: ApplicationItem[]) => set("applications", items)}
              />
            </div>
          )}

          {/* ── MARKETING TAB ──────────────────────────────────────── */}
          {activeTab === "marketing" && (
            <div className="space-y-6">
              {/* Badges + Certifications side by side */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Badges</label>
                  </div>
                  {cmsBadges.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-2">
                      <p className="text-xs text-amber-700 font-medium">Badge CMS is empty.</p>
                      <button type="button" onClick={seedBadges} disabled={seedingBadges}
                        className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 disabled:opacity-50">
                        {seedingBadges ? "Importing…" : "⚡ Import badges from products"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {cmsBadges.map(badge => (
                        <label key={badge.name} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.badges.includes(badge.name)}
                            onChange={e => {
                              if (e.target.checked) set("badges", [...formData.badges, badge.name])
                              else set("badges", formData.badges.filter((b: string) => b !== badge.name))
                            }}
                            className="rounded border-gray-300 text-green-600"
                          />
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.colorClass || "bg-gray-100 text-gray-700"}`}>
                            {badge.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {formData.badges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {formData.badges.map((b: string, i: number) => (
                        <Badge key={i} className="bg-green-100 text-green-800 text-xs">{b}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Certifications</label>
                  </div>
                  {cmsCerts.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-2">
                      <p className="text-xs text-amber-700 font-medium">Certifications CMS is empty.</p>
                      <button type="button" onClick={seedCerts} disabled={seedingCerts}
                        className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 disabled:opacity-50">
                        {seedingCerts ? "Importing…" : "⚡ Import certifications from products"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {cmsCerts.map(cert => (
                        <label key={String(cert._id)} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.certificationIds.includes(String(cert._id))}
                            onChange={e => {
                              const id = String(cert._id)
                              if (e.target.checked) set("certificationIds", [...formData.certificationIds, id])
                              else set("certificationIds", formData.certificationIds.filter((c: string) => c !== id))
                            }}
                            className="rounded border-gray-300 text-green-600"
                          />
                          {cert.logoUrl && <img src={cert.logoUrl} alt={cert.name} className="h-4 object-contain" />}
                          <span className="text-sm text-gray-700">{cert.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images (max 5)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={(formData.imageUrls?.length || 0) >= 5}
                  onChange={async e => {
                    if (!e.target.files?.length) return
                    let files = Array.from(e.target.files)
                    if ((formData.imageUrls?.length || 0) + files.length > 5) {
                      files = files.slice(0, 5 - (formData.imageUrls?.length || 0))
                    }
                    setUploadingImage(true)
                    const urls: string[] = []
                    for (const file of files) {
                      const fd = new FormData()
                      fd.append("file", file)
                      fd.append("upload_preset", "product_uploads")
                      const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload", { method: "POST", body: fd })
                      const data = await res.json()
                      if (data.secure_url) urls.push(data.secure_url)
                    }
                    setFormData(p => ({ ...p, imageUrls: [...(p.imageUrls || []), ...urls].slice(0, 5) }))
                    setUploadingImage(false)
                  }}
                />
                {uploadingImage && <span className="text-xs text-gray-500">Uploading…</span>}
                {formData.imageUrls?.length > 0 && (
                  <div className="mt-2 flex gap-3 flex-wrap">
                    {formData.imageUrls.map((url: string, i: number) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Image ${i + 1}`} className="w-24 h-24 object-cover rounded-lg" />
                        <button type="button"
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-80 hover:opacity-100"
                          onClick={() => setFormData(p => ({ ...p, imageUrls: p.imageUrls.filter((_: string, idx: number) => idx !== i) }))}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Brochure */}
              <div className="p-4 rounded-lg border-2 border-dashed border-green-200 bg-green-50/50">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Brochure (PDF)</label>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium">
                      <Upload size={14} className="mr-1.5" />
                      {uploadingBrochure ? "Uploading…" : "Choose PDF"}
                    </span>
                    <input type="file" accept="application/pdf" className="hidden" disabled={uploadingBrochure}
                      onChange={async e => {
                        if (!e.target.files?.[0]) return
                        setUploadingBrochure(true)
                        const fd = new FormData()
                        fd.append("file", e.target.files[0])
                        const res = await fetch("/api/admin/upload-file", { method: "POST", body: fd })
                        const data = await res.json()
                        if (res.ok && data.url) set("brochureUrl", data.url)
                        setUploadingBrochure(false)
                      }}
                    />
                  </label>
                  {formData.brochureUrl && (
                    <>
                      <a href={formData.brochureUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">View</a>
                      <button type="button" onClick={() => set("brochureUrl", "")} className="text-sm text-gray-500 hover:text-red-600">Remove</button>
                    </>
                  )}
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Short Description *</label>
                <AdminRichTextEditor
                  value={formData.shortDescription}
                  onChange={v => set("shortDescription", v)}
                  placeholder="Brief product summary…"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Description *</label>
                <AdminRichTextEditor
                  value={formData.detailedDescription}
                  onChange={v => set("detailedDescription", v)}
                  placeholder="Full product details…"
                />
              </div>

              {/* UGC Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deployment / UGC Images <span className="text-xs text-gray-400 font-normal">(one URL per line)</span>
                </label>
                <Textarea
                  value={formData.ugcImages as any}
                  onChange={e => set("ugcImages", e.target.value as any)}
                  placeholder={"https://…/photo1.jpg\nhttps://…/photo2.jpg"}
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>

              {/* YouTube + WhatsApp */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Link</label>
                  <Input
                    value={formData.youtubeLink}
                    onChange={e => set("youtubeLink", e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    type="url"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Message Text *</label>
                  <Input
                    value={formData.whatsappMessageText}
                    onChange={e => set("whatsappMessageText", e.target.value)}
                    placeholder="I'm interested in the [Product Name]"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── SEO TAB ────────────────────────────────────────────── */}
          {activeTab === "seo" && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">All fields are optional — leave blank to use auto-generated values.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <Input
                  value={formData.slug}
                  onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""))}
                  placeholder="e.g. bf-105-ulv-cold-fogger"
                />
                <p className="text-xs text-gray-400 mt-1">URL: /[slug]. Change with care — requires a redirect.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">H1 Title</label>
                <Input
                  value={formData.h1Title}
                  onChange={e => set("h1Title", e.target.value)}
                  placeholder="Leave blank to use product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title (browser tab / Google)</label>
                <Input
                  value={formData.seoTitle}
                  onChange={e => set("seoTitle", e.target.value)}
                  placeholder="e.g. BF-105 ULV Cold Fogger | 100x Circle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description {formData.metaDescription && <span className="text-xs font-normal text-gray-400">({formData.metaDescription.length}/155)</span>}
                </label>
                <Textarea
                  rows={2}
                  value={formData.metaDescription}
                  onChange={e => set("metaDescription", e.target.value)}
                  placeholder="Buy the BF-105 ULV cold fogger…"
                  maxLength={160}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
                  <Input
                    value={formData.ogTitle}
                    onChange={e => set("ogTitle", e.target.value)}
                    placeholder="Open Graph title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
                  <Input
                    value={formData.ogDescription}
                    onChange={e => set("ogDescription", e.target.value)}
                    placeholder="Open Graph description"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── ADVANCED TAB ───────────────────────────────────────── */}
          {activeTab === "advanced" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-800">Page Section Builder</h4>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">Layout</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Build the product page structure with section blocks.</p>
                <SectionBuilder
                  value={formData.sections as ProductSection[] || []}
                  onChange={(sections: ProductSection[]) => set("sections", sections)}
                  onOpenTemplates={() => setShowTemplateLibrary(true)}
                />
                <SectionTemplateLibrary
                  open={showTemplateLibrary}
                  onClose={() => setShowTemplateLibrary(false)}
                  onUseTemplate={(section: ProductSection) => {
                    setFormData(p => ({ ...p, sections: [...(p.sections || []), { ...section, order: (p.sections || []).length }] }))
                  }}
                />
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-800">Product Experience Builder</h4>
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">Cinematic</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Hero video, film chapters, problem/solution, FAQs, warranty.</p>
                <ProductExperienceTab
                  product={formData}
                  onChange={(key, value) => set(key, value)}
                  hideSeoSection={true}
                />
              </div>
            </div>
          )}

          {/* Always-visible footer */}
          <div className="flex justify-between items-center pt-6 border-t mt-6">
            <div className="flex gap-2">
              {FORM_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 text-xs rounded-md ${activeTab === tab.id ? "bg-green-100 text-green-700 font-medium" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onCancel} className="bg-transparent">
                <X className="mr-2" size={16} />
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2" size={16} />
                {product ? "Update Product" : "Add Product"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
