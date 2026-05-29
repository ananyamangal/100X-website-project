"use client"

import React, { useState, useEffect } from "react"
import { Save, Loader2, Check, Plus, Trash2, ChevronDown, ChevronUp, Upload, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_HOME_CONTENT, type HomeContent, type HomeContentFaq, type HomeContentStep, type HomeContentStat } from "@/lib/homeContentTypes"

const CLOUDINARY_IMAGE_URL = "https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload"
const CLOUDINARY_VIDEO_URL = "https://api.cloudinary.com/v1_1/dhbvzugv6/video/upload"
const UPLOAD_PRESET = "product_uploads"

async function uploadToCloudinary(file: File, type: "image" | "video"): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("upload_preset", UPLOAD_PRESET)
  const endpoint = type === "video" ? CLOUDINARY_VIDEO_URL : CLOUDINARY_IMAGE_URL
  const res = await fetch(endpoint, { method: "POST", body: fd })
  if (!res.ok) throw new Error("Upload failed")
  const data = await res.json()
  return data.secure_url as string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border rounded-lg text-left font-semibold text-gray-800 transition-colors"
    >
      {title}
      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  rows?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {multiline ? (
        <Textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
      )}
    </div>
  )
}

// ─── Sub-section editors ─────────────────────────────────────────────────────

function BulletsEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
              className="text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-red-500 hover:text-red-700 px-2"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ""])}
          className="mt-1"
        >
          <Plus size={14} className="mr-1" /> Add item
        </Button>
      </div>
    </div>
  )
}

function StepsEditor({
  label,
  steps,
  onChange,
}: {
  label: string
  steps: HomeContentStep[]
  onChange: (steps: HomeContentStep[]) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="border rounded-lg p-3 bg-gray-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">#{i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(steps.filter((_, idx) => idx !== i))}
                className="text-red-500 hover:text-red-700 px-2 h-7"
              >
                <Trash2 size={13} />
              </Button>
            </div>
            <Input
              placeholder="Title"
              value={step.title}
              onChange={(e) => {
                const next = [...steps]
                next[i] = { ...next[i], title: e.target.value }
                onChange(next)
              }}
              className="text-sm"
            />
            <Textarea
              placeholder="Body"
              rows={2}
              value={step.body}
              onChange={(e) => {
                const next = [...steps]
                next[i] = { ...next[i], body: e.target.value }
                onChange(next)
              }}
              className="text-sm"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...steps, { title: "", body: "" }])}
        >
          <Plus size={14} className="mr-1" /> Add step
        </Button>
      </div>
    </div>
  )
}

