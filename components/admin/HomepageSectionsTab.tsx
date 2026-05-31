"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { AssetPicker, type CelebrityAsset } from "./AssetPicker"

const SECTION_TYPES = [
  { value: "before", label: "Before 100X (Problem)" },
  { value: "after", label: "After Fogging (Solution)" },
  { value: "awareness", label: "Public Health Awareness" },
  { value: "government", label: "Government Campaign" },
  { value: "municipal", label: "Municipal Deployment" },
  { value: "agriculture", label: "Farmer Crop Protection" },
  { value: "custom", label: "Custom Section" },
]

const PLACEMENTS = [
  { value: "after-hero", label: "After Hero Banner" },
  { value: "after-products", label: "After Products Grid" },
  { value: "before-trust", label: "Before Trust Block" },
  { value: "before-faq", label: "Before FAQ" },
]

const IMAGE_POSITIONS = ["left", "right", "center", "background"]
const THEMES = ["light", "dark", "green", "orange"]

const SEED_SECTIONS = [
  {
    sectionKey: "before-100x",
    type: "before",
    enabled: false,
    order: 0,
    placement: "after-hero",
    headline: "Mosquito Problems Cost More Than You Think",
    subheadline: "Every year, millions face preventable diseases",
    bodyText: "Without proper vector control, communities remain vulnerable to dengue, malaria, and chikungunya. Ineffective fogging equipment means repeated outbreaks and wasted budgets.",
    ctaText: "See How We Fix This",
    ctaUrl: "/products",
    imageUrl: "",
    imageAlt: "Concerned about mosquito problems",
    imagePosition: "right",
    badge: "The Problem",
    theme: "light",
    stats: [{ label: "Cases/Year", value: "40L+" }, { label: "Districts Affected", value: "700+" }],
    showOnMobile: true,
    showOnDesktop: true,
  },
  {
    sectionKey: "after-fogging",
    type: "after",
    enabled: false,
    order: 1,
    placement: "after-products",
    headline: "Cleaner Environment. Better Protection.",
    subheadline: "100x Circle — India's trusted fogging machine manufacturer",
    bodyText: "With 100x Circle thermal fogging machines, municipalities, health departments, and agricultural cooperatives achieve comprehensive vector control — on time, within budget.",
    ctaText: "Request a Quote",
    ctaUrl: "/contact-us",
    imageUrl: "",
    imageAlt: "Happy and satisfied after 100x Circle fogging solution",
    imagePosition: "left",
    badge: "The Solution",
    theme: "green",
    stats: [{ label: "Districts Served", value: "200+" }, { label: "Machines Deployed", value: "5000+" }],
    showOnMobile: true,
    showOnDesktop: true,
  },
  {
    sectionKey: "public-health-awareness",
    type: "awareness",
    enabled: false,
    order: 2,
    placement: "before-trust",
    headline: "Public Health Starts With Effective Vector Control",
    subheadline: "Trusted by government health departments across India",
    bodyText: "From municipal corporations in Haryana and UP to district health departments in Bihar and Gujarat — 100x Circle machines are deployed where it matters most.",
    ctaText: "View Deployments",
    ctaUrl: "/deployments",
    imageUrl: "",
    imageAlt: "Public health awareness campaign for mosquito control",
    imagePosition: "center",
    badge: "Public Health",
    theme: "dark",
    stats: [{ label: "States Covered", value: "22" }, { label: "GeM Listed", value: "Yes" }],
    showOnMobile: true,
    showOnDesktop: true,
  },
  {
    sectionKey: "government-campaign",
    type: "government",
    enabled: false,
    order: 3,
    placement: "before-trust",
    headline: "India's Government Choice for Vector Control",
    subheadline: "GeM registered · ISO 9001:2015 certified · MSME approved",
    bodyText: "Government bodies, municipal corporations, and health departments procure 100x Circle machines directly via GeM — faster than tender, with full compliance documentation.",
    ctaText: "Check GeM Listing",
    ctaUrl: "https://gem.gov.in",
    imageUrl: "",
    imageAlt: "Government campaign for public health and vector control",
    imagePosition: "right",
    badge: "Government Approved",
    theme: "dark",
    stats: [{ label: "GeM Orders", value: "1000+" }, { label: "Certifications", value: "ISO + CE" }],
    showOnMobile: true,
    showOnDesktop: true,
  },
  {
    sectionKey: "farmer-protection",
    type: "agriculture",
    enabled: false,
    order: 4,
    placement: "before-faq",
    headline: "Protect Your Crops. Protect Your Income.",
    subheadline: "Agricultural fogging for paddy, vegetables, and cash crops",
    bodyText: "Farmers across Punjab, Haryana, and Maharashtra use 100x Circle portable foggers to combat aphids, whiteflies, and fungal infestations — covering dense canopies conventional sprayers miss.",
    ctaText: "Agricultural Solutions",
    ctaUrl: "/products",
    imageUrl: "",
    imageAlt: "Farmer using 100x Circle fogging machine for crop protection",
    imagePosition: "left",
    badge: "Agriculture",
    theme: "light",
    stats: [{ label: "Crops Protected", value: "50+ types" }, { label: "Coverage", value: "5× better" }],
    showOnMobile: true,
    showOnDesktop: true,
  },
  {
    sectionKey: "municipal-success",
    type: "municipal",
    enabled: false,
    order: 5,
    placement: "before-faq",
    headline: "Cities Choose 100x Circle for Monsoon Vector Control",
    subheadline: "Municipal corporations across North India trust our machines",
    bodyText: "Nagar Nigams in Haryana, Uttar Pradesh, and Bihar deploy 100x Circle vehicle-mounted foggers for monsoon-season dengue and malaria control. Full ward coverage in single morning drives.",
    ctaText: "Read Case Studies",
    ctaUrl: "/case-studies",
    imageUrl: "",
    imageAlt: "Municipal corporation using 100x Circle for city-wide vector control",
    imagePosition: "right",
    badge: "Municipal",
    theme: "green",
    stats: [{ label: "Nagar Nigams", value: "50+" }, { label: "Ward Coverage", value: "100%" }],
    showOnMobile: true,
    showOnDesktop: true,
  },
]

