"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Mail, Save, RotateCcw, ChevronDown, ChevronUp, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"

type TemplateDraft = {
  type:    string
  subject: string
  html:    string
  text:    string
}

const TYPE_LABELS: Record<string, string> = {
  forgot_password:  "Forgot Password",
  password_changed: "Password Changed",
  welcome:          "Welcome User",
  account_locked:   "Account Locked",
  account_unlocked: "Account Unlocked",
}

const TEMPLATE_VARS: Record<string, string[]> = {
  forgot_password:  ["{{NAME}}", "{{EMAIL}}", "{{RESET_URL}}"],
  password_changed: ["{{NAME}}", "{{EMAIL}}", "{{CHANGED_AT}}"],
  welcome:          ["{{NAME}}", "{{EMAIL}}", "{{TEMP_PASSWORD}}", "{{ROLE}}"],
  account_locked:   ["{{NAME}}", "{{EMAIL}}", "{{LOCKED_BY}}", "{{LOCKED_AT}}"],
  account_unlocked: ["{{NAME}}", "{{EMAIL}}"],
}

export default function EmailTemplatesPage() {
  const [templates,  setTemplates]  = useState<TemplateDraft[]>([])
  const [defaults,   setDefaults]   = useState<Record<string, Omit<TemplateDraft, "type">>>({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState("")
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState<string | null>(null)
  const [saved,      setSaved]      = useState<string | null>(null)
  const [drafts,     setDrafts]     = useState<Record<string, TemplateDraft>>({})

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res  = await fetch("/api/admin/email-templates")
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to load"); return }
      setTemplates(data.templates)
      setDefaults(data.defaults)
      const init: Record<string, TemplateDraft> = {}
      for (const t of data.templates) init[t.type] = { ...t }
      setDrafts(init)
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const update = (type: string, field: keyof TemplateDraft, value: string) => {
    setDrafts(d => ({ ...d, [type]: { ...d[type], [field]: value } }))
  }

  const save = async (type: string) => {
    const d = drafts[type]
    if (!d) return
    setSaving(type); setError("")
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Save failed"); return }
      setSaved(type)
      setTimeout(() => setSaved(null), 3000)
      await load()
    } catch { setError("Network error") }
    finally { setSaving(null) }
  }

  const resetToDefault = async (type: string) => {
    const res = await fetch(`/api/admin/email-templates?type=${type}`, { method: "DELETE" })
    if (res.ok) await load()
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-[41px] z-10">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-brand-600" />
          <h1 className="text-sm font-bold text-gray-900">Email Templates</h1>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Customise the emails sent for password reset, account events, and new users.
        </p>
      </div>

      <div className="px-6 py-4 space-y-3 max-w-3xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading templates…</div>
        ) : (
          templates.map(tpl => {
            const draft    = drafts[tpl.type] ?? tpl
            const isOpen   = expanded === tpl.type
            const isSaving = saving === tpl.type
            const wasSaved = saved === tpl.type
            const vars     = TEMPLATE_VARS[tpl.type] ?? []

            return (
              <div key={tpl.type} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : tpl.type)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Mail size={14} className="text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-800">{TYPE_LABELS[tpl.type] ?? tpl.type}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{tpl.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {vars.length > 0 && (
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        {vars.join(" · ")}
                      </span>
                    )}
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded editor */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                      <Input
                        value={draft.subject}
                        onChange={e => update(tpl.type, "subject", e.target.value)}
                        className="text-sm"
                        placeholder="Email subject line"
                      />
                    </div>

                    {/* Plain text */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Plain Text <span className="font-normal text-gray-400">(fallback for email clients)</span>
                      </label>
                      <textarea
                        value={draft.text}
                        onChange={e => update(tpl.type, "text", e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y bg-gray-50"
                        placeholder="Plain text body…"
                      />
                    </div>

                    {/* HTML */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        HTML Body <span className="font-normal text-gray-400">(shown in modern email clients)</span>
                      </label>
                      <textarea
                        value={draft.html}
                        onChange={e => update(tpl.type, "html", e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y bg-gray-50"
                        placeholder="<div>HTML body…</div>"
                      />
                    </div>

                    {/* Available vars hint */}
                    {vars.length > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[11px] text-amber-700">
                        <span className="font-semibold">Available variables: </span>{vars.join(", ")}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => resetToDefault(tpl.type)}
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw size={12} />
                        Reset to default
                      </button>
                      <Button
                        onClick={() => save(tpl.type)}
                        disabled={isSaving}
                        size="sm"
                        className="bg-brand-600 hover:bg-brand-500 text-white gap-1.5 text-xs"
                      >
                        {isSaving ? (
                          "Saving…"
                        ) : wasSaved ? (
                          <><CheckCircle size={13} /> Saved</>
                        ) : (
                          <><Save size={13} /> Save Template</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