function TechStepsEditor({
  steps,
  onChange,
}: {
  steps: HomeContentStep[]
  onChange: (steps: HomeContentStep[]) => void
}) {
  const [uploading, setUploading] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function updateStep(i: number, fields: Partial<HomeContentStep>) {
    const next = [...steps]
    next[i] = { ...next[i], ...fields }
    onChange(next)
  }

  async function handleMediaUpload(i: number, file: File, mediaType: HomeContentStep["mediaType"]) {
    setUploading(i)
    setUploadError(null)
    try {
      const type = mediaType === "video" ? "video" : "image"
      const url = await uploadToCloudinary(file, type)
      updateStep(i, { mediaUrl: url })
    } catch {
      setUploadError(`Upload failed for step ${i + 1}. Check your file type and try again.`)
    } finally {
      setUploading(null)
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">Process Steps</label>
      {uploadError && (
        <p className="text-xs text-red-600 mb-2">{uploadError}</p>
      )}
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="border rounded-lg p-4 bg-gray-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Step {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(steps.filter((_, idx) => idx !== i))}
                className="text-red-500 hover:text-red-700 px-2 h-7"
              >
                <Trash2 size={13} />
              </Button>
            </div>

            <Input
              placeholder="Title (e.g. Pulse-Jet Combustion)"
              value={step.title}
              onChange={(e) => updateStep(i, { title: e.target.value })}
              className="text-sm"
            />
            <Textarea
              placeholder="Short description (shown in collapsed view)"
              rows={2}
              value={step.body}
              onChange={(e) => updateStep(i, { body: e.target.value })}
              className="text-sm"
            />
            <Textarea
              placeholder="Expandable details (optional — shown when step is tapped)"
              rows={2}
              value={step.details || ""}
              onChange={(e) => updateStep(i, { details: e.target.value })}
              className="text-sm"
            />

            {/* Media type */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600">Step media (optional)</label>
              <select
                value={step.mediaType || "none"}
                onChange={(e) =>
                  updateStep(i, {
                    mediaType: e.target.value as HomeContentStep["mediaType"],
                    mediaUrl: e.target.value === "none" ? undefined : step.mediaUrl,
                  })
                }
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="none">None</option>
                <option value="image">Image</option>
                <option value="gif">GIF (animated image)</option>
                <option value="video">Video clip</option>
              </select>

              {step.mediaType && step.mediaType !== "none" && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                        {uploading === i ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Upload size={13} />
                        )}
                        {uploading === i ? "Uploading…" : `Upload ${step.mediaType === "video" ? "video" : "image"}`}
                      </span>
                      <input
                        type="file"
                        accept={step.mediaType === "video" ? "video/*" : "image/*,.gif"}
                        className="sr-only"
                        disabled={uploading === i}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleMediaUpload(i, f, step.mediaType)
                        }}
                      />
                    </label>
                    <span className="text-xs text-gray-400">or paste URL below</span>
                  </div>

                  <Input
                    placeholder={`${step.mediaType === "video" ? "Video" : "Image"} URL`}
                    value={step.mediaUrl || ""}
                    onChange={(e) => updateStep(i, { mediaUrl: e.target.value })}
                    className="text-sm"
                  />

                  {step.mediaUrl && (
                    <div className="rounded-lg overflow-hidden ring-1 ring-gray-200 max-h-32 bg-gray-100 flex items-center justify-center">
                      {step.mediaType === "video" ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video
                          src={step.mediaUrl}
                          className="max-h-32 max-w-full"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={step.mediaUrl}
                          alt=""
                          className="max-h-32 max-w-full object-contain"
                        />
                      )}
                    </div>
                  )}

                  <Input
                    placeholder="Alt text / caption (for SEO and accessibility)"
                    value={step.mediaAlt || ""}
                    onChange={(e) => updateStep(i, { mediaAlt: e.target.value })}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...steps, { title: "", body: "" }])}
        >
          <Plus size={14} className="mr-1" /> Add step
        </Button>
      </div>
    </div>
  )
}

function StatsEditor({
  stats,
  onChange,
}: {
  stats: HomeContentStat[]
  onChange: (stats: HomeContentStat[]) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">Stats</label>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="border rounded-lg p-3 bg-gray-50/60 space-y-2">
            <Input
              placeholder="Value (e.g. 50+)"
              value={s.value}
              onChange={(e) => {
                const next = [...stats]
                next[i] = { ...next[i], value: e.target.value }
                onChange(next)
              }}
              className="text-sm"
            />
            <Input
              placeholder="Label"
              value={s.label}
              onChange={(e) => {
                const next = [...stats]
                next[i] = { ...next[i], label: e.target.value }
                onChange(next)
              }}
              className="text-sm"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => onChange([...stats, { value: "", label: "" }])}
      >
        <Plus size={14} className="mr-1" /> Add stat
      </Button>
    </div>
  )
}

function FAQsEditor({
  faqs,
  onChange,
}: {
  faqs: HomeContentFaq[]
  onChange: (faqs: HomeContentFaq[]) => void
}) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div key={i} className="border rounded-lg p-3 bg-gray-50/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Q{i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(faqs.filter((_, idx) => idx !== i))}
              className="text-red-500 hover:text-red-700 px-2 h-7"
            >
              <Trash2 size={13} />
            </Button>
          </div>
          <Input
            placeholder="Question"
            value={faq.q}
            onChange={(e) => {
              const next = [...faqs]
              next[i] = { ...next[i], q: e.target.value }
              onChange(next)
            }}
            className="text-sm"
          />
          <Textarea
            placeholder="Answer"
            rows={3}
            value={faq.a}
            onChange={(e) => {
              const next = [...faqs]
              next[i] = { ...next[i], a: e.target.value }
              onChange(next)
            }}
            className="text-sm"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...faqs, { q: "", a: "" }])}
      >
        <Plus size={14} className="mr-1" /> Add FAQ
      </Button>
    </div>
  )
}

// ─── Main tab component ──────────────────────────────────────────────────────

