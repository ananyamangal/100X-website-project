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

type ProductOption = { _id?: string; id?: string; name: string }

const PHONE_DIGITS_RE = /\D/g

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone: string) {
  const digits = phone.replace(PHONE_DIGITS_RE, "")
  return digits.length >= 10 && digits.length <= 15
}

export default function ContactSection({
  products,
  id = "contact",
}: {
  products: ProductOption[]
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
    const firstName = String(formData.get("firstName") ?? "").trim()
    const lastName = String(formData.get("lastName") ?? "").trim()
    const name = `${firstName} ${lastName}`.trim()
    const phone = String(formData.get("phone") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const subject = String(formData.get("subject") ?? "").trim()
    const message = String(formData.get("message") ?? "").trim()
    const hp = String(formData.get("company_website") ?? "").trim()

    if (!name || !phone || !email || !subject || !message) {
      setError("Please complete all required fields.")
      return
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (!validatePhone(phone)) {
      setError("Please enter a valid phone number (10–15 digits).")
      return
    }
    if (message.length < 10) {
      setError("Please add a bit more detail in your message (at least 10 characters).")
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
      product: subject,
      interest: subject,
    })

    try {
      const attribution = getPersistedAttribution()
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          subject,
          message,
          type: "contact",
          attribution,
          form_page_url: window.location.href,
          form_page_path: window.location.pathname,
          company_website: String(formData.get("company_website") ?? "").trim(),
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(errText || `Request failed (${res.status})`)
      }

      setContactLeadContext({
        product: subject,
        interest: subject,
        lead_type: "contact_form",
        form_page_url: window.location.href,
      })

      pushDataLayer({
        event: "contact_form_success",
        lead_type: "contact_form",
        product: subject,
      })

      form.reset()
      router.push("/thank-you")
    } catch {
      setError("We could not send your inquiry. Please try again or call us directly.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id={id} className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block mb-6 rounded-full bg-green-100 px-4 py-2 text-lg font-medium text-green-800">
            Get In Touch
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Contact Us</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Ready to transform your work? Get in touch with our experts today!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-8">Contact Information</h3>
            <div className="space-y-6">
              <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="text-green-600" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Phone</div>
                  <div className="text-gray-600">
                    <a
                      href="tel:+917827229116"
                      className="underline hover:text-green-600"
                      data-gtm-location="contact_section"
                    >
                      +91 7827229116
                    </a>
                  </div>
                  <div className="text-gray-600">
                    <a
                      href="tel:+918178567520"
                      className="underline hover:text-green-600"
                      data-gtm-location="contact_section"
                    >
                      +91 8178567520
                    </a>
                  </div>
                  <div className="text-sm text-gray-500">Mon-Sat: 9:00 AM - 6:00 PM</div>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="text-green-600" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Business Email</div>
                  <div className="text-gray-600">
                    <a
                      href="mailto:100xcircle@gmail.com"
                      className="underline hover:text-green-600 break-all"
                      data-gtm-location="contact_section"
                    >
                      100xcircle@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="text-green-600" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Address</div>
                  <div className="text-gray-600">UG, 398, Sector 7, Industrial Model Township, Gurugram, Haryana</div>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8 md:p-10">
              <h3 className="text-3xl font-bold text-gray-800 mb-6">Send us a message</h3>

              <div className="mb-8 flex items-start gap-3 rounded-xl border border-green-100 bg-green-50/80 px-4 py-3 text-left text-base text-green-900">
                <Shield className="mt-0.5 h-6 w-6 shrink-0 text-green-600" aria-hidden />
                <p className="leading-snug">
                  Your details are used only to respond to this inquiry. We typically reply within one business day.
                </p>
              </div>

              <form id="contact-inquiry-form" onSubmit={handleContactSubmit} className="relative space-y-6 md:space-y-7 text-lg">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input name="firstName" placeholder="First name" required className="p-5 text-lg min-h-[52px]" />
                  <Input name="lastName" placeholder="Last name" required className="p-5 text-lg min-h-[52px]" />
                </div>
                <Input name="phone" type="tel" placeholder="Phone number" required className="p-5 text-lg min-h-[52px]" />
                <Input name="email" type="email" placeholder="Email address" required className="p-5 text-lg min-h-[52px]" />
                <select
                  name="subject"
                  className="w-full min-h-[52px] p-5 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select product interest
                  </option>
                  {products.map((product) => (
                    <option key={product._id || product.id || product.name} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                  <option value="general">General inquiry</option>
                  <option value="support">Technical support</option>
                  <option value="dealer">Dealer partnership</option>
                </select>
                <Textarea
                  name="message"
                  placeholder="Your message"
                  rows={6}
                  required
                  className="p-5 text-lg resize-y min-h-[140px]"
                />

                {error ? (
                  <p className="text-base text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-xl py-6 min-h-[56px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden />
                      Submitting…
                    </>
                  ) : (
                    "Submit inquiry"
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
