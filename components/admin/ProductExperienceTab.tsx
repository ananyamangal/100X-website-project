"use client"
import React, { useState } from "react"
import { Plus, Trash2, Info, Upload, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// Admin form stores arrays-as-strings for textarea fields (certifications, performanceMetrics, applications).
// This helper handles both string and array inputs safely.
function toLines(val: any): string {
  if (Array.isArray(val)) return val.join("\n")
  if (typeof val === "string") return val
  return ""
}

function Helper({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-gray-400 mt-1.5 leading-relaxed">
      <Info size={11} className="mt-0.5 shrink-0 text-brand-400" />
      {text}
    </p>
  )
}

function SectionCard({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
      <h4 className="font-700 text-gray-900 text-sm mb-1">{title}</h4>
      {helper && <Helper text={helper} />}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}

interface Props {
  product: any
  onChange: (key: string, value: any) => void
}

async function uploadToCloudinary(file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("upload_preset", "product_uploads")
  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload", { method: "POST", body: fd })
    const data = await res.json()
    return data.secure_url ?? null
  } catch {
    return null
  }
}

export function ProductExperienceTab({ product, onChange }: Props) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  /* ── Film Chapters ─────────────────────────────── */
  const filmChapters: any[] = product.filmChapters || []
  const addChapter = () => onChange("filmChapters", [...filmChapters, { title: "", subtitle: "", description: "", videoUrl: "", imageUrl: "", sortOrder: filmChapters.length }])
  const updateChapter = (i: number, key: string, val: string) => {
    const updated = filmChapters.map((c, idx) => idx === i ? { ...c, [key]: val } : c)
    onChange("filmChapters", updated)
  }
  const removeChapter = (i: number) => onChange("filmChapters", filmChapters.filter((_, idx) => idx !== i))
  const uploadChapterImage = async (i: number, file: File) => {
    setUploadingIdx(i)
    const url = await uploadToCloudinary(file)
    if (url) updateChapter(i, "imageUrl", url)
    setUploadingIdx(null)
  }

  /* ── Box Contents ──────────────────────────────── */
  const boxContents: any[] = product.boxContents || []
  const addBoxItem = () => onChange("boxContents", [...boxContents, { item: "", quantity: "1", imageUrl: "" }])
  const updateBox = (i: number, key: string, val: string) => {
    const updated = boxContents.map((b, idx) => idx === i ? { ...b, [key]: val } : b)
    onChange("boxContents", updated)
  }
  const removeBox = (i: number) => onChange("boxContents", boxContents.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-0">

      {/* ── SECTION 1: HERO EXPERIENCE ────────────── */}
      <SectionCard
        title="① Hero Experience"
        helper="This creates the full-screen cinematic hero on the product page. The tagline appears under the product name. The hero video plays on the product film section below the hero."
      >
        <div>
          <label className="block text-xs font-600 text-gray-700 mb-1">Product Tagline</label>
          <Input
            value={product.tagline || ""}
            onChange={e => onChange("tagline", e.target.value)}
            placeholder="Most trusted fogging machine for municipal operations"
          />
          <Helper text="Short punchy line shown under the product name. Max 80 characters." />
        </div>
        <div>
          <label className="block text-xs font-600 text-gray-700 mb-1">Hero Video URL (YouTube)</label>
          <Input
            value={product.heroVideoUrl || ""}
            onChange={e => onChange("heroVideoUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <Helper text="This video plays in the 'Product Film' section. If not set, the main YouTube link is used." />
        </div>
      </SectionCard>

      {/* ── SECTION 2: FILM CHAPTERS ──────────────── */}
      <SectionCard
        title="② Product Film Chapters"
        helper="Create a scroll-driven storytelling journey. Each chapter appears as a section on the product page — Problem → Solution → Technology → Performance → Applications. Use these to tell the product story in a cinematic way."
      >
        {filmChapters.length === 0 && (
          <p className="text-sm text-gray-400 py-2">No chapters yet. Add chapters to create a cinematic product story.</p>
        )}
        {filmChapters.map((ch, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 relative bg-gray-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-600 text-brand-600 uppercase tracking-wide">Chapter {i + 1}</span>
              <button onClick={() => removeChapter(i)} className="text-red-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-500 text-gray-600 mb-1">Chapter Title *</label>
                <Input value={ch.title || ""} onChange={e => updateChapter(i, "title", e.target.value)} placeholder="e.g. The Problem" />
              </div>
              <div>
                <label className="block text-[11px] font-500 text-gray-600 mb-1">Subtitle</label>
                <Input value={ch.subtitle || ""} onChange={e => updateChapter(i, "subtitle", e.target.value)} placeholder="e.g. Why existing machines fail" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-500 text-gray-600 mb-1">Description</label>
              <Textarea rows={2} value={ch.description || ""} onChange={e => updateChapter(i, "description", e.target.value)} placeholder="What happens in this chapter..." />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-500 text-gray-600 mb-1">Video URL (YouTube)</label>
                <Input value={ch.videoUrl || ""} onChange={e => updateChapter(i, "videoUrl", e.target.value)} placeholder="https://www.youtube.com/..." />
              </div>
              <div>
                <label className="block text-[11px] font-500 text-gray-600 mb-1">Image</label>
                <div className="flex gap-2 items-center">
                  <Input value={ch.imageUrl || ""} onChange={e => updateChapter(i, "imageUrl", e.target.value)} placeholder="https://res.cloudinary.com/..." className="flex-1" />
                  <label className="cursor-pointer shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[11px] text-gray-600">
                    {uploadingIdx === i ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadChapterImage(i, e.target.files[0]) }} />
                    Upload
                  </label>
                </div>
                {ch.imageUrl && <img src={ch.imageUrl} className="mt-2 h-16 rounded-md object-cover border border-gray-100" alt="Chapter preview" />}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={addChapter}
          className="flex items-center gap-2 text-brand-600 hover:text-brand-700 text-sm font-500 mt-2"
        >
          <Plus size={14} /> Add Chapter
        </button>
      </SectionCard>

      {/* ── SECTION 3 & 4: PROBLEM / SOLUTION ────── */}
      <SectionCard
        title="③ Problem Statement"
        helper="Describe the operational challenge your customer faces before using this product. This appears in a dark 'The Challenge' card on the product page."
      >
        <Textarea
          rows={4}
          value={product.problem || ""}
          onChange={e => onChange("problem", e.target.value)}
          placeholder="Community fogging operations require covering thousands of homes per day. Conventional compressed-air sprayers cannot penetrate dense vegetation, drains, and enclosed spaces where mosquitoes breed..."
        />
      </SectionCard>

      <SectionCard
        title="④ Solution Story"
        helper="Describe how this product solves the problem. This appears alongside the Problem as 'The Solution' card. Write in second-person: 'Why [Product Name].' Focus on the specific engineering decisions that solve the problem."
      >
        <Textarea
          rows={4}
          value={product.solution || ""}
          onChange={e => onChange("solution", e.target.value)}
          placeholder="The 100XDB400's pulse-jet combustion engine creates sub-50 micron fog droplets that remain airborne for up to 30 minutes. The double-barrel configuration doubles coverage area without doubling operator time..."
        />
      </SectionCard>

      {/* ── SECTION 5: WHAT'S IN THE BOX ─────────── */}
      <SectionCard
        title="⑤ What's In The Box"
        helper="List every item included with the product. This appears as premium visual kit cards on the product page — after Features, before Specifications. Helps buyers understand what they receive and reduces support enquiries."
      >
        {boxContents.length === 0 && (
          <p className="text-sm text-gray-400 py-2">No items added. List everything included in the box.</p>
        )}
        {boxContents.map((b, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-50/50 rounded-lg p-3 border border-gray-100">
            <div className="flex-1 grid grid-cols-[2fr_1fr] gap-2">
              <Input value={b.item || ""} onChange={e => updateBox(i, "item", e.target.value)} placeholder="Item name (e.g. Machine Body)" />
              <Input value={b.quantity || ""} onChange={e => updateBox(i, "quantity", e.target.value)} placeholder="Qty (e.g. 1)" />
            </div>
            <Input value={b.imageUrl || ""} onChange={e => updateBox(i, "imageUrl", e.target.value)} placeholder="Image URL (optional)" className="w-56" />
            <button onClick={() => removeBox(i)} className="text-red-400 hover:text-red-600 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={addBoxItem} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 text-sm font-500 mt-1">
          <Plus size={14} /> Add Item
        </button>
      </SectionCard>

      {/* ── SECTION 6: PERFORMANCE METRICS ───────── */}
      <SectionCard
        title="⑥ Performance Metrics"
        helper="Large animated numbers shown in the 'By the numbers' section. Format: Value | Label | Description. Example: '500m² | Coverage Per Minute | At full output in open terrain'. Each metric appears as a large display number."
      >
        <label className="block text-xs font-600 text-gray-700 mb-1">Metrics (one per line)</label>
        <Textarea
          rows={5}
          value={toLines(product.performanceMetrics)}
          onChange={e => onChange("performanceMetrics", e.target.value.split("\n").filter(Boolean))}
          placeholder={"500m² | Coverage Per Minute | At full output\n2hr | Runtime | Per full tank\n50μm | Droplet Size | Sub-micron fog particles\n29 | States Served | Pan-India deployment"}
        />
        <Helper text="Format each line as: Value | Label | Description" />
      </SectionCard>

      {/* ── SECTION 7: FAQs ───────────────────────── */}
      {/* NOTE: Certifications managed via CMS → Admin > Certifications tab */}
      {/* NOTE: Applications managed via CMS → Product form > Applications Manager */}
      <SectionCard
        title="⑦ Product-Specific FAQs"
        helper="These FAQs appear in the accordion on the product page. Leave blank to show the global FAQ set."
      >
        {(() => {
          const faqs: Array<{ q: string; a: string }> = Array.isArray(product.productFaqs)
            ? product.productFaqs.map((f: any) => typeof f === "object" ? f : { q: String(f).replace(/^Q:\s*/i, ""), a: "" })
            : []
          const addFaq = () => onChange("productFaqs", [...faqs, { q: "", a: "" }])
          const updateFaq = (i: number, key: "q" | "a", val: string) =>
            onChange("productFaqs", faqs.map((f, idx) => idx === i ? { ...f, [key]: val } : f))
          const removeFaq = (i: number) => onChange("productFaqs", faqs.filter((_, idx) => idx !== i))
          const moveFaq = (i: number, dir: -1 | 1) => {
            const next = [...faqs]
            const swap = i + dir
            if (swap < 0 || swap >= next.length) return
            ;[next[i], next[swap]] = [next[swap], next[i]]
            onChange("productFaqs", next)
          }
          return (
            <div className="space-y-3">
              {faqs.length === 0 && <p className="text-sm text-gray-400 py-1">No FAQs yet. Add questions specific to this product.</p>}
              {faqs.map((f, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-600 text-brand-600 uppercase tracking-wide">FAQ {i + 1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveFaq(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[10px] px-1">▲</button>
                      <button onClick={() => moveFaq(i, 1)} disabled={i === faqs.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[10px] px-1">▼</button>
                      <button onClick={() => removeFaq(i)} className="text-red-400 hover:text-red-600 ml-1"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-500 text-gray-600 mb-1">Question</label>
                    <Input value={f.q} onChange={e => updateFaq(i, "q", e.target.value)} placeholder="e.g. What fuel does this machine use?" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-500 text-gray-600 mb-1">Answer</label>
                    <Textarea rows={2} value={f.a} onChange={e => updateFaq(i, "a", e.target.value)} placeholder="e.g. This machine runs on kerosene-based fogging oil..." />
                  </div>
                </div>
              ))}
              <button onClick={addFaq} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 text-sm font-500 mt-1">
                <Plus size={14} /> Add FAQ
              </button>
              <Helper text="Each FAQ has a Question and an Answer. Reorder with ▲▼. If left blank, the global FAQ set is shown." />
            </div>
          )
        })()}
      </SectionCard>

      {/* ── SECTION 10: WARRANTY ──────────────────── */}
      <SectionCard
        title="⑩ Warranty"
        helper="Control whether warranty information is displayed on this product page. Not all products include warranty."
      >
        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            id="warrantyEnabled"
            checked={Boolean(product.warrantyEnabled)}
            onChange={e => onChange("warrantyEnabled", e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
          />
          <label htmlFor="warrantyEnabled" className="text-sm font-500 text-gray-700 cursor-pointer">
            This product includes a warranty
          </label>
        </div>
        {Boolean(product.warrantyEnabled) && (
          <div className="space-y-3 pl-1 border-l-2 border-brand-100 ml-2">
            <div>
              <label className="block text-[11px] font-500 text-gray-600 mb-1">Warranty Period</label>
              <Input value={product.warrantyPeriod || ""} onChange={e => onChange("warrantyPeriod", e.target.value)} placeholder="e.g. 1 Year, 6 Months, 2 Years" className="max-w-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-500 text-gray-600 mb-1">Warranty Description</label>
              <Textarea rows={3} value={product.warrantyDescription || ""} onChange={e => onChange("warrantyDescription", e.target.value)} placeholder="Covers manufacturing defects and material failure. On-site service available within 48 hours in metro areas." />
            </div>
            <div>
              <label className="block text-[11px] font-500 text-gray-600 mb-1">Warranty Icon (emoji or text label)</label>
              <Input value={product.warrantyIcon || ""} onChange={e => onChange("warrantyIcon", e.target.value)} placeholder="🛡️" className="max-w-xs" />
              <Helper text="Optional. Enter an emoji or leave blank for the default shield icon." />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── SECTION 11: SEO OVERRIDES ─────────────── */}
      <SectionCard
        title="⑪ SEO & URL Settings"
        helper="Override the auto-generated SEO values for this product. The slug controls the URL. Leave fields blank to use auto-generated values."
      >
        <div>
          <label className="block text-[11px] font-500 text-gray-600 mb-1">URL Slug (auto-generated from name if blank)</label>
          <Input
            value={product.slug || ""}
            onChange={e => onChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""))}
            placeholder="e.g. double-barrel-thermal-fogging-machine"
          />
          <Helper text="The URL will be /[slug]. Use only lowercase letters, numbers, and hyphens. Changing this creates a new URL — ensure a redirect is in place." />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-gray-600 mb-1">H1 Title (overrides product name in the heading)</label>
          <Input value={product.h1Title || ""} onChange={e => onChange("h1Title", e.target.value)} placeholder="Leave blank to use product name" />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-gray-600 mb-1">SEO Title (browser tab / Google result)</label>
          <Input value={product.seoTitle || ""} onChange={e => onChange("seoTitle", e.target.value)} placeholder="e.g. Double Barrel Thermal Fogger | 100x Circle" />
        </div>
        <div>
          <label className="block text-[11px] font-500 text-gray-600 mb-1">Meta Description (≤ 155 chars)</label>
          <Textarea rows={2} value={product.metaDescription || ""} onChange={e => onChange("metaDescription", e.target.value)} placeholder="Buy the 100XDB400 double barrel vehicle-mounted thermal fogging machine..." />
          {product.metaDescription && <Helper text={`${product.metaDescription.length}/155 characters`} />}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-500 text-gray-600 mb-1">OG Title</label>
            <Input value={product.ogTitle || ""} onChange={e => onChange("ogTitle", e.target.value)} placeholder="Open Graph title (Facebook/LinkedIn share)" />
          </div>
          <div>
            <label className="block text-[11px] font-500 text-gray-600 mb-1">OG Description</label>
            <Input value={product.ogDescription || ""} onChange={e => onChange("ogDescription", e.target.value)} placeholder="Open Graph description" />
          </div>
        </div>
      </SectionCard>

    </div>
  )
}
