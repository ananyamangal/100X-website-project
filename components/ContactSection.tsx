"use client"

import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ProductOption = { _id?: string; id?: string; name: string }

const WHATSAPP_NUMBER = "917827229116"

export default function ContactSection({
  products,
  id = "contact",
}: {
  products: ProductOption[]
  id?: string
}) {
  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const firstName = String(formData.get("firstName") ?? "").trim()
    const lastName = String(formData.get("lastName") ?? "").trim()
    const name = `${firstName} ${lastName}`.trim()
    const phone = formData.get("phone")
    const email = formData.get("email")
    const subject = formData.get("subject")
    const message = formData.get("message")

    if (typeof window !== "undefined" && (window as any).gtag_report_conversion) {
      ;(window as any).gtag_report_conversion()
    }

    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, subject, message, type: "contact" }),
    })

    if (typeof window !== "undefined") {
      const w = window as Window & { dataLayer?: Record<string, unknown>[] }
      w.dataLayer = w.dataLayer || []
      w.dataLayer.push({
        event: "generate_lead",
        lead_type: "contact_form",
        interest: String(subject ?? ""),
      })
    }

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in 100x products, please help me out")}`,
      "_blank",
    )
  }

  return (
    <section id={id} className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <span className="inline-block mb-6 rounded-full bg-green-100 px-4 py-2 text-lg font-medium text-green-800">
            Get In Touch
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Contact Us</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready to transform your work? Get in touch with our experts today!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
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
                      onClick={() => {
                        if (typeof window !== "undefined" && (window as any).gtag) {
                          ;(window as any).gtag("event", "conversion", {
                            send_to: "AW-17730009010/0N2CCMvmudwbELLvqYZC",
                          })
                        }
                      }}
                    >
                      +91 7827229116
                    </a>
                  </div>
                  <div className="text-gray-600">
                    <a href="tel:+918178567520" className="underline hover:text-green-600">
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
                    <a href="mailto:100xcircle@gmail.com" className="underline hover:text-green-600">
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
            <CardContent className="p-10">
              <h3 className="text-3xl font-bold text-gray-800 mb-8">Send us a Message</h3>
              <form onSubmit={handleContactSubmit} className="space-y-7 text-lg">
                <div className="grid grid-cols-2 gap-5">
                  <Input name="firstName" placeholder="First Name" required className="p-5 text-lg" />
                  <Input name="lastName" placeholder="Last Name" required className="p-5 text-lg" />
                </div>
                <Input name="phone" type="tel" placeholder="Phone Number" required className="p-5 text-lg" />
                <Input name="email" type="email" placeholder="Email Address" required className="p-5 text-lg" />
                <select
                  name="subject"
                  className="w-full p-5 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Product Interest</option>
                  {products.map((product) => (
                    <option key={product._id || product.id || product.name} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="dealer">Dealer Partnership</option>
                </select>
                <Textarea name="message" placeholder="Your Message" rows={6} required className="p-5 text-lg resize-none" />
                <Button type="submit" size="lg" className="w-full bg-green-600 hover:bg-green-700 text-xl py-6">
                  Send Message via WhatsApp <MessageCircle className="ml-2" size={22} />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
