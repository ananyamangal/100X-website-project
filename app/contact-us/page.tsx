"use client"

import { useEffect, useState } from "react"
import ContactSection from "@/components/ContactSection"

type ProductOption = { _id?: string; id?: string; name: string }

export default function ContactUsPage() {
  const [products, setProducts] = useState<ProductOption[]>([])

  useEffect(() => {
    fetch("/api/admin/products")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setProducts(
          list.map((p: { _id?: string; id?: string; name?: string }) => ({
            _id: p._id,
            id: p.id,
            name: p.name || "Product",
          })),
        )
      })
      .catch(() => setProducts([]))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 py-8 text-center max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Contact Us</h1>
        <p className="text-lg text-gray-600">
          Reach out for product enquiries, dealer partnerships, or technical support. We will respond as soon as possible.
        </p>
      </div>
      <ContactSection products={products} id="contact-form" />
    </div>
  )
}
