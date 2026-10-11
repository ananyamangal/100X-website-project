"use client"
// Inbound automation settings (STEP 8): business hours, automatic replies (off by default),
// keyword tagging rules and STOP keywords. Everything is saved together.
import { useEffect, useState } from "react"
import { crmFetch, errorText } from "./api"
import { CUSTOMER_TYPE_LABEL, CUSTOMER_TYPES } from "./format"
import { Chip, ErrorBox, Spinner, btnPrimary, btnSecondary, inputCls } from "./ui"

interface KeywordRule { keyword: string; field: "customerType" | "interestTag"; value: string }
interface Settings {
  businessHours: { tz: string; days: number[]; open: string; close: string }
  autoAck: { enabled: boolean; text: string | null; textHi: string | null }
  afterHoursReply: { enabled: boolean; text: string | null; textHi: string | null; minIntervalHours: number }
  keywordRules: KeywordRule[]
  stopKeywords: string[]
}
interface Loaded { settings: Settings; hoursText: string; defaults: { autoAck: { en_US: string; hi: string }; afterHours: { en_US: string; hi: string } }; suggestedKeywordRules: KeywordRule[] }

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Client copy of the server's "Mon–Sat, 9:30 AM–6:30 PM" (preview while editing). */
export function hoursPreview(days: number[], open: string, close: string): string {
  const ampm = (hm: string) => { const [h, m] = hm.split(":").map(Number); return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}` }
  const d = [...days].sort((a, b) => a - b)
  const runs: string[] = []
  for (let i = 0; i < d.length;) {
    let j = i
    while (j + 1 < d.length && d[j + 1] === d[j] + 1) j++
    runs.push(j - i >= 2 ? `${DAYS[d[i]]}–${DAYS[d[j]]}` : d.slice(i, j + 1).map(x => DAYS[x]).join(", "))
    i = j + 1
  }
  if (!runs.length || !/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close)) return "—"
  return `${runs.join(", ")}, ${ampm(open)}–${ampm(close)}`
}

export function Automation() {
  const [data, setData] = useState<Loaded | null>(null)
  const [s, setS] = useState<Settings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [kw, setKw] = useState<KeywordRule>({ keyword: "", field: "interestTag", value: "" })
  const [stopText, setStopText] = useState("")

  useEffect(() => {
    crmFetch<Loaded>("/api/crm/settings/automation")
      .then(r => { setData(r); setS(r.settings); setStopText(r.settings.stopKeywords.join(", ")) })
      .catch(e => setError(errorText(e)))
  }, [])

  if (error) return <ErrorBox>{error}</ErrorBox>
  if (!data || !s) return <Spinner />

  const set = (patch: Partial<Settings>) => { setS({ ...s, ...patch }); setSaved(false) }
  const hasRule = (r: KeywordRule) => s.keywordRules.some(x => x.keyword.toLowerCase() === r.keyword.toLowerCase() && x.field === r.field && x.value === r.value)
  const addRule = (r: KeywordRule) => { if (r.keyword.trim() && r.value.trim() && !hasRule(r)) set({ keywordRules: [...s.keywordRules, { keyword: r.keyword.trim(), field: r.field, value: r.value.trim().toLowerCase() }] }) }

  async function save() {
    if (!s) return
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const body = { ...s, stopKeywords: stopText.split(",").map(x => x.trim()).filter(Boolean) }
      const r = await crmFetch<{ settings: Settings }>("/api/crm/settings/automation", { method: "PUT", body: JSON.stringify(body) })
      setS(r.settings); setSaved(true)
    } catch (e) {
      setSaveError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  const replyBlock = (title: string, hint: string, key: "autoAck" | "afterHoursReply", defaults: { en_US: string; hi: string }) => (
    <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <label className="flex min-h-[40px] items-center gap-2 font-semibold text-gray-900">
        <input type="checkbox" className="h-5 w-5" checked={s[key].enabled} onChange={e => set({ [key]: { ...s[key], enabled: e.target.checked } } as Partial<Settings>)} />
        {title}
      </label>
      <p className="text-sm text-gray-600">{hint}</p>
      <label className="block text-sm"><span className="mb-1 block text-gray-700">English text (leave empty for the default)</span>
        <textarea className={`${inputCls} min-h-[64px] py-2`} maxLength={1000} placeholder={defaults.en_US} value={s[key].text ?? ""} onChange={e => set({ [key]: { ...s[key], text: e.target.value || null } } as Partial<Settings>)} /></label>
      <label className="block text-sm"><span className="mb-1 block text-gray-700">Hindi text (leave empty for the default)</span>
        <textarea className={`${inputCls} min-h-[64px] py-2`} maxLength={1000} placeholder={defaults.hi} value={s[key].textHi ?? ""} onChange={e => set({ [key]: { ...s[key], textHi: e.target.value || null } } as Partial<Settings>)} /></label>
      {key === "afterHoursReply" && (
        <label className="flex flex-wrap items-center gap-2 text-sm"><span className="text-gray-700">Send at most once every</span>
          <input type="number" min={1} max={168} className={`${inputCls} max-w-[100px]`} value={s.afterHoursReply.minIntervalHours} onChange={e => set({ afterHoursReply: { ...s.afterHoursReply, minIntervalHours: Number(e.target.value) } })} />
          <span className="text-gray-700">hours per customer. {"{hours}"} in the text becomes your office hours.</span></label>
      )}
    </section>
  )

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Automation</h1>
      <p className="text-sm text-gray-600">Automatic replies go only to customers who have just written to you, never to team members&apos; numbers or after a STOP message. Both are off until you switch them on.</p>

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Office hours (India time)</h2>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <Chip key={d} selected={s.businessHours.days.includes(i)} onClick={() => set({ businessHours: { ...s.businessHours, days: s.businessHours.days.includes(i) ? s.businessHours.days.filter(x => x !== i) : [...s.businessHours.days, i] } })}>{d}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="time" className={`${inputCls} max-w-[150px]`} value={s.businessHours.open} onChange={e => set({ businessHours: { ...s.businessHours, open: e.target.value } })} aria-label="Opens" />
          <span>to</span>
          <input type="time" className={`${inputCls} max-w-[150px]`} value={s.businessHours.close} onChange={e => set({ businessHours: { ...s.businessHours, close: e.target.value } })} aria-label="Closes" />
          <span className="text-gray-600">Shown to customers as: <strong>{hoursPreview(s.businessHours.days, s.businessHours.open, s.businessHours.close)}</strong></span>
        </div>
      </section>

      {replyBlock("Reply outside office hours", "Sent when a customer writes outside office hours.", "afterHoursReply", data.defaults.afterHours)}
      {replyBlock("Acknowledge first messages", "Sent once to a new number the first time it writes (during office hours; outside them the office-hours reply covers it).", "autoAck", data.defaults.autoAck)}

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Keyword tags</h2>
        <p className="text-sm text-gray-600">When a message contains the keyword, the lead gets a suggested tag that a salesperson accepts or rejects.</p>
        {s.keywordRules.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-100">
            {s.keywordRules.map((r, i) => (
              <li key={`${r.keyword}-${i}`} className="flex items-center justify-between gap-2 p-2 text-sm">
                <span>&ldquo;{r.keyword}&rdquo; → {r.field === "customerType" ? `customer type: ${CUSTOMER_TYPE_LABEL[r.value as keyof typeof CUSTOMER_TYPE_LABEL] ?? r.value}` : `tag: ${r.value}`}</span>
                <button type="button" className="text-red-700 hover:underline" onClick={() => set({ keywordRules: s.keywordRules.filter((_, j) => j !== i) })}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
          <input className={inputCls} placeholder="Keyword, e.g. tender" value={kw.keyword} maxLength={60} onChange={e => setKw({ ...kw, keyword: e.target.value })} aria-label="Keyword" />
          <select className={inputCls} value={kw.field} onChange={e => setKw({ ...kw, field: e.target.value as KeywordRule["field"], value: "" })} aria-label="Tag kind">
            <option value="interestTag">Interest tag</option>
            <option value="customerType">Customer type</option>
          </select>
          {kw.field === "customerType" ? (
            <select className={inputCls} value={kw.value} onChange={e => setKw({ ...kw, value: e.target.value })} aria-label="Customer type">
              <option value="">Pick a type</option>
              {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{CUSTOMER_TYPE_LABEL[t]}</option>)}
            </select>
          ) : <input className={inputCls} placeholder="Tag, e.g. tender" value={kw.value} maxLength={40} onChange={e => setKw({ ...kw, value: e.target.value })} aria-label="Tag" />}
          <button type="button" className={btnSecondary} onClick={() => { addRule(kw); setKw({ keyword: "", field: kw.field, value: "" }) }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-gray-600">Suggestions:</span>
          {data.suggestedKeywordRules.map(r => (
            <button key={`${r.keyword}-${r.value}`} type="button" className="rounded-full border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50" disabled={hasRule(r)} onClick={() => addRule(r)}>
              {r.keyword} → {r.value}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">STOP keywords</h2>
        <p className="text-sm text-gray-600">A message that is exactly one of these opts the customer out of promotional messages. Separate with commas.</p>
        <input className={inputCls} value={stopText} onChange={e => { setStopText(e.target.value); setSaved(false) }} aria-label="STOP keywords" />
      </section>

      {saveError && <ErrorBox>{saveError}</ErrorBox>}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save automation settings"}</button>
        {saved && <span className="text-sm text-green-700" role="status">Saved.</span>}
      </div>
    </div>
  )
}
