"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Download, MessageCircle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"
import { pushDataLayer, readBrochureLeadContext } from "@/lib/gtm"

type ProductLink = { _id: string; name: string; href: string }

export default function BrochureThankYouActions({
  relatedProducts,
}: {
  relatedProducts: ProductLink[]
}) {
  const [brochureUrl, setBrochureUrl] = useState<string | null>(null)
  const [productName, setProductName] = useState<string>("")

  useEffect(() => {
    const ctx = readBrochureLeadContext()
    if (ctx?.brochureUrl && typeof ctx.brochureUrl === "string") {
      setBrochureUrl(ctx.brochureUrl)
    }
    if (ctx?.productName && typeof ctx.productName === "string") {
      setProductName(ctx.productName)
    }
  }, [])

  const downloadAgain = useCallback(() => {
    if (!brochureUrl) return
    pushDataLayer({
      event: "brochure_download",
      conversion_step: "download_again",
      product: productName || undefined,
    })
    window.open(brochureUrl, "_blank", "noopener,noreferrer")
  }, [brochureUrl, productName])

  const waUrl = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    `Hi, I downloaded the brochure${productName ? ` for ${productName}` : ""} — please assist.`,
  )}`

  return (
    <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
      <Button
        type="button"
        size="lg"
        className="bg-brand-600 hover:bg-brand-700"
        disabled={!brochureUrl}
        onClick={downloadAgain}
      >
        <Download className="mr-2 h-5 w-5" aria-hidden />
        Download again
      </Button>
      <Button asChild size="lg" variant="secondary">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-gtm-location="brochure_thank_you"
        >
          <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
          Chat on WhatsApp
        </a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/contact-us">Contact us</Link>
      </Button>

      {relatedProducts.length > 0 && (
        <div className="mt-12 w-full border-t border-gray-100 pt-10">
          <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold text-gray-800">
            <Package className="h-5 w-5 text-brand-600" aria-hidden />
            Related products
          </h2>
          <ul className="mx-auto flex max-w-lg flex-col gap-2">
            {relatedProducts.slice(0, 6).map((p) => (
              <li key={p._id}>
                <Link
                  href={p.href}
                  className="block rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-center font-medium text-brand-700 hover:bg-brand-50"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-center">
            <Link href="/products" className="text-sm font-semibold text-brand-600 underline">
              View all products
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