export function HomepageContentTab() {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>("manufacturerIntro")
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/home-content")
      .then((r) => r.json())
      .then((data) => setContent({ ...DEFAULT_HOME_CONTENT, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle(key: string) {
    setOpenSection((prev) => (prev === key ? null : key))
  }

  function patch<K extends keyof HomeContent>(key: K, value: HomeContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  function patchIntro(field: keyof HomeContent["manufacturerIntro"], value: string | string[]) {
    setContent((prev) => ({
      ...prev,
      manufacturerIntro: { ...prev.manufacturerIntro, [field]: value },
    }))
  }

  function patchTech(field: keyof HomeContent["technology"], value: any) {
    setContent((prev) => ({
      ...prev,
      technology: { ...prev.technology, [field]: value },
    }))
  }

  function patchAuth(field: keyof HomeContent["manufacturingAuthority"], value: any) {
    setContent((prev) => ({
      ...prev,
      manufacturingAuthority: { ...prev.manufacturingAuthority, [field]: value },
    }))
  }

  function patchConnector(key: keyof HomeContent["connectors"], field: "eyebrow" | "text", value: string) {
    setContent((prev) => ({
      ...prev,
      connectors: {
        ...prev.connectors,
        [key]: { ...prev.connectors[key], [field]: value },
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/home-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
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
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Homepage Content</h2>
        <p className="text-gray-500 mt-1">
          Edit text, headings, and content for each homepage section. Changes apply on the next page load.
        </p>
      </div>

      {/* Section Connectors */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Section Connectors (between-section text)" open={openSection === "connectors"} onToggle={() => toggle("connectors")} />
        {openSection === "connectors" && (
          <div className="p-4 space-y-4">
            {(["c1", "c2", "c3", "c4"] as const).map((key, i) => (
              <div key={key} className="border rounded-lg p-3 space-y-2 bg-gray-50/60">
                <p className="text-xs font-semibold text-gray-500">Connector {i + 1}</p>
                <Field label="Eyebrow" value={content.connectors[key].eyebrow} onChange={(v) => patchConnector(key, "eyebrow", v)} />
                <Field label="Text" value={content.connectors[key].text} onChange={(v) => patchConnector(key, "text", v)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manufacturer Intro */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Manufacturer Intro Section" open={openSection === "manufacturerIntro"} onToggle={() => toggle("manufacturerIntro")} />
        {openSection === "manufacturerIntro" && (
          <div className="p-4 space-y-4">
            <Field label="Badge" value={content.manufacturerIntro.badge} onChange={(v) => patchIntro("badge", v)} />
            <Field label="Headline" value={content.manufacturerIntro.headline} onChange={(v) => patchIntro("headline", v)} />
            <Field label="Body" value={content.manufacturerIntro.body} onChange={(v) => patchIntro("body", v)} multiline rows={3} />
            <BulletsEditor label="Bullet points" items={content.manufacturerIntro.bullets} onChange={(v) => patchIntro("bullets", v)} />
            <Field label="Sub-section 1 — Title" value={content.manufacturerIntro.section1Title} onChange={(v) => patchIntro("section1Title", v)} />
            <Field label="Sub-section 1 — Body" value={content.manufacturerIntro.section1Body} onChange={(v) => patchIntro("section1Body", v)} multiline rows={4} />
            <Field label="Sub-section 2 — Title" value={content.manufacturerIntro.section2Title} onChange={(v) => patchIntro("section2Title", v)} />
            <Field label="Sub-section 2 — Body" value={content.manufacturerIntro.section2Body} onChange={(v) => patchIntro("section2Body", v)} multiline rows={4} />
            <Field label="Why Choose — Title" value={content.manufacturerIntro.whyChooseTitle} onChange={(v) => patchIntro("whyChooseTitle", v)} />
            <BulletsEditor label="Why Choose — Bullets" items={content.manufacturerIntro.whyChooseBullets} onChange={(v) => patchIntro("whyChooseBullets", v)} />
            <Field label="Section Image URL" value={content.manufacturerIntro.imageUrl} onChange={(v) => patchIntro("imageUrl", v)} />
            <Field label="Section Image Alt" value={content.manufacturerIntro.imageAlt} onChange={(v) => patchIntro("imageAlt", v)} />
          </div>
        )}
      </div>

      {/* Technology / How It Works */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Technology / How It Works Section" open={openSection === "technology"} onToggle={() => toggle("technology")} />
        {openSection === "technology" && (
          <div className="p-4 space-y-4">
            <Field label="Badge" value={content.technology.badge} onChange={(v) => patchTech("badge", v)} />
            <Field label="Headline" value={content.technology.headline} onChange={(v) => patchTech("headline", v)} />
            <Field label="Body text" value={content.technology.body} onChange={(v) => patchTech("body", v)} multiline rows={3} />

            {/* Section demo video */}
            <div className="border rounded-lg p-4 bg-blue-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-blue-600" />
                <p className="text-sm font-semibold text-gray-800">Section demo video (appears on the left side)</p>
              </div>
              <p className="text-xs text-gray-500">
                Upload an MP4 showing the fogging machine in operation. This is the primary visual — it plays on loop
                next to the process steps.
              </p>

              {videoUploadError && (
                <p className="text-xs text-red-600">{videoUploadError}</p>
              )}

              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                    {videoUploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {videoUploading ? "Uploading video…" : "Upload video (MP4)"}
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/*"
                    className="sr-only"
                    disabled={videoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setVideoUploading(true)
                      setVideoUploadError(null)
                      try {
                        const url = await uploadToCloudinary(file, "video")
                        patchTech("videoUrl", url)
                      } catch {
                        setVideoUploadError("Upload failed. File may be too large or in an unsupported format.")
                      } finally {
                        setVideoUploading(false)
                        e.target.value = ""
                      }
                    }}
                  />
                </label>
                <span className="text-xs text-gray-400">or paste a direct URL below</span>
              </div>

              <Field
                label="Video URL (Cloudinary or direct MP4 link)"
                value={content.technology.videoUrl || ""}
                onChange={(v) => patchTech("videoUrl", v)}
              />
              <Field
                label="Poster / thumbnail URL (shown before video loads)"
                value={content.technology.videoPoster || ""}
                onChange={(v) => patchTech("videoPoster", v)}
              />
              <Field
                label="Video alt text / caption (SEO — describes what the video shows)"
                value={content.technology.videoAlt || ""}
                onChange={(v) => patchTech("videoAlt", v)}
              />

              {content.technology.videoUrl && (
                <div className="mt-2 rounded-lg overflow-hidden ring-1 ring-gray-200 bg-black max-h-40 flex items-center justify-center">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    key={content.technology.videoUrl}
                    src={content.technology.videoUrl}
                    className="max-h-40 max-w-full"
                    controls
                    muted
                    preload="metadata"
                  />
                </div>
              )}
            </div>

            <TechStepsEditor steps={content.technology.steps} onChange={(v) => patchTech("steps", v)} />
            <Field label="Benefits section title" value={content.technology.benefitsTitle} onChange={(v) => patchTech("benefitsTitle", v)} />
            <StepsEditor label="Benefits" steps={content.technology.benefits} onChange={(v) => patchTech("benefits", v)} />
          </div>
        )}
      </div>

      {/* Manufacturing Authority */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Manufacturing Authority Section" open={openSection === "manufacturingAuthority"} onToggle={() => toggle("manufacturingAuthority")} />
        {openSection === "manufacturingAuthority" && (
          <div className="p-4 space-y-4">
            <Field label="Eyebrow" value={content.manufacturingAuthority.eyebrow} onChange={(v) => patchAuth("eyebrow", v)} />
            <Field label="Headline" value={content.manufacturingAuthority.headline} onChange={(v) => patchAuth("headline", v)} />
            <Field label="Body" value={content.manufacturingAuthority.body} onChange={(v) => patchAuth("body", v)} multiline rows={3} />
            <StatsEditor stats={content.manufacturingAuthority.stats} onChange={(v) => patchAuth("stats", v)} />
          </div>
        )}
      </div>

      {/* FAQs */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title={`FAQs (${content.faqs.length} questions)`} open={openSection === "faqs"} onToggle={() => toggle("faqs")} />
        {openSection === "faqs" && (
          <div className="p-4">
            <FAQsEditor faqs={content.faqs} onChange={(v) => patch("faqs", v)} />
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : saved ? (
            <Check size={16} className="mr-2" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save All Changes"}
        </Button>
        {saved && (
          <p className="text-sm text-green-600 font-medium">Saved. Refresh the homepage to see changes.</p>
        )}
      </div>
    </div>
  )
}
