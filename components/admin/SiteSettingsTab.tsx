"use client"
import React, { useEffect, useState } from "react"
import { Save, Loader2, Plus, Trash2, GripVertical, Globe, Phone, Building2, Shield, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const SOCIAL_PLATFORMS = [
  { key: "youtube",    label: "YouTube",          placeholder: "https://www.youtube.com/@100Xcircle" },
  { key: "facebook",   label: "Facebook",         placeholder: "https://www.facebook.com/100xcircle" },
  { key: "instagram",  label: "Instagram",        placeholder: "https://www.instagram.com/100xcircle" },
  { key: "linkedin",   label: "LinkedIn",         placeholder: "https://www.linkedin.com/company/100xcircle" },
  { key: "twitter",    label: "X (Twitter)",      placeholder: "https://x.com/100xcircle" },
  { key: "whatsapp",   label: "WhatsApp URL",     placeholder: "https://wa.me/917827229116" },
  { key: "telegram",   label: "Telegram",         placeholder: "https://t.me/100xcircle" },
  { key: "googleBiz",  label: "Google Business",  placeholder: "https://g.page/..." },
]

const TABS = [
  { id: "general",      label: "General",           icon: Globe },
  { id: "contact",      label: "Contact",           icon: Phone },
  { id: "social",       label: "Social Media",      icon: Globe },
  { id: "brand",        label: "Brand Assets",      icon: ImageIcon },
  { id: "credentials",  label: "Company Credentials", icon: Building2 },
  { id: "trust",        label: "Trust & Certifications", icon: Shield },
]

const EMPTY: Record<string, any> = {
  // General
  companyName: "100X Circle",
  legalName: "100X Circle Pvt Ltd",
  tagline: "India's Most Trusted Fogging Machine Manufacturer",
  // Contact
  phonePrimary: "+91-7827229116",
  phoneSecondary: "+91-8178567520",
  whatsappNumber: "917827229116",
  email: "100xcircle@gmail.com",
  supportEmail: "",
  salesEmail: "",
  address: "UG, 398, Sector 7, IMT Manesar, Gurugram, Haryana 122050",
  googleMapsUrl: "",
  workingHours: "Monday–Saturday, 9:00 AM – 6:00 PM IST",
  // Social
  social: {
    youtube:   { url: "https://www.youtube.com/@100Xcircle",         header: true, footer: true, contact: true, products: false },
    facebook:  { url: "https://www.facebook.com/100xcircle",         header: false, footer: true, contact: true, products: false },
    instagram: { url: "https://www.instagram.com/100xcircle",        header: true, footer: true, contact: false, products: false },
    linkedin:  { url: "https://www.linkedin.com/company/100xcircle", header: false, footer: true, contact: false, products: false },
    twitter:   { url: "https://x.com/100xcircle",                    header: false, footer: true, contact: false, products: false },
    whatsapp:  { url: "https://wa.me/917827229116",                  header: false, footer: true, contact: true,  products: true },
    telegram:  { url: "",                                            header: false, footer: false, contact: false, products: false },
    googleBiz: { url: "",                                            header: false, footer: false, contact: true,  products: false },
  },
  // Credentials
  gstNumber: "",
  cinNumber: "",
  udyamNumber: "",
  gemSellerId: "",
  factoryAddress: "",
  corporateAddress: "",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5 mb-6">
      <h3 className="font-700 text-gray-900 text-base border-b border-gray-50 pb-3">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-600 text-gray-700 mb-1">{label}</label>
      {children}
      {helper && <p className="text-[11px] text-gray-400 mt-1">{helper}</p>}
    </div>
  )
}

