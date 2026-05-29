"use client"

import React, { useState, useEffect, useRef } from "react"
import { Upload, Save, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface BrandAssets {
  logoUrl: string
  logoAlt: string
  faviconUrl: string
  ogImageUrl: string
  footerLogoUrl: string
}

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload"
const UPLOAD_PRESET = "product_uploads"

const DEFAULTS: BrandAssets = {
  logoUrl: "/logo-main.png",
  logoAlt: "100x Circle",
  faviconUrl: "/logo-main.png",
  ogImageUrl: "/logo-main.png",
  footerLogoUrl: "/logo-main.png",
}

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("upload_preset", UPLOAD_PRESET)
  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: fd })
  if (!res.ok) throw new Error("Upload failed")
  const data = await res.json()
  return data.secure_url as string
}

function AssetUploader({
  label,
  description,
  value,
  onUpload,
  uploading,
}: {
  label: string
  description: string
  value: string
  onUpload: (file: File) => Promise<void>
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <p className="font-medium text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      {value && (
        <div className="relative w-24 h-24 border rounded bg-gray-50 flex items-center justify-center overflow-hidden">
          <img
            src={value}
            alt={label}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            await onUpload(file)
            e.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Upload size={14} className="mr-1.5" />
          )}
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
        {value && value !== "/logo-main.png" && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check size={12} />
            Custom image set
          </span>
        )}
      </div>

      {value && (
        <p className="text-[10px] text-gray-400 truncate">{value}</p>
      )}
    </div>
  )
}

export function BrandAssetsTab() {
  const [assets, setAssets] = useState<BrandAssets>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingField, setUploadingField] = useState<keyof BrandAssets | null>(null)

  useEffect(() => {
    fetch("/api/admin/brand-assets")
      .then((r) => r.json())
      .then((data) => setAssets({ ...DEFAULTS, ...data }))
      .catch(() => setAssets(DEFAULTS))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(field: keyof BrandAssets, file: File) {
    setUploadingField(field)
    try {
      const url = await uploadToCloudinary(file)
      setAssets((prev) => ({ ...prev, [field]: url }))
    } finally {
      setUploadingField(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/brand-assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assets),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Website Settings</h2>
        <p className="text-gray-500 mt-1">
          Manage logos, favicon, and social sharing images. Changes take effect on the next page load.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-2">Brand Images</h3>

        <AssetUploader
          label="Navbar Logo"
          description="Shown in the top navigation bar. Recommended: PNG with transparent background, min 200px wide."
          value={assets.logoUrl}
          uploading={uploadingField === "logoUrl"}
          onUpload={(f) => handleUpload("logoUrl", f)}
        />

        <AssetUploader
          label="Footer Logo"
          description="Shown in the site footer. Can be the same as the navbar logo or a white/light variant."
          value={assets.footerLogoUrl}
          uploading={uploadingField === "footerLogoUrl"}
          onUpload={(f) => handleUpload("footerLogoUrl", f)}
        />

        <AssetUploader
          label="Favicon"
          description="Browser tab icon. Recommended: square PNG or ICO, at least 48×48px."
          value={assets.faviconUrl}
          uploading={uploadingField === "faviconUrl"}
          onUpload={(f) => handleUpload("faviconUrl", f)}
        />

        <AssetUploader
          label="OG / Social Share Image"
          description="Image shown when the site is shared on WhatsApp, Facebook, LinkedIn, etc. Recommended: 1200×630px JPG."
          value={assets.ogImageUrl}
          uploading={uploadingField === "ogImageUrl"}
          onUpload={(f) => handleUpload("ogImageUrl", f)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-2">Text</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logo Alt Text
          </label>
          <Input
            value={assets.logoAlt}
            onChange={(e) => setAssets((prev) => ({ ...prev, logoAlt: e.target.value }))}
            placeholder="100x Circle"
            className="max-w-xs"
          />
          <p className="text-xs text-gray-500 mt-1">Used for screen readers and SEO.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || uploadingField !== null}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : saved ? (
            <Check size={16} className="mr-2" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </Button>
        {saved && (
          <p className="text-sm text-green-600 font-medium">
            Changes saved. Redeploy or wait for the next build to see favicon/OG updates.
          </p>
        )}
      </div>
    </div>
  )
}
