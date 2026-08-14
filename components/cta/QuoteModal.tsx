"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  getPersistedAttribution,
  pushDataLayer,
  setQuoteLeadContext,
} from "@/lib/gtm"
import { CTA_COPY, QUOTE_LEAD_VALUE_INR, type Audience } from "./cta-config"

type Props = {
  open: boolean
  onClose: () => void
  audience: Audience
  productName?: string
}

const PHONE_RE = /^[0-9+\-()\s]{10,18}$/

export default function QuoteModal({ open, onClose, audience, productName }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  // Time-based bot gate (mirrors PartnerApplyForm's fix in commit fb362d1) --
  // see the same note in BrochureLeadModal.tsx. Re-armed on every open, not
  // just first mount, since this modal can be opened/closed/reopened
  // without remounting.
  const mountedAtRef = useRef<number>(Date.now())

  const copy = CTA_COPY[audience]

  useEffect(() => {
    if (!open) return
    mountedAtRef.current = Date.now()
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [open, submitting, onClose])

  // Reset transient state whenever the modal closes so the next open is clean.
  useEffect(() => {
    if (open) return
    setError(null)
    setSubmitting(false)
  }, [open])

  if (!open) return null

  const reset = () => {
    setName("")
    setPhone("")
    setMessage("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName || !trimmedPhone) {
      setError("Please enter your name and phone number.")
      return
    }
    const digits = trimmedPhone.replace(/[^0-9]/g, "")
    if (!PHONE_RE.test(trimmedPhone) || digits.length < 10 || digits.length > 15) {
      setError("Please enter a valid phone number (10–15 digits).")
      return
    }
    // Time-gate: see mountedAtRef comment above.
    if (Date.now() - mountedAtRef.current < 2000) {
      setError("Please try again.")
      return
    }

    pushDataLayer({
      event: "quote_form_submit_attempt",
      audience,
      product: productName,
    })

    setSubmitting(true)
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          message: trimmedMessage,
          subject: copy.modalSubject,
          type: "sticky_quote_request",
          audience,
          productName: productName ?? null,
          attribution: getPersistedAttribution(),
          form_page_url: typeof window !== "undefined" ? location.href : "",
          form_page_path: typeof window !== "undefined" ? location.pathname : "",
        }),
      })

      if (!res.ok) throw new Error(`Submission failed with status ${res.status}`)

      setQuoteLeadContext({
        audience,
        product: productName ?? null,
        name: trimmedName,
        phone: trimmedPhone,
      })

      pushDataLayer({
        event: "quote_submit",
        lead_type: "sticky_quote",
        audience,
        product: productName,
        value: QUOTE_LEAD_VALUE_INR,
        currency: "INR",
      })
      pushDataLayer({
        event: "generate_lead",
        lead_type: "sticky_quote",
        audience,
        product: productName,
        value: QUOTE_LEAD_VALUE_INR,
        currency: "INR",
      })

      reset()
      onClose()
      router.push("/thank-you?type=sticky_quote")
    } catch {
      setError("We couldn't save your request. Please try again or call us.")
      toast.error("Couldn't submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/55 flex items-end sm:items-center justify-center z-[80] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
      onClick={() => {
        if (submitting) return
        onClose()
      }}
    >
      <Card
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 id="quote-modal-title" className="text-xl font-bold text-gray-900">
                {copy.modalTitle}
              </h3>
              {productName ? (
                <p className="mt-1 text-sm font-medium text-brand-700">{productName}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-600">
                  Share your details — we'll call you back.
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close quote form"
              className="-mr-2 -mt-2 rounded-md p-2 text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              onClick={onClose}
              disabled={submitting}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-3">
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="sticky-quote-hp">Company website</label>
              <input
                id="sticky-quote-hp"
                name="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="sticky-quote-name" className="sr-only">
                Your name
              </label>
              <Input
                id="sticky-quote-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
                disabled={submitting}
                className="min-h-[48px] text-base"
              />
            </div>

            <div>
              <label htmlFor="sticky-quote-phone" className="sr-only">
                Phone number
              </label>
              <Input
                id="sticky-quote-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number (with country code)"
                required
                disabled={submitting}
                className="min-h-[48px] text-base"
              />
            </div>

            <div>
              <label htmlFor="sticky-quote-message" className="sr-only">
                What do you need?
              </label>
              <Textarea
                id="sticky-quote-message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What do you need? (model, quantity, location) — optional"
                rows={3}
                disabled={submitting}
                className="min-h-[96px] resize-none text-base"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 min-h-[48px] text-base font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>Send my details</>
              )}
            </Button>

            <p className="text-[11px] leading-relaxed text-gray-500 text-center">
              By submitting you agree to be contacted by 100x Circle about your enquiry.
              No spam.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
