"use client"

import { useRef, useState } from "react"
import { pushDataLayer } from "@/lib/gtm"
import { useRouter } from "next/navigation"

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
]

const PROCUREMENT_TYPES = [
  { label: "Direct GeM Purchase" },
  { label: "GeM Bid / L1" },
  { label: "Open Tender" },
  { label: "Limited Tender" },
  { label: "Rate Contract" },
  { label: "Budgetary Estimate / Quote Only" },
  { label: "DGS&D / Defence" },
  { label: "Other" },
]

interface FormState {
  dept_name: string
  officer_name: string
  state_val: string
  phone: string
  email: string
  quantity: string
  procurement_type: string
  tender_deadline: string
  message: string
  company_website: string
}

const EMPTY: FormState = {
  dept_name: "", officer_name: "", state_val: "", phone: "", email: "",
  quantity: "", procurement_type: "", tender_deadline: "", message: "",
  company_website: "",
}

export default function GovRFQForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  // Time-based bot gate (mirrors PartnerApplyForm's fix in commit fb362d1) --
  // see the same note in TenderPackLeadCapture.tsx / BrochureLeadModal.tsx.
  const mountedAtRef = useRef<number>(Date.now())

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === "submitting") return

    // Time-gate: see mountedAtRef comment above.
    if (Date.now() - mountedAtRef.current < 2000) {
      setStatus("error")
      setErrorMsg("Please try again.")
      return
    }

    setStatus("submitting")
    setErrorMsg("")

    const description = [
      form.procurement_type ? `Procurement type: ${form.procurement_type}` : "",
      form.tender_deadline ? `Tender deadline: ${form.tender_deadline}` : "",
      form.message,
    ].filter(Boolean).join(" | ")

    try {
      const res = await fetch("/api/rfq-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "Government Fogging Machine Procurement",
          name: form.officer_name,
          phone: form.phone,
          email: form.email,
          organization: form.dept_name,
          cityState: form.state_val,
          quantity: form.quantity,
          description,
          gemAuthRequired: false,
          dealerInquiry: false,
          form_page_url: window.location.href,
          form_page_path: window.location.pathname,
          location_label: "gov_procurement_rfq",
        }),
      })
      const data = await res.json()
      if (data.ok) {
        pushDataLayer({
          event: "generate_lead",
          value: 150000,
          currency: "INR",
          lead_type: "gov_rfq",
          conversion_step: "form_submit",
          department: form.dept_name,
          state: form.state_val,
          procurement_type: form.procurement_type,
        })
        router.push("/thank-you?type=gov_rfq")
      } else {
        setStatus("error")
        setErrorMsg("Submission failed. Please WhatsApp us at +91-7827229116.")
      }
    } catch {
      setStatus("error")
      setErrorMsg("Network error. Please WhatsApp us at +91-7827229116.")
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Honeypot */}
      <input
        type="text" name="company_website" value={form.company_website} onChange={set}
        className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true"
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Department / Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            required name="dept_name" value={form.dept_name} onChange={set}
            placeholder="e.g. Nagar Nigam Lucknow, District Health Dept Bihar"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Officer / Contact Name <span className="text-red-500">*</span>
          </label>
          <input
            required name="officer_name" value={form.officer_name} onChange={set}
            placeholder="Your full name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select required name="state_val" value={form.state_val} onChange={set} className={inputCls}>
            <option value="">Select state</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            required type="tel" name="phone" value={form.phone} onChange={set}
            placeholder="+91 XXXXX XXXXX"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Official Email
          </label>
          <input
            type="email" name="email" value={form.email} onChange={set}
            placeholder="your.name@dept.gov.in"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Required Quantity
          </label>
          <input
            name="quantity" value={form.quantity} onChange={set}
            placeholder="e.g. 5 units, 10 machines"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Procurement Type
          </label>
          <select name="procurement_type" value={form.procurement_type} onChange={set} className={inputCls}>
            <option value="">Select type</option>
            {PROCUREMENT_TYPES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Tender / Quote Deadline
          </label>
          <input
            type="date" name="tender_deadline" value={form.tender_deadline} onChange={set}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Specifications / Additional Requirements
        </label>
        <textarea
          name="message" value={form.message} onChange={set} rows={3}
          placeholder="Product type, area coverage, IS 14855 requirement, delivery location, or any other details"
          className={inputCls + " resize-none"}
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-8 py-3 rounded-lg text-sm hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Submitting…" : "Submit RFQ — 24-hour response"}
        </button>
        <p className="text-xs text-gray-500">
          Fields marked <span className="text-red-500">*</span> are required.
          Your information is only used to respond to this enquiry.
        </p>
      </div>
    </form>
  )
}
