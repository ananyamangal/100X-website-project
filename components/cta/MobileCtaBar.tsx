"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { FileText, MessageCircle, Phone } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"
import { CTA_COPY } from "./cta-config"
import { useMobileCta } from "./MobileCtaContext"
import QuoteModal from "./QuoteModal"

const ADMIN_PREFIX = "/admin"
const CONTACT_PATH = "/contact-us"
const DEFAULT_ANCHOR = "contact-form"

// SSR-safe layout effect to keep the body padding spacer in sync with the
// actual rendered bar height (handles wrapped labels on tiny viewports).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

export default function MobileCtaBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { audience, productName, whatsappMessage, anchorFormId } = useMobileCta()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const isAdmin = pathname?.startsWith(ADMIN_PREFIX) ?? false
  const isContactPage = pathname === CONTACT_PATH

  const copy = CTA_COPY[audience]
  const message = whatsappMessage?.trim() || copy.whatsappPrefill

  const telHref = `tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(message)}`

  useIsoLayoutEffect(() => {
    if (isAdmin) {
      document.documentElement.style.removeProperty("--mobile-cta-bar-h")
      return
    }
    if (!barRef.current) return
    const setVar = () => {
      const h = barRef.current?.offsetHeight ?? 64
      document.documentElement.style.setProperty("--mobile-cta-bar-h", `${h}px`)
    }
    setVar()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(setVar) : null
    ro?.observe(barRef.current)
    return () => {
      ro?.disconnect()
    }
  }, [isAdmin, audience, productName])

  const handleQuoteClick = useCallback(() => {
    if (isContactPage) {
      const id = anchorFormId || DEFAULT_ANCHOR
      const el = typeof document !== "undefined" ? document.getElementById(id) : null
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      router.push(`/contact-us#${id}`)
      return
    }
    setQuoteOpen(true)
  }, [isContactPage, anchorFormId, router])

  if (isAdmin) return null

  return (
    <>
      <div
        ref={barRef}
        role="region"
        aria-label="Quick contact"
        data-gtm-location="sticky_mobile_bar"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-gray-950/98 backdrop-blur-md border-t border-white/8"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-3 gap-2 px-3 pt-2.5">
          <a
            href={telHref}
            aria-label={`Call ${BUSINESS.phonePrimary}`}
            data-gtm="cta_call"
            className="inline-flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-600 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            <Phone size={18} aria-hidden="true" />
            <span>{copy.call}</span>
          </a>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            data-gtm="cta_whatsapp"
            className="inline-flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] text-white font-600 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            <MessageCircle size={18} aria-hidden="true" />
            <span>{copy.whatsapp}</span>
          </a>

          <button
            type="button"
            onClick={handleQuoteClick}
            aria-haspopup={isContactPage ? undefined : "dialog"}
            aria-expanded={isContactPage ? undefined : quoteOpen}
            data-gtm="cta_quote"
            className="inline-flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/15 bg-white/6 text-white font-600 text-[11px] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            <FileText size={17} aria-hidden="true" className="shrink-0" />
            <span className={copy.quote.length > 12 ? "truncate text-[10px]" : "truncate text-[11px]"}>
              {copy.quote}
            </span>
          </button>
        </div>
      </div>

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        audience={audience}
        productName={productName}
      />
    </>
  )
}
