"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail, MapPin, Phone, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  getPersistedAttribution,
  pushDataLayer,
  setContactLeadContext,
} from "@/lib/gtm"

const PHONE_DIGITS_RE = /\D/g

function validatePhone(phone: string) {
  const digits = phone.replace(PHONE_DIGITS_RE, "")
  return digits.length >= 10 && digits.length <= 15
}

export default function ContactSection({
  id = "contact",
}: {
  products?: unknown[]
  id?: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get("name") ?? "").trim()
    const phone = String(formData.get("phone") ?? "").trim()
    const organization = String(formData.get("organization") ?? "").trim()
    const requirement = String(formData.get("requirement") ?? "").trim()
    const hp = String(formData.get("company_website") ?? "").trim()

    if (!name) {
      setError("Please enter your name.")
      return
    }
    if (!validatePhone(phone)) {
      setError("Please enter a valid mobile number (10–15 digits).")
      return
    }
    if (hp) {
      setError("Something went wrong. Please try again.")
      return
    }

    setSubmitting(true)
    pushDataLayer({
      event: "contact_form_submit_attempt",
      lead_type: "contact_form",
      product: "contact_form",
      interest: organization || "general_inquiry",
    })

    try {
      const attribution = getPersistedAttribution()
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          organization,
          message: requirement,
          type: "contact",
          attribution,
          form_page_url: window.location.href,
          form_page_path: window.location.pathname,
          company_website: hp,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(errText || `Request failed (${res.status})`)
      }

      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'contact_submit', page: window.location.pathname, source: 'contact_section' }),
      }).catch(() => {})

      setContactLeadContext({
        product: "contact_form",
        interest: organization || "general_inquiry",
        lead_type: "contact_form",
        form_page_url: window.location.href,
      })

      form.reset()
      router.push("/thank-you?type=contact")
    } catch {
      setError("We could not send your inquiry. Please try again or call us directly.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id={id} className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="eyebrow text-brand-600 mb-3">Contact Us</p>
          <h2 className="text-display-xs text-gray-900 mb-4 text-balance">Talk to our team.</h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Government, municipal, dealer, and export inquiries welcome. Our team responds within one business day.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-8">Contact Information</h3>
            <div className="space-y-4">
              <a
                href="tel:+917827229116"
                data-gtm-location="contact_section"
                className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl hover:bg-brand-50 hover:border-brand-100 border border-transparent transition-all group"
              >
                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:border-brand-200 transition-colors">
                  <Phone className="text-brand-600" size={18} />
                </div>
                <div>
                  <p className="text-xs font-600 text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
                  <p className="font-600 text-gray-900">+91 7827229116</p>
                  <p className="font-500 text-gray-500 text-sm">+91 8178567520</p>
                  <p className="text-xs text-gray-400 mt-0.5">Mon–Sat, 9 AM – 6 PM IST</p>
                </div>
              </a>

              <a
                href="mailto:100xcircle@gmail.com"
                data-gtm-location="contact_section"
                className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl hover:bg-brand-50 hover:border-brand-100 border border-transparent transition-all group"
              >
                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:border-brand-200 transition-colors">
                  <Mail className="text-brand-600" size={18} />
                </div>
                <div>
                  <p className="text-xs font-600 text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="font-600 text-gray-900 break-all">100xcircle@gmail.com</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl border border-transparent">
                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="text-brand-600" size={18} />
                </div>
                <div>
                  <p className="text-xs font-600 text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
                  <p className="font-500 text-gray-700 text-sm leading-relaxed">UG, 398, Sector 7, IMT Manesar,<br />Gurugram, Haryana 122050</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <h3 className="font-700 text-gray-900 text-xl mb-5">Send us a message</h3>

              <div className="mb-8 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/80 px-4 py-3 text-left text-base text-green-900">
                <Shield className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" aria-hidden />
                <p className="leading-snug">
                  Your details are used only to respond to this inquiry. We typically reply within one business day.
                </p>
              </div>

              <form id="contact-inquiry-form" onSubmit={handleContactSubmit} className="relative space-y-5 text-lg">
                {/* Honeypot — hidden from real users, catches bots */}
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="contact-company-website">Company website</label>
                  <input
                    id="contact-company-website"
                    name="company_website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="contact-name" className="sr-only">Your name</label>
                  <Input
                    id="contact-name"
                    name="name"
                    placeholder="Your name"
                    required
                    autoComplete="name"
                    className="p-5 text-lg min-h-[52px]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-phone" className="sr-only">Mobile number</label>
                  <Input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Mobile number"
                    required
                    className="p-5 text-lg min-h-[52px]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-organization" className="sr-only">Organization or department</label>
                  <Input
                    id="contact-organization"
                    name="organization"
                    placeholder="Organization / Department (optional)"
                    autoComplete="organization"
                    className="p-5 text-lg min-h-[52px]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-requirement" className="sr-only">Your requirement</label>
                  <Textarea
                    id="contact-requirement"
                    name="requirement"
                    placeholder="Your requirement (optional) — e.g. product name, quantity, state"
                    rows={4}
                    className="p-5 text-lg resize-y min-h-[110px]"
                  />
                </div>

                {error ? (
                  <p className="text-base text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="w-full bg-brand-600 hover:bg-brand-700 rounded-full font-600 min-h-[52px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden />
                      Submitting…
                    </>
                  ) : (
                    "Send enquiry"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
