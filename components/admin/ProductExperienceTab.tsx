"use client"
import React, { useState } from "react"
import { Plus, Trash2, Info } from "lucide-react"
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

export function ProductExperienceTab({ product, onChange }: Props) {
  /* ── Film Chapters ─────────────────────────────── */
  const filmChapters: any[] = product.filmChapters || []
  const addChapter = () => onChange("filmChapters", [...filmChapters, { title: "", subtitle: "", description: "", videoUrl: "", imageUrl: "", sortOrder: filmChapters.length }])
  const updateChapter = (i: number, key: string, val: string) => {
    const updated = filmChapters.map((c, idx) => idx === i ? { ...c, [key]: val } : c)
    onChange("filmChapters", updated)
  }
  const removeChapter = (i: number) => onChange("filmChapters", filmChapters.filter((_, idx) => idx !== i))

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
                <label className="block text-[11px] font-500 text-gray-600 mb-1">Image URL</label>
                <Input value={ch.imageUrl || ""} onChange={e => updateChapter(i, "imageUrl", e.target.value)} placeholder="https://res.cloudinary.com/..." />
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
          value={(product.performanceMetrics || []).join("\n")}
          onChange={e => onChange("performanceMetrics", e.target.value.split("\n").filter(Boolean))}
          placeholder={"500m² | Coverage Per Minute | At full output\n2hr | Runtime | Per full tank\n50μm | Droplet Size | Sub-micron fog particles\n29 | States Served | Pan-India deployment"}
        />
        <Helper text="Format each line as: Value | Label | Description" />
      </SectionCard>

      {/* ── SECTION 7: CERTIFICATIONS ─────────────── */}
      <SectionCard
        title="⑦ Certifications & Approvals"
        helper="List certifications shown in the 'Certified & Approved' section. These also appear in the accordion as individual items. Shown as green badge pills with checkmark icons."
      >
        <label className="block text-xs font-600 text-gray-700 mb-1">Certifications (one per line)</label>
        <Textarea
          rows={4}
          value={(product.certifications || []).join("\n")}
          onChange={e => onChange("certifications", e.target.value.split("\n").filter(Boolean))}
          placeholder={"ISO 9001:2015\nCE Marking\nGeM Registered OEM\nBIS Approved\nMSME/UDYAM Registered"}
        />
      </SectionCard>

      {/* ── SECTION 8: APPLICATIONS ───────────────── */}
      <SectionCard
        title="⑧ Applications"
        helper="Where this product is used. Each item appears as a card with an icon in the 'Deployed wherever performance matters' section."
      >
        <label className="block text-xs font-600 text-gray-700 mb-1">Applications (one per line)</label>
        <Textarea
          rows={5}
          value={(product.applications || []).join("\n")}
          onChange={e => onChange("applications", e.target.value.split("\n").filter(Boolean))}
          placeholder={"Municipal mosquito control\nAgricultural crop protection\nIndustrial pest control\nGovernment health campaigns\nVehicle-mounted area coverage"}
        />
      </SectionCard>

      {/* ── SECTION 9: FAQs ───────────────────────── */}
      <SectionCard
        title="⑨ Product-Specific FAQs"
        helper="These FAQs appear in the accordion on the product page. Format: Q: [Question] | A: [Answer]. Leave blank to show the default global FAQ set."
      >
        <label className="block text-xs font-600 text-gray-700 mb-1">FAQs (Q: ... | A: ..., one per line)</label>
        <Textarea
          rows={6}
          value={(product.productFaqs || []).join("\n")}
          onChange={e => onChange("productFaqs", e.target.value.split("\n").filter(Boolean))}
          placeholder={"Q: What fuel does this machine use? | A: Kerosene-based fogging oil.\nQ: Is this GeM approved? | A: Yes, we are GeM-registered OEM."}
        />
        <Helper text="Each line: Q: [Question] | A: [Answer]. If left blank, the global FAQ set is used." />
      </SectionCard>

    </div>
  )
}