export function SiteSettingsTab() {
  const [settings, setSettings] = useState<Record<string, any>>(EMPTY)
  const [activeTab, setActiveTab] = useState("general")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then(r => r.json())
      .then(data => {
        if (data && Object.keys(data).length > 1) {
          setSettings({ ...EMPTY, ...data })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: string, value: any) => setSettings(p => ({ ...p, [key]: value }))
  const setSocial = (platform: string, field: string, value: any) =>
    setSettings(p => ({
      ...p,
      social: { ...(p.social || {}), [platform]: { ...(p.social?.[platform] || {}), [field]: value } }
    }))

  const save = async () => {
    setSaving(true)
    await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Loading settings…</div>

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-700 text-gray-900">Site Settings</h2>
          <p className="text-sm text-gray-500 mt-1">All settings here update the live site automatically — header, footer, schemas, and Open Graph tags.</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-brand-600 hover:bg-brand-700 min-w-[120px]">
          {saving ? <><Loader2 size={15} className="mr-2 animate-spin" />Saving…</> : saved ? "✓ Saved!" : <><Save size={15} className="mr-2" />Save All</>}
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-500 transition-colors ${activeTab === t.id ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ──────────────────────────────────── */}
      {activeTab === "general" && (
        <Section title="General">
          <Field label="Company Name" helper="Appears in the browser tab, schema, and across the site.">
            <Input value={settings.companyName || ""} onChange={e => set("companyName", e.target.value)} />
          </Field>
          <Field label="Legal Name" helper="Full registered company name for legal pages and GST documents.">
            <Input value={settings.legalName || ""} onChange={e => set("legalName", e.target.value)} />
          </Field>
          <Field label="Company Tagline" helper="Shown in footer and Open Graph descriptions.">
            <Input value={settings.tagline || ""} onChange={e => set("tagline", e.target.value)} />
          </Field>
        </Section>
      )}

      {/* ── CONTACT ──────────────────────────────────── */}
      {activeTab === "contact" && (
        <Section title="Contact Information">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Primary Phone" helper="Main contact number shown in navbar and footer.">
              <Input value={settings.phonePrimary || ""} onChange={e => set("phonePrimary", e.target.value)} />
            </Field>
            <Field label="Secondary Phone">
              <Input value={settings.phoneSecondary || ""} onChange={e => set("phoneSecondary", e.target.value)} />
            </Field>
            <Field label="WhatsApp Number (E.164, no +)" helper="Used for wa.me links. Example: 917827229116">
              <Input value={settings.whatsappNumber || ""} onChange={e => set("whatsappNumber", e.target.value)} />
            </Field>
            <Field label="Primary Email" helper="Shown in footer and contact page.">
              <Input type="email" value={settings.email || ""} onChange={e => set("email", e.target.value)} />
            </Field>
            <Field label="Support Email">
              <Input type="email" value={settings.supportEmail || ""} onChange={e => set("supportEmail", e.target.value)} />
            </Field>
            <Field label="Sales Email">
              <Input type="email" value={settings.salesEmail || ""} onChange={e => set("salesEmail", e.target.value)} />
            </Field>
          </div>
          <Field label="Office Address" helper="Shown in footer, contact page, and LocalBusiness schema.">
            <Textarea rows={2} value={settings.address || ""} onChange={e => set("address", e.target.value)} />
          </Field>
          <Field label="Google Maps URL" helper="Used for the 'Get Directions' link on the contact page.">
            <Input value={settings.googleMapsUrl || ""} onChange={e => set("googleMapsUrl", e.target.value)} />
          </Field>
          <Field label="Working Hours">
            <Input value={settings.workingHours || ""} onChange={e => set("workingHours", e.target.value)} />
          </Field>
        </Section>
      )}

      {/* ── SOCIAL MEDIA ─────────────────────────────── */}
      {activeTab === "social" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">Control which social platforms appear and where. Unchecked URLs are still saved but hidden from the site.</p>
          {SOCIAL_PLATFORMS.map(p => {
            const s = settings.social?.[p.key] || {}
            return (
              <div key={p.key} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-600 text-gray-900 text-sm w-28">{p.label}</span>
                  <Input
                    value={s.url || ""}
                    onChange={e => setSocial(p.key, "url", e.target.value)}
                    placeholder={p.placeholder}
                    className="flex-1 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 ml-28 text-xs">
                  {[
                    { key: "header", label: "Show in Header" },
                    { key: "footer", label: "Show in Footer" },
                    { key: "contact", label: "Show on Contact Page" },
                    { key: "products", label: "Show on Product Pages" },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={!!s[opt.key]}
                        onChange={e => setSocial(p.key, opt.key, e.target.checked)}
                        className="rounded"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── BRAND ASSETS ─────────────────────────────── */}
      {activeTab === "brand" && (
        <Section title="Brand Assets">
          <p className="text-sm text-gray-400 -mt-2 mb-4">Enter direct image URLs from Cloudinary or your CDN. Use the Brand Assets tab to upload files and copy the URL.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: "logoUrl",          label: "Primary Logo",            helper: "Used in navbar (light background)" },
              { key: "logoDarkUrl",      label: "Dark Logo",               helper: "Used on dark backgrounds" },
              { key: "logoLightUrl",     label: "Light / White Logo",      helper: "Used on dark footer" },
              { key: "logoMobileUrl",    label: "Mobile Logo",             helper: "Small version for mobile navbar" },
              { key: "footerLogoUrl",    label: "Footer Logo",             helper: "Shown in site footer" },
              { key: "faviconUrl",       label: "Favicon URL",             helper: "32x32 or 48x48 PNG" },
              { key: "appleTouchIcon",   label: "Apple Touch Icon",        helper: "180x180 PNG for iOS homescreen" },
              { key: "ogImageUrl",       label: "Open Graph Image",        helper: "1200x630 — shown when pages are shared on social media" },
              { key: "defaultShareImage",label: "Default Share Image",     helper: "Fallback if no page-specific image" },
            ].map(f => (
              <Field key={f.key} label={f.label} helper={f.helper}>
                <Input value={settings[f.key] || ""} onChange={e => set(f.key, e.target.value)} placeholder="https://res.cloudinary.com/..." />
                {settings[f.key] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings[f.key]} alt={f.label} className="mt-2 h-10 w-auto rounded border border-gray-100 bg-gray-50 p-1 object-contain" onError={e => { e.currentTarget.style.display = "none" }} />
                )}
              </Field>
            ))}
          </div>
        </Section>
      )}

      {/* ── CREDENTIALS ──────────────────────────────── */}
      {activeTab === "credentials" && (
        <Section title="Company Credentials">
          <p className="text-sm text-gray-400 -mt-2 mb-4">These are used in the Organization schema and displayed on the About/Contact pages for government procurement trust.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: "gstNumber",       label: "GST Number" },
              { key: "cinNumber",       label: "CIN (Company Identification Number)" },
              { key: "udyamNumber",     label: "UDYAM / MSME Registration Number" },
              { key: "gemSellerId",     label: "GeM Seller ID" },
            ].map(f => (
              <Field key={f.key} label={f.label}>
                <Input value={settings[f.key] || ""} onChange={e => set(f.key, e.target.value)} />
              </Field>
            ))}
          </div>
          <Field label="Factory Address" helper="Manufacturing facility address — different from corporate if applicable.">
            <Textarea rows={2} value={settings.factoryAddress || ""} onChange={e => set("factoryAddress", e.target.value)} />
          </Field>
          <Field label="Corporate / Registered Address">
            <Textarea rows={2} value={settings.corporateAddress || ""} onChange={e => set("corporateAddress", e.target.value)} />
          </Field>
        </Section>
      )}

      {/* ── TRUST ────────────────────────────────────── */}
      {activeTab === "trust" && (
        <Section title="Trust & Certifications">
          <p className="text-sm text-gray-400 -mt-2 mb-4">These labels appear in the footer trust strip, About page, and government procurement sections. Add one per line.</p>
          {[
            { key: "trustBadges",   label: "Trust Strip Labels",   helper: "One per line. Example: OEM Manufacturer, Made in India, GeM Registered" },
            { key: "certLabels",    label: "Certification Labels",  helper: "One per line. Example: ISO 9001:2015, CE Marking, BIS Approved" },
            { key: "govLabels",     label: "Government Credentials", helper: "One per line. Example: GeM Registered OEM, MSME/UDYAM Registered" },
          ].map(f => (
            <Field key={f.key} label={f.label} helper={f.helper}>
              <Textarea
                rows={4}
                value={(settings[f.key] || []).join("\n")}
                onChange={e => set(f.key, e.target.value.split("\n").filter(Boolean))}
                placeholder="One item per line"
              />
            </Field>
          ))}
        </Section>
      )}

      {/* Sticky save */}
      <div className="pt-4 pb-2 flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-brand-600 hover:bg-brand-700">
          {saving ? <><Loader2 size={15} className="mr-2 animate-spin" />Saving…</> : saved ? "✓ Saved!" : <><Save size={15} className="mr-2" />Save Settings</>}
        </Button>
      </div>
    </div>
  )
}
