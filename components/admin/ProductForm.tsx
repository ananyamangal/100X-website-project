"use client"

import React, { useState, useEffect, useRef } from "react"
import { getProductCanonicalUrl } from "@/lib/seo/product-landing-map"
import { Plus, Save, X, ExternalLink, RotateCcw, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor"
import { FeaturesManager, type FeatureItem } from "@/components/admin/FeaturesManager"
import { SpecificationsManager, type SpecItem } from "@/components/admin/SpecificationsManager"
import { ApplicationsManager, type ApplicationItem } from "@/components/admin/ApplicationsManager"
import { SectionBuilder, type ProductSection } from "@/components/admin/SectionBuilder"
import { SectionTemplateLibrary } from "@/components/admin/SectionTemplateLibrary"
import { ProductExperienceTab } from "@/components/admin/ProductExperienceTab"
import { ImageUploadMultiField } from "@/components/admin/ImageUploadField"
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

type FormTab = "basics" | "technical" | "marketing" | "seo" | "advanced" | "history"

const FORM_TABS: { id: FormTab; label: string; description: string; editOnly?: boolean }[] = [
  { id: "basics",    label: "Basics",    description: "Name, family, category, pricing" },
  { id: "technical", label: "Technical", description: "Features, specs, applications" },
  { id: "marketing", label: "Marketing", description: "Images, descriptions, badges" },
  { id: "seo",       label: "SEO",       description: "Slug, titles, meta" },
  { id: "advanced",  label: "Advanced",  description: "Sections, cinematic content" },
  { id: "history",   label: "History",   description: "Change history and rollback", editOnly: true },
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
              <span className={cn("mr-2 inline-block w-4 h-4 text-[10px]", value === category ? "opacity-100" : "opacity-0")}>✓</span>
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
  isPublished?: boolean
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

function relativeTime(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export function ProductForm({ product, categories, onAddCategory, onSave, onCancel }: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<FormTab>("basics")
  const [descriptionError, setDescriptionError] = useState("")
  const [uploadingBrochure, setUploadingBrochure] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)
  const [seedingBadges, setSeedingBadges] = useState(false)
  const [seedingCerts, setSeedingCerts] = useState(false)
  const [cmsBadges, setCmsBadges] = useState<{ _id?: string; name: string; colorClass: string }[]>([])
  const [cmsCerts, setCmsCerts] = useState<{ _id?: string; name: string; logoUrl: string }[]>([])
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [showWarnings, setShowWarnings] = useState(false)
  const [revisions, setRevisions] = useState<any[]>([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const isFirstRender = useRef(true)

  const [formData, setFormData] = useState({
    name: product?.name || "",
    family: product?.family || "",
    imageUrls: product?.imageUrls || [] as string[],
    priceRange: product?.priceRange || "",
    rating: product?.rating || 4.5,
    reviewsCount: product?.reviewsCount || 0,
    inStock: product?.inStock ?? true,
    isPublished: product?.isPublished ?? true,
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
    ugcImages: toStringArray(product?.ugcImages),
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

  const buildProductData = () => ({
    ...formData,
    features: Array.isArray(formData.features) ? formData.features : toStringArray(formData.features as any),
    specifications: Array.isArray(formData.specifications) ? formData.specifications : toStringArray(formData.specifications as any),
    applications: Array.isArray(formData.applications) ? formData.applications : toStringArray(formData.applications as any),
    sections: Array.isArray(formData.sections) ? formData.sections : [],
    certifications: toStringArray(formData.certifications),
    certificationIds: formData.certificationIds || [],
    performanceMetrics: toStringArray(formData.performanceMetrics),
    productFaqs: Array.isArray(formData.productFaqs) ? formData.productFaqs : [],
    ugcImages: Array.isArray(formData.ugcImages) ? formData.ugcImages : toStringArray(formData.ugcImages as any),
    badges: toStringArray(formData.badges),
    family: formData.family || undefined,
    inStock: formData.inStock,
    isPublished: formData.isPublished,
    ...(product && { id: product.id, createdAt: product.createdAt }),
  })

  /* Autosave — debounced 4s, edit mode only */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const productId = product?._id || product?.id
    if (!productId) return

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus("saving")
      try {
        await fetch(`/api/admin/products/${productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Autosave": "1" },
          body: JSON.stringify(buildProductData()),
        })
        setAutosaveStatus("saved")
        setTimeout(() => setAutosaveStatus("idle"), 3000)
      } catch {
        setAutosaveStatus("idle")
      }
    }, 4000)

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [formData]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Load revisions when History tab is opened */
  useEffect(() => {
    const productId = product?._id || product?.id
    if (activeTab !== "history" || !productId) return
    setLoadingRevisions(true)
    fetch(`/api/admin/products/${productId}/revisions`)
      .then(r => r.json())
      .then(d => setRevisions(Array.isArray(d) ? d : []))
      .catch(() => setRevisions([]))
      .finally(() => setLoadingRevisions(false))
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDescriptionError("")

    // Content validation — non-blocking
    const warnings: string[] = []
    if (!formData.imageUrls?.length) warnings.push("No product images uploaded")
    if (!formData.whatsappMessageText?.trim()) warnings.push("WhatsApp message text is missing")
    const shortLen = plainTextFromHtml(formData.shortDescription || "").trim().length
    if (shortLen < 50) warnings.push(`Short description is too brief (${shortLen} chars — aim for 50+)`)
    if (!formData.ugcImages?.length) warnings.push("No deployment/UGC images — add field photos for social proof")
    if (!formData.seoTitle?.trim()) warnings.push("SEO title is missing — affects search engine ranking")
    if (!formData.metaDescription?.trim()) warnings.push("Meta description is missing — affects Google snippet")
    if (!formData.specifications?.length) warnings.push("No specifications added — helps buyers compare products")
    if (!formData.applications?.length) warnings.push("No applications listed — helps buyers find relevant use cases")

    if (warnings.length > 0) {
      setValidationWarnings(warnings)
      setShowWarnings(true)
    }

    if (
      !plainTextFromHtml(formData.shortDescription || "").trim() ||
      !plainTextFromHtml(formData.detailedDescription || "").trim()
    ) {
      setDescriptionError("Please add both short and detailed descriptions.")
      setActiveTab("marketing")
      return
    }

    onSave(buildProductData())
  }

  const handleRestore = async (revId: string) => {
    const productId = product?._id || product?.id
    if (!productId) return
    if (!confirm("Restore this version? Unsaved changes will be overwritten.")) return
    setRestoring(revId)
    try {
      const res = await fetch(`/api/admin/products/${productId}/revisions?full=1&rev=${revId}`)
      const rev = await res.json()
      if (!rev.snapshot) return
      await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rev.snapshot),
      })
      onSave(rev.snapshot)
    } catch {}
    finally { setRestoring(null) }
  }

  const tabBadge = (tab: FormTab): string | null => {
    if (tab === "marketing" && descriptionError) return "!"
    return null
  }

  const productId = product?._id || product?.id

  // Mirrors the highlight-image selection in components/product/ProductDetailV2.tsx:
  // the public gallery appends chapter images, then UGC images, deduped against
  // imageUrls and capped at 5, after the primary product photos. Admins editing
  // "Product Images" otherwise have no visibility into these — surfaced here
  // read-only so they know what's actually showing without duplicating the edit
  // controls that already live in the Advanced (chapters) and Marketing (UGC) tabs.
  const isValidImageUrl = (u: unknown): u is string => typeof u === "string" && (u.startsWith("http") || u.startsWith("/"))
  const galleryChapterCandidates = (Array.isArray(formData.filmChapters) ? formData.filmChapters : [])
    .filter((c: any) => isValidImageUrl(c?.imageUrl))
    .map((c: any) => ({ url: c.imageUrl as string, label: c?.title || "", source: "Chapter" as const }))
  const galleryUgcCandidates = (Array.isArray(formData.ugcImages) ? formData.ugcImages : [])
    .filter(isValidImageUrl)
    .map((u: string) => ({ url: u, label: "", source: "UGC" as const }))
  const galleryHighlightCandidates = [...galleryChapterCandidates, ...galleryUgcCandidates]
    .filter(c => !(formData.imageUrls || []).includes(c.url))
  const galleryHighlights = galleryHighlightCandidates.slice(0, 5)
  const galleryHiddenCount = galleryHighlightCandidates.length - galleryHighlights.length

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
          {productId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs bg-transparent"
              onClick={() => window.open(getProductCanonicalUrl(formData.slug || productId), "_blank")}
            >
              <ExternalLink size={13} className="mr-1.5" />
              Preview
            </Button>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 mt-4 overflow-x-auto">
          {FORM_TABS.filter(t => !t.editOnly || !!productId).map(tab => (
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
              {tab.id === "history" ? <History size={13} className="inline mr-1 opacity-70" /> : null}
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

          {/* Validation warnings (non-blocking amber panel) */}
          {showWarnings && validationWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-800">Content warnings (save will still proceed):</p>
                <button type="button" onClick={() => setShowWarnings(false)} className="text-amber-600 hover:text-amber-800 text-[11px]">Dismiss</button>
              </div>
              {validationWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700">⚠ {w}</p>
              ))}
            </div>
          )}

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

              <div className="grid md:grid-cols-3 gap-6">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.isPublished ? "published" : "draft"}
                    onChange={e => set("isPublished", e.target.value === "published")}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (hidden from public)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Drafts are hidden from the public products page.</p>
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
                <ImageUploadMultiField
                  value={formData.imageUrls || []}
                  onChange={urls => set("imageUrls", urls)}
                  max={5}
                  standards="JPG/PNG/WebP · max 2MB each · recommended 800×800px square"
                />
              </div>

              {/* Read-only preview: what the public gallery also pulls in from Chapters + UGC */}
              <div className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50/60">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Also Showing in Public Gallery</label>
                  <span className="text-xs text-gray-400">read-only</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  The public gallery appends up to 5 highlight photos (chapters first, then deployment/UGC) after
                  the images above. Edit these in the Advanced or Marketing tabs — shown here just so it's visible
                  in context.
                </p>
                {galleryHighlights.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No chapter or UGC images currently qualify (none added yet, or all already used above).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {galleryHighlights.map((h, i) => (
                      <button
                        type="button"
                        key={`${h.source}-${h.url}-${i}`}
                        onClick={() => setActiveTab(h.source === "Chapter" ? "advanced" : "marketing")}
                        className="group w-20 text-left"
                        title={`Edit in ${h.source === "Chapter" ? "Advanced" : "Marketing"} tab`}
                      >
                        <div className="relative">
                          <img src={h.url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 group-hover:opacity-80" />
                          <span
                            className={cn(
                              "absolute top-1 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              h.source === "Chapter" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {h.source}
                          </span>
                        </div>
                        {h.label && <p className="text-[10px] text-gray-500 mt-1 truncate">{h.label}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {galleryHiddenCount > 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    +{galleryHiddenCount} more chapter/UGC image{galleryHiddenCount === 1 ? "" : "s"} not shown — the gallery caps highlights at 5.
                  </p>
                )}
              </div>

              {/* Brochure */}
              <div className="p-4 rounded-lg border-2 border-dashed border-green-200 bg-green-50/50">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Brochure (PDF)</label>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium">
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

              {/* UGC / Deployment Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deployment / UGC Images
                </label>
                <ImageUploadMultiField
                  value={Array.isArray(formData.ugcImages) ? formData.ugcImages : []}
                  onChange={urls => set("ugcImages", urls)}
                  max={20}
                  standards="JPG/PNG · max 5MB each · landscape preferred · customer deployment photos"
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
                <textarea
                  rows={2}
                  value={formData.metaDescription}
                  onChange={e => set("metaDescription", e.target.value)}
                  placeholder="Buy the BF-105 ULV cold fogger…"
                  maxLength={160}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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

          {/* ── HISTORY TAB ────────────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">Change History</h4>
                <p className="text-xs text-gray-500">Up to 20 saved versions. Click Restore to revert to a previous state.</p>
              </div>
              {loadingRevisions ? (
                <p className="text-sm text-gray-400 py-4">Loading revisions…</p>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <History size={20} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No revisions yet. Revisions are saved automatically on each update.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {revisions.map((rev: any) => {
                    const savedAt = new Date(rev.savedAt)
                    return (
                      <div key={rev._id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {savedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{" "}
                            {savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-xs text-gray-400">{relativeTime(savedAt)}</p>
                        </div>
                        <button
                          type="button"
                          disabled={restoring === rev._id}
                          onClick={() => handleRestore(rev._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 transition-colors"
                        >
                          <RotateCcw size={11} />
                          {restoring === rev._id ? "Restoring…" : "Restore"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Always-visible footer */}
          <div className="flex justify-between items-center pt-6 border-t mt-6">
            <div className="flex gap-2 items-center">
              {FORM_TABS.filter(t => !t.editOnly || !!productId).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 text-xs rounded-md ${activeTab === tab.id ? "bg-green-100 text-green-700 font-medium" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {tab.label}
                </button>
              ))}
              {autosaveStatus === "saving" && <span className="text-xs text-gray-400 ml-2">Saving…</span>}
              {autosaveStatus === "saved" && <span className="text-xs text-green-600 ml-2">✓ Autosaved</span>}
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