const EMPTY = { ...SEED_SECTIONS[0], sectionKey: "", headline: "", subheadline: "", bodyText: "", ctaText: "", ctaUrl: "", imageUrl: "", imageAlt: "", badge: "", stats: [] as { label: string; value: string }[] }

export function HomepageSectionsTab() {
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Record<string, any>>({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/homepage-sections")
      .then((r) => r.json())
      .then((d) => setSections(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const reset = () => { setForm({ ...EMPTY }); setEditing(null); setShowForm(false); setMsg(null) }

  const startEdit = (s: any) => {
    setForm({ ...EMPTY, ...s, stats: s.stats || [] })
    setEditing(s._id)
    setShowForm(true)
    setMsg(null)
  }

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const handleAssetSelect = (asset: CelebrityAsset) => {
    set("imageUrl", asset.imageUrl)
    set("imageAlt", asset.altText || asset.name)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      let res: Response
      if (editing) {
        res = await fetch(`/api/admin/homepage-sections/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      } else {
        res = await fetch("/api/admin/homepage-sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      }
      if (res.ok) {
        setMsg({ type: "success", text: editing ? "Section updated." : "Section created." })
        load()
        if (!editing) reset()
      } else {
        setMsg({ type: "error", text: "Failed to save." })
      }
    } catch { setMsg({ type: "error", text: "Network error." }) }
    finally { setSaving(false) }
  }

  const toggleEnabled = async (s: any) => {
    await fetch(`/api/admin/homepage-sections/${s._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, enabled: !s.enabled }),
    })
    load()
  }

  const updateOrder = async (s: any, dir: -1 | 1) => {
    const newOrder = Math.max(0, (s.order ?? 0) + dir)
    await fetch(`/api/admin/homepage-sections/${s._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, order: newOrder }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section?")) return
    await fetch(`/api/admin/homepage-sections/${id}`, { method: "DELETE" })
    load()
  }

  const seedAll = async () => {
    if (!confirm(`Seed ${SEED_SECTIONS.length} pre-built homepage sections? They start disabled — enable and add images to activate.`)) return
    setSeeding(true)
    for (const s of SEED_SECTIONS) {
      await fetch("/api/admin/homepage-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      })
    }
    load()
    setSeeding(false)
    setMsg({ type: "success", text: `${SEED_SECTIONS.length} sections created. Add images and enable each section to activate.` })
  }

  const addStat = () => set("stats", [...(form.stats || []), { label: "", value: "" }])
  const updateStat = (i: number, k: string, v: string) => {
    const stats = [...(form.stats || [])]
    stats[i] = { ...stats[i], [k]: v }
    set("stats", stats)
  }
  const removeStat = (i: number) => set("stats", form.stats.filter((_: any, j: number) => j !== i))

  return (
    <div className="space-y-6">
      <AssetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAssetSelect} title="Pick Celebrity Image" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Homepage Sections</h2>
          <p className="text-gray-600 text-sm">Celebrity-powered sections for homepage. Enable and order as needed. Inject at 4 placement slots.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {sections.length === 0 && (
            <Button variant="outline" onClick={seedAll} disabled={seeding} className="bg-transparent">
              {seeding ? "Seeding…" : "Seed 6 Pre-built Sections"}
            </Button>
          )}
          <Button onClick={() => { reset(); setShowForm(true) }} className="bg-green-600 hover:bg-green-700">
            + New Section
          </Button>
        </div>
      </div>

      {msg && <p className={`text-sm px-4 py-2 rounded-lg ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-5">{editing ? "Edit Section" : "New Homepage Section"}</h3>
            <form onSubmit={handleSave} className="space-y-5">
              {/* Type + Placement row */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Type</label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                    {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placement</label>
                  <select value={form.placement} onChange={(e) => set("placement", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                    {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <Input type="number" value={form.order} onChange={(e) => set("order", Number(e.target.value))} min={0} />
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Celebrity Image</label>
                <div className="flex gap-4 items-center">
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="" className="w-24 h-20 object-cover rounded-xl border shadow-sm" />
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="bg-transparent">
                      Pick from Library
                    </Button>
                    <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="or paste URL directly" className="flex-1 min-w-48" />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image Position</label>
                  <select value={form.imagePosition} onChange={(e) => set("imagePosition", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                    {IMAGE_POSITIONS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <select value={form.theme} onChange={(e) => set("theme", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                    {THEMES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Alt Text</label>
                <Input value={form.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge / Label</label>
                <Input value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. The Problem · Government Approved" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline *</label>
                <Input value={form.headline} onChange={(e) => set("headline", e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                <Input value={form.subheadline} onChange={(e) => set("subheadline", e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
                <Textarea value={form.bodyText} onChange={(e) => set("bodyText", e.target.value)} rows={3} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                  <Input value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} placeholder="e.g. Request a Quote" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                  <Input value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/products or https://..." />
                </div>
              </div>

              {/* Stats */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Stats (optional)</label>
                  <Button type="button" variant="outline" size="sm" onClick={addStat} className="bg-transparent text-xs">+ Add Stat</Button>
                </div>
                {(form.stats || []).map((stat: any, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input value={stat.value} onChange={(e) => updateStat(i, "value", e.target.value)} placeholder="Value (e.g. 200+)" className="flex-1" />
                    <Input value={stat.label} onChange={(e) => updateStat(i, "label", e.target.value)} placeholder="Label (e.g. Districts)" className="flex-1" />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeStat(i)} className="bg-transparent text-red-500 border-red-200">×</Button>
                  </div>
                ))}
              </div>

              {/* Toggles */}
              <div className="flex gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="rounded text-green-600" />
                  Enabled (show on homepage)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.showOnMobile} onChange={(e) => set("showOnMobile", e.target.checked)} className="rounded text-green-600" />
                  Show on Mobile
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.showOnDesktop} onChange={(e) => set("showOnDesktop", e.target.checked)} className="rounded text-green-600" />
                  Show on Desktop
                </label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving…" : editing ? "Update Section" : "Create Section"}
                </Button>
                <Button type="button" variant="outline" onClick={reset} className="bg-transparent">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">
            <p className="mb-4 text-sm">No sections yet. Seed the 6 pre-built templates or create a custom section.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <Card key={s._id} className={`border-2 ${s.enabled ? "border-green-200 bg-green-50/30" : "border-gray-100"}`}>
              <CardContent className="p-4 flex gap-4 items-start">
                {s.imageUrl && <img src={s.imageUrl} alt="" className="w-20 h-16 object-cover rounded-xl shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <button
                      onClick={() => toggleEnabled(s)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${s.enabled ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                    >
                      {s.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">{s.type}</span>
                    <span className="text-xs text-gray-400">{PLACEMENTS.find((p) => p.value === s.placement)?.label || s.placement}</span>
                    <span className="text-xs text-gray-400">Order: {s.order}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{s.headline || "(no headline)"}</h3>
                  {s.badge && <span className="text-xs text-green-700">{s.badge}</span>}
                  {!s.imageUrl && (
                    <p className="text-xs text-amber-600 mt-1">⚠ No image — add a celebrity image to activate this section visually.</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => updateOrder(s, -1)} className="bg-transparent px-2">↑</Button>
                  <Button variant="outline" size="sm" onClick={() => updateOrder(s, 1)} className="bg-transparent px-2">↓</Button>
                  <Button variant="outline" size="sm" onClick={() => startEdit(s)} className="bg-transparent">Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(s._id)} className="bg-transparent text-red-600 border-red-200">Del</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      <Card className="bg-gray-50">
        <CardContent className="p-5">
          <h4 className="font-medium text-gray-700 text-sm mb-3">Placement Guide</h4>
          <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
            <div><strong>After Hero Banner:</strong> High-impact, top-of-funnel awareness.</div>
            <div><strong>After Products Grid:</strong> Post-product reinforcement, solution proof.</div>
            <div><strong>Before Trust Block:</strong> Social proof and authority credibility.</div>
            <div><strong>Before FAQ:</strong> Late-funnel decision support, objection handling.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
